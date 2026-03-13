import { CopyTaskItem } from "../models";
import { CopyTradeService } from "../services/copytradeService";
import { MarketService } from "../services/marketService";
import { SmartMoneyService } from "../services/smartMoneyService";
import { TradingService } from "../services/tradingService";
import { UserService } from "../services/userService";

function utcDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function sideFromPosition(pos: { outcome: string; outcome_index: number }): "YES" | "NO" | null {
  const outcome = String(pos.outcome || "").trim().toUpperCase();
  if (outcome.includes("YES")) return "YES";
  if (outcome.includes("NO")) return "NO";
  if (Number(pos.outcome_index) === 0) return "YES";
  if (Number(pos.outcome_index) === 1) return "NO";
  return null;
}

interface SourcePositionLike {
  condition_id: string;
  outcome: string;
  outcome_index: number;
  size: number;
  title?: string;
  cur_price?: number | null;
  current_value?: number;
}

function snapshotKey(pos: SourcePositionLike, side: "YES" | "NO"): string {
  return `${String(pos.condition_id)}:${side}`;
}

export class CopyTradeWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly copytrade: CopyTradeService,
    private readonly smartMoney: SmartMoneyService,
    private readonly marketService: MarketService,
    private readonly tradingService: TradingService,
    private readonly userService: UserService,
    private readonly pollMs: number = Number(process.env.COPYTRADE_POLL_MS || 15000)
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, Math.max(5000, this.pollMs));
    void this.tick();
    console.log(`[copytrade-worker] started, poll=${Math.max(5000, this.pollMs)}ms`);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    console.log("[copytrade-worker] stopped");
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const tasks = await this.copytrade.listRunningTasks(300);
      for (const task of tasks) {
        try {
          await this.processTask(task);
        } catch (err: unknown) {
          console.warn(
            `[copytrade-worker] task ${task.task_id} failed:`,
            err instanceof Error ? err.message : String(err)
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async processTask(task: CopyTaskItem): Promise<void> {
    const source = await this.smartMoney.getWalletPositions({
      wallet: task.source_wallet,
      limit: 200,
      offset: 0,
      size_threshold: 0,
      sort_by: "TOKENS",
      sort_direction: "DESC",
    });

    const mode = String(task.market_id || "") === "*" ? "wallet" : "market";
    if (mode === "wallet") {
      await this.processWalletWideTask(task, source.positions as SourcePositionLike[]);
      return;
    }

    const side = String(task.side).toUpperCase() as "YES" | "NO";
    if (side !== "YES" && side !== "NO") return;

    const tradeMarket = await this.marketService.getMarketForTrade(task.market_id);
    if (!tradeMarket) return;

    const sourceSize = source.positions
      .filter((p: SourcePositionLike) => p.condition_id === tradeMarket.condition_id)
      .filter((p: SourcePositionLike) => sideFromPosition(p) === side)
      .reduce((sum: number, p: SourcePositionLike) => sum + Number(p.size || 0), 0);

    const runtime = await this.copytrade.getRuntimeState(task.task_id);
    let spentToday = Number(runtime.spent_today_usd || 0);
    const today = utcDayKey();
    if (runtime.day_key !== today) spentToday = 0;

    const deltaSize = sourceSize - Number(runtime.last_source_size || 0);
    if (deltaSize <= 0) {
      await this.copytrade.upsertRuntimeState(task.task_id, {
        last_source_size: sourceSize,
        spent_today_usd: spentToday,
        day_key: today,
      });
      return;
    }

    const price = await this.marketService.getMarketPrice(task.market_id);
    if (!price) return;
    const sidePrice = side === "YES" ? price.yes_price : price.no_price;

    const estimatedNotional = deltaSize * sidePrice * Number(task.copy_ratio || 1);
    const desiredUsd = Math.min(
      Number(task.max_per_trade_usd),
      Math.max(Number(task.min_trade_size_usd), estimatedNotional)
    );

    const remainingBudget = Math.max(0, Number(task.daily_risk_budget_usd) - spentToday);
    const amountUsd = Math.min(desiredUsd, remainingBudget);
    if (amountUsd < Number(task.min_trade_size_usd)) {
      await this.copytrade.recordExecution({
        task_id: task.task_id,
        user_id: task.user_id,
        source_wallet: task.source_wallet,
        market_id: task.market_id,
        side,
        amount_usd: 0,
        source_delta_size: deltaSize,
        status: "skipped",
        mode: task.dry_run ? "dry_run" : "live",
        message: "below min trade size or budget exhausted",
      });
      await this.copytrade.upsertRuntimeState(task.task_id, {
        last_source_size: sourceSize,
        spent_today_usd: spentToday,
        day_key: today,
      });
      return;
    }

    if (task.dry_run) {
      await this.copytrade.recordExecution({
        task_id: task.task_id,
        user_id: task.user_id,
        source_wallet: task.source_wallet,
        market_id: task.market_id,
        side,
        amount_usd: amountUsd,
        source_delta_size: deltaSize,
        status: "simulated",
        mode: "dry_run",
        message: "dry_run simulated execution",
      });
      spentToday += amountUsd;
      await this.copytrade.upsertRuntimeState(task.task_id, {
        last_source_size: sourceSize,
        spent_today_usd: spentToday,
        day_key: today,
      });
      return;
    }

    const executionWallet = await this.userService.getPrimaryExecutionWallet(task.user_id);
    if (!executionWallet || !executionWallet.wallet_address || !executionWallet.privy_wallet_id) {
      await this.copytrade.recordExecution({
        task_id: task.task_id,
        user_id: task.user_id,
        source_wallet: task.source_wallet,
        market_id: task.market_id,
        side,
        amount_usd: amountUsd,
        source_delta_size: deltaSize,
        status: "failed",
        mode: "live",
        message: "missing delegated wallet signer, please login and authorize server access",
      });
      return;
    }

    const result = await this.tradingService.buyPositionWithPrivyWallet({
      walletAddress: executionWallet.wallet_address,
      walletId: executionWallet.privy_wallet_id,
      marketId: task.market_id,
      side,
      amountUsd,
    });
    const submitted = Boolean(result.success);
    await this.copytrade.recordExecution({
      task_id: task.task_id,
      user_id: task.user_id,
      source_wallet: task.source_wallet,
      market_id: task.market_id,
      side,
      amount_usd: amountUsd,
      source_delta_size: deltaSize,
      status: submitted ? "submitted" : "failed",
      mode: "live",
      order_id: result.order_id ?? null,
      split_tx_hash: result.split_tx_hash ?? null,
      message: result.message ?? null,
    });

    if (submitted) {
      spentToday += amountUsd;
    }
    await this.copytrade.upsertRuntimeState(task.task_id, {
      last_source_size: sourceSize,
      spent_today_usd: spentToday,
      day_key: today,
    });
  }

  private async processWalletWideTask(
    task: CopyTaskItem,
    positions: SourcePositionLike[]
  ): Promise<void> {
    const runtime = await this.copytrade.getRuntimeState(task.task_id);
    let spentToday = Number(runtime.spent_today_usd || 0);
    const today = utcDayKey();
    if (runtime.day_key !== today) spentToday = 0;

    let previousSnapshot: Record<string, number> = {};
    if (runtime.last_source_snapshot_json) {
      try {
        previousSnapshot = JSON.parse(runtime.last_source_snapshot_json);
      } catch {
        previousSnapshot = {};
      }
    }

    const nextSnapshot: Record<string, number> = {};

    for (const pos of positions) {
      const derivedSide = sideFromPosition(pos);
      if (!derivedSide) continue;
      const key = snapshotKey(pos, derivedSide);
      const currentSize = Number(pos.size || 0);
      nextSnapshot[key] = currentSize;
      const deltaSize = currentSize - Number(previousSnapshot[key] || 0);
      if (deltaSize <= 0) continue;

      const priceGuess =
        pos.cur_price != null
          ? Number(pos.cur_price)
          : currentSize > 0
            ? Number(pos.current_value || 0) / currentSize
            : 0.5;
      const boundedPrice = Math.min(0.99, Math.max(0.01, priceGuess || 0.5));
      const estimatedNotional = deltaSize * boundedPrice * Number(task.copy_ratio || 1);
      const desiredUsd = Math.min(
        Number(task.max_per_trade_usd),
        Math.max(Number(task.min_trade_size_usd), estimatedNotional)
      );
      const remainingBudget = Math.max(0, Number(task.daily_risk_budget_usd) - spentToday);
      const amountUsd = Math.min(desiredUsd, remainingBudget);
      const marketId = String(pos.condition_id);
      const execMessageBase = pos.title ? `wallet-wide follow: ${pos.title}` : "wallet-wide follow";

      if (amountUsd < Number(task.min_trade_size_usd)) {
        await this.copytrade.recordExecution({
          task_id: task.task_id,
          user_id: task.user_id,
          source_wallet: task.source_wallet,
          market_id: marketId,
          side: derivedSide,
          amount_usd: 0,
          source_delta_size: deltaSize,
          status: "skipped",
          mode: task.dry_run ? "dry_run" : "live",
          message: `${execMessageBase}; below min trade size or budget exhausted`,
        });
        continue;
      }

      if (task.dry_run) {
        await this.copytrade.recordExecution({
          task_id: task.task_id,
          user_id: task.user_id,
          source_wallet: task.source_wallet,
          market_id: marketId,
          side: derivedSide,
          amount_usd: amountUsd,
          source_delta_size: deltaSize,
          status: "simulated",
          mode: "dry_run",
          message: `${execMessageBase}; dry_run simulated execution`,
        });
        spentToday += amountUsd;
        continue;
      }

      const executionWallet = await this.userService.getPrimaryExecutionWallet(task.user_id);
      if (!executionWallet || !executionWallet.wallet_address || !executionWallet.privy_wallet_id) {
        await this.copytrade.recordExecution({
          task_id: task.task_id,
          user_id: task.user_id,
          source_wallet: task.source_wallet,
          market_id: marketId,
          side: derivedSide,
          amount_usd: amountUsd,
          source_delta_size: deltaSize,
          status: "failed",
          mode: "live",
          message: `${execMessageBase}; missing delegated wallet signer`,
        });
        continue;
      }

      try {
        const result = await this.tradingService.buyPositionWithPrivyWallet({
          walletAddress: executionWallet.wallet_address,
          walletId: executionWallet.privy_wallet_id,
          marketId,
          side: derivedSide,
          amountUsd,
        });
        const submitted = Boolean(result.success);
        await this.copytrade.recordExecution({
          task_id: task.task_id,
          user_id: task.user_id,
          source_wallet: task.source_wallet,
          market_id: marketId,
          side: derivedSide,
          amount_usd: amountUsd,
          source_delta_size: deltaSize,
          status: submitted ? "submitted" : "failed",
          mode: "live",
          order_id: result.order_id ?? null,
          split_tx_hash: result.split_tx_hash ?? null,
          message: result.message ?? `${execMessageBase}; live wallet-wide follow`,
        });
        if (submitted) {
          spentToday += amountUsd;
        }
      } catch (err) {
        await this.copytrade.recordExecution({
          task_id: task.task_id,
          user_id: task.user_id,
          source_wallet: task.source_wallet,
          market_id: marketId,
          side: derivedSide,
          amount_usd: amountUsd,
          source_delta_size: deltaSize,
          status: "failed",
          mode: "live",
          message: `${execMessageBase}; ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    await this.copytrade.upsertRuntimeState(task.task_id, {
      last_source_size: Object.values(nextSnapshot).reduce((sum, value) => sum + Number(value || 0), 0),
      last_source_snapshot_json: JSON.stringify(nextSnapshot),
      spent_today_usd: spentToday,
      day_key: today,
    });
  }
}

