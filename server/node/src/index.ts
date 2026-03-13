import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import {
  FindSmartMoneyWalletsRequest,
  GetPolymarketMarketsRequest,
  GetWalletPositionsRequest,
  PlaceOrderRequest,
  StartCopyTradingRequest,
  StopCopyTradingRequest,
  UpdateCopySettingsRequest,
} from "./models";
import { ensureCopyTasksTable } from "./db";
import { MarketService } from "./services/marketService";
import { SmartMoneyService } from "./services/smartMoneyService";
import { CopyTradeService } from "./services/copytradeService";
import { TradingService } from "./services/tradingService";
import { WalletManager } from "./trading/walletManager";
import { CopyTradeWorker } from "./workers/copytradeWorker";
import { requirePrivyAuth, PrivyAuthedRequest } from "./auth/privyAuth";
import { UserService } from "./services/userService";
import { PrivyDelegatedWallet, PrivyService } from "./services/privyService";

function loadEnvFiles(): void {
  const candidates = Array.from(
    new Set([
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "..", ".env"),
      path.resolve(__dirname, "..", ".env"),
      path.resolve(__dirname, "..", "..", ".env"),
    ])
  );
  const loaded: Array<{ file: string; count: number }> = [];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const result = dotenv.config({ path: file, override: false });
    if (!result.error) {
      loaded.push({
        file,
        count: Object.keys(result.parsed || {}).length,
      });
    }
  }
  if (!loaded.length) {
    console.warn("[env] no .env file loaded from candidate paths");
  } else {
    console.log(
      `[env] loaded: ${loaded
        .map((x) => `${x.file}(${x.count})`)
        .join(", ")}`
    );
  }
  console.log(
    `[env] PRIVY_APP_ID=${Boolean(process.env.PRIVY_APP_ID)} PRIVY_APP_SECRET=${Boolean(
      process.env.PRIVY_APP_SECRET
    )} POLYGON_RPC_URL=${Boolean(process.env.POLYGON_RPC_URL)}`
  );
}

loadEnvFiles();

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const started = Date.now();
  console.log(`[http] -> ${req.method} ${req.originalUrl}`);
  res.on("finish", () => {
    const ms = Date.now() - started;
    console.log(
      `[http] <- ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`
    );
  });
  next();
});

const PORT = process.env.PORT || 8001;

const marketService = new MarketService();
const smartMoneyService = new SmartMoneyService();
const copytradeService = new CopyTradeService();
const tradingService = new TradingService();
const userService = new UserService();
let privyService: PrivyService | null = null;
const getPrivyService = (): PrivyService => {
  if (!privyService) privyService = new PrivyService();
  return privyService;
};
const copytradeWorker = new CopyTradeWorker(
  copytradeService,
  smartMoneyService,
  marketService,
  tradingService,
  userService
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", backend: "node" });
});

// --------- Markets ---------

app.post("/api/v1/tools/get_polymarket_markets", async (req, res) => {
  try {
    const parsed = GetPolymarketMarketsRequest.parse(req.body ?? {});
    const { markets, total } = await marketService.listMarkets(parsed);
    res.json({
      markets,
      next_cursor: null,
      total,
    });
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/tools/get_market_price", async (req, res) => {
  try {
    const { market_id } = (req.body ?? {}) as { market_id?: string };
    if (!market_id) {
      return res
        .status(400)
        .json({ detail: "market_id is required" });
    }
    const price = await marketService.getMarketPrice(market_id);
    if (!price) {
      return res
        .status(404)
        .json({ detail: `market_id not found: ${market_id}` });
    }
    res.json(price);
  } catch (err: any) {
    res.status(500).json({ detail: String(err?.message || err) });
  }
});

// --------- Smart money ---------

app.post("/api/v1/tools/find_smart_money_wallets", async (req, res) => {
  try {
    const parsed = FindSmartMoneyWalletsRequest.parse(req.body ?? {});
    const { wallets, total } = await smartMoneyService.findWallets(parsed);
    res.json({ wallets, total });
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/tools/get_wallet_positions", async (req, res) => {
  try {
    const parsed = GetWalletPositionsRequest.parse(req.body ?? {});
    const result = await smartMoneyService.getWalletPositions(parsed);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/tools/get_wallet_activity", async (req, res) => {
  try {
    const wallet = String(req.body?.wallet || "").trim();
    const limit = Math.min(500, Math.max(1, Number(req.body?.limit) || 200));
    const offset = Math.max(0, Number(req.body?.offset) || 0);
    if (!wallet || !wallet.startsWith("0x")) {
      return res.status(400).json({ detail: "wallet is required" });
    }
    const result = await smartMoneyService.getWalletActivity(wallet, limit, offset);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/tools/get_wallet_trades", async (req, res) => {
  try {
    const wallet = String(req.body?.wallet || "").trim();
    const limit = Math.min(500, Math.max(1, Number(req.body?.limit) || 200));
    const offset = Math.max(0, Number(req.body?.offset) || 0);
    if (!wallet || !wallet.startsWith("0x")) {
      return res.status(400).json({ detail: "wallet is required" });
    }
    const result = await smartMoneyService.getWalletTrades(wallet, limit, offset);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.get("/api/v1/tools/get_wallet_profile", async (req, res) => {
  try {
    const wallet = String(req.query.wallet || "").trim();
    if (!wallet || !wallet.startsWith("0x")) {
      return res.status(400).json({ detail: "wallet query param is required" });
    }
    const result = await smartMoneyService.getWalletProfile(wallet);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

// --------- Copy trading (Postgres) ---------

app.use("/api/v1/tools/start_copy_trading", requirePrivyAuth);
app.use("/api/v1/tools/get_copy_tasks", requirePrivyAuth);
app.use("/api/v1/tools/get_copy_task_detail", requirePrivyAuth);
app.use("/api/v1/tools/stop_copy_trading", requirePrivyAuth);
app.use("/api/v1/tools/update_copy_settings", requirePrivyAuth);
app.use("/api/v1/tools/get_copy_performance", requirePrivyAuth);
app.use("/api/v1/tools/get_trade_history", requirePrivyAuth);
app.use("/api/v1/users/sync_wallet", requirePrivyAuth);

app.post("/api/v1/tools/start_copy_trading", async (req, res) => {
  try {
    const authedReq = req as PrivyAuthedRequest;
    const userId = authedReq.auth?.userId;
    if (!userId) return res.status(401).json({ detail: "Unauthorized" });
    const parsed = StartCopyTradingRequest.parse(req.body ?? {});
    if (parsed.market_id && parsed.market_id !== "*") {
      const price = await marketService.getMarketPrice(parsed.market_id);
      if (!price) {
        return res
          .status(404)
          .json({ detail: `market_id not found: ${parsed.market_id}` });
      }
    }
    await userService.upsertPrivyUser(userId);
    const result = await copytradeService.startTask(userId, parsed);
    res.json(result);
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (err?.name === "ZodError") {
      return res.status(400).json({ detail: msg });
    }
    res.status(500).json({ detail: msg });
  }
});

app.get("/api/v1/tools/get_copy_tasks", async (req, res) => {
  try {
    const authedReq = req as PrivyAuthedRequest;
    const user_id = authedReq.auth?.userId || null;
    if (!user_id) return res.status(401).json({ detail: "Unauthorized" });
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const { tasks, total } = await copytradeService.listTasks(user_id, limit);
    res.json({ tasks, total });
  } catch (err: any) {
    res.status(500).json({ detail: String(err?.message || err) });
  }
});

app.get("/api/v1/tools/get_copy_task_detail/:task_id", async (req, res) => {
  try {
    const authedReq = req as PrivyAuthedRequest;
    const userId = authedReq.auth?.userId;
    if (!userId) return res.status(401).json({ detail: "Unauthorized" });
    const task = await copytradeService.getTaskDetail(req.params.task_id);
    if (!task) {
      return res.status(404).json({ detail: `copy task not found: ${req.params.task_id}` });
    }
    if (task.user_id !== userId) {
      return res.status(403).json({ detail: "Forbidden: task does not belong to current user" });
    }
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/tools/stop_copy_trading", async (req, res) => {
  try {
    const authedReq = req as PrivyAuthedRequest;
    const userId = authedReq.auth?.userId;
    if (!userId) return res.status(401).json({ detail: "Unauthorized" });
    const parsed = StopCopyTradingRequest.parse(req.body ?? {});
    const task = await copytradeService.getTaskDetail(parsed.task_id);
    if (!task) {
      return res.status(404).json({ detail: `copy task not found: ${parsed.task_id}` });
    }
    if (task.user_id !== userId) {
      return res.status(403).json({ detail: "Forbidden: task does not belong to current user" });
    }
    const result = await copytradeService.stopTask(parsed.task_id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/tools/update_copy_settings", async (req, res) => {
  try {
    const authedReq = req as PrivyAuthedRequest;
    const userId = authedReq.auth?.userId;
    if (!userId) return res.status(401).json({ detail: "Unauthorized" });
    const parsed = UpdateCopySettingsRequest.parse(req.body ?? {});
    const task = await copytradeService.getTaskDetail(parsed.task_id);
    if (!task) {
      return res.status(404).json({ detail: `copy task not found: ${parsed.task_id}` });
    }
    if (task.user_id !== userId) {
      return res.status(403).json({ detail: "Forbidden: task does not belong to current user" });
    }
    const updated = await copytradeService.updateTaskSettings(parsed);
    res.json({ updated: true, task: updated });
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.get("/api/v1/tools/get_copy_performance", async (req, res) => {
  try {
    const authedReq = req as PrivyAuthedRequest;
    const userId = authedReq.auth?.userId;
    if (!userId) return res.status(401).json({ detail: "Unauthorized" });
    const task_id = String(req.query.task_id || "").trim();
    if (!task_id) {
      return res.status(400).json({ detail: "task_id is required" });
    }
    const perf = await copytradeService.getCopyPerformance(task_id);
    if (!perf) {
      return res.status(404).json({ detail: `copy task not found: ${task_id}` });
    }
    const task = await copytradeService.getTaskDetail(task_id);
    if (!task || task.user_id !== userId) {
      return res.status(403).json({ detail: "Forbidden: task does not belong to current user" });
    }
    res.json(perf);
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.get("/api/v1/tools/get_trade_history", async (req, res) => {
  try {
    const authedReq = req as PrivyAuthedRequest;
    const user_id = authedReq.auth?.userId;
    if (!user_id) return res.status(401).json({ detail: "Unauthorized" });
    const task_id = String(req.query.task_id || "").trim() || undefined;
    if (task_id) {
      const task = await copytradeService.getTaskDetail(task_id);
      if (!task || task.user_id !== user_id) {
        return res.status(403).json({ detail: "Forbidden: task does not belong to current user" });
      }
    }
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    const data = await copytradeService.getTradeHistory({ user_id, task_id, limit });
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/users/sync_wallet", async (req, res) => {
  try {
    const authedReq = req as PrivyAuthedRequest;
    const userId = authedReq.auth?.userId;
    if (!userId) return res.status(401).json({ detail: "Unauthorized" });
    const wallet_address = String(req.body?.wallet_address || "").trim();
    if (!wallet_address.startsWith("0x")) {
      return res.status(400).json({ detail: "wallet_address is required" });
    }
    console.log(
      `[sync_wallet] user=${userId} wallet=${wallet_address.toLowerCase()} sync delegated wallet`
    );
    let delegatedWallets: PrivyDelegatedWallet[] = [];
    let matched: PrivyDelegatedWallet | null = null;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      delegatedWallets = await getPrivyService().getDelegatedWalletsByUserId(userId);
      matched = delegatedWallets.find(
        (w) =>
          w.chainType.toLowerCase() === "ethereum" &&
          w.address.toLowerCase() === wallet_address.toLowerCase()
      ) || null;
      if (matched) break;
      if (attempt < 6) {
        console.log(
          `[sync_wallet] delegated wallet not ready yet for user=${userId}; attempt=${attempt} count=${delegatedWallets.length}`
        );
        await sleep(1000);
      }
    }
    if (!matched) {
      console.warn(
        `[sync_wallet] wallet snapshot: ${JSON.stringify(
          delegatedWallets.map((w) => ({
            id: w.id,
            address: w.address,
            chainType: w.chainType,
          }))
        )}`
      );
      console.warn(
        `[sync_wallet] delegated wallet not found for user=${userId}; delegated_wallet_count=${delegatedWallets.length}`
      );
      return res.status(400).json({
        detail:
          "Delegated wallet not found. Please ensure addSigners completed and the wallet is delegated in Privy.",
      });
    }
    await userService.upsertPrivyDelegatedWallet({
      userId,
      walletAddress: wallet_address,
      privyWalletId: matched.id,
      authorizationKey: null,
      authorizationExpiresAt: null,
    });
    const user = await userService.getUserById(userId);
    console.log(
      `[sync_wallet] ok user=${userId} delegated_wallet_found=${Boolean(
        matched
      )} wallet_id=${matched.id}`
    );
    res.json({
      ok: true,
      user,
      delegated_wallet_found: Boolean(matched),
      wallet_id: matched.id,
    });
  } catch (err: any) {
    console.error(
      `[sync_wallet] failed: ${String(err?.message || err)}`
    );
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

// --------- Wallet & trading ---------

app.get("/api/v1/tools/get_wallet_status", async (_req, res) => {
  try {
    const wm = new WalletManager();
    if (!wm.isUnlocked) {
      return res.status(400).json({ detail: "TRADING_PRIVATE_KEY not set" });
    }
    const bal = await wm.getBalances();
    const approved = await wm.checkApprovals();
    res.json({
      address: wm.address || "",
      pol: bal.pol,
      usdc_e: bal.usdc_e,
      approved,
    });
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/tools/wallet_approve", async (_req, res) => {
  try {
    const wm = new WalletManager();
    if (!wm.isUnlocked) {
      return res.status(400).json({ detail: "TRADING_PRIVATE_KEY not set" });
    }
    const txHashes = await wm.setApprovals();
    res.json({ success: true, tx_hashes: txHashes });
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.post("/api/v1/tools/place_order", async (req, res) => {
  try {
    const parsed = PlaceOrderRequest.parse(req.body ?? {});
    const result = await tradingService.buyPosition(
      parsed.market_id,
      parsed.side,
      parsed.amount_usd,
      { skipSell: parsed.skip_sell }
    );
    res.json({
      success: result.success,
      split_tx_hash: result.split_tx_hash,
      order_id: result.order_id,
      side: result.side,
      amount_usd: result.amount_usd,
      message: result.message,
    });
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.get("/api/v1/tools/get_user_positions", async (req, res) => {
  try {
    let wallet = String(req.query.wallet || "").trim();
    if (!wallet) {
      const wm = new WalletManager();
      if (!wm.isUnlocked || !wm.address) {
        return res.status(400).json({ detail: "wallet query or TRADING_PRIVATE_KEY is required" });
      }
      wallet = wm.address;
    }
    const parsed = GetWalletPositionsRequest.parse({
      wallet,
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
      size_threshold: Number(req.query.size_threshold) || 0,
      sort_by: String(req.query.sort_by || "TOKENS"),
      sort_direction: String(req.query.sort_direction || "DESC"),
    });
    const result = await smartMoneyService.getWalletPositions(parsed);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ detail: String(err?.message || err) });
  }
});

app.listen(PORT, async () => {
  try {
    await ensureCopyTasksTable();
    console.log("copy_tasks table ready");
  } catch (e) {
    console.warn("DB init warning:", (e as Error).message);
  }
  copytradeWorker.start();
  console.log(`Node backend listening on http://127.0.0.1:${PORT}`);
});

