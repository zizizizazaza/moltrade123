import { Pool } from "pg";
import { randomBytes } from "crypto";
import {
  CopyExecutionItem,
  CopyTaskItem,
  CopyTaskStatus,
  GetCopyPerformanceResponse,
  StartCopyTradingRequest,
  StartCopyTradingResponse,
  StopCopyTradingResponse,
  UpdateCopySettingsRequest,
} from "../models";
import { pool } from "../db";

function taskId(): string {
  return "ct_" + randomBytes(6).toString("hex");
}

function executionId(): string {
  return "ce_" + randomBytes(6).toString("hex");
}

function rowToItem(row: any): CopyTaskItem {
  return {
    task_id: row.task_id,
    user_id: row.user_id,
    source_wallet: row.source_wallet,
    market_id: row.market_id,
    side: row.side,
    status: row.status,
    accepted: row.accepted,
    reason: row.reason,
    copy_ratio: parseFloat(row.copy_ratio),
    max_per_trade_usd: parseFloat(row.max_per_trade_usd),
    min_trade_size_usd: parseFloat(row.min_trade_size_usd),
    slippage_max: parseFloat(row.slippage_max),
    daily_risk_budget_usd: parseFloat(row.daily_risk_budget_usd),
    dry_run: row.dry_run,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function rowToExecution(row: any): CopyExecutionItem {
  return {
    exec_id: String(row.exec_id),
    task_id: String(row.task_id),
    user_id: String(row.user_id),
    source_wallet: String(row.source_wallet),
    market_id: String(row.market_id),
    side: String(row.side).toUpperCase() as "YES" | "NO",
    amount_usd: Number(row.amount_usd ?? 0),
    source_delta_size: Number(row.source_delta_size ?? 0),
    status: String(row.status) as "simulated" | "submitted" | "failed" | "skipped",
    mode: String(row.mode) as "dry_run" | "live",
    order_id: row.order_id == null ? null : String(row.order_id),
    split_tx_hash: row.split_tx_hash == null ? null : String(row.split_tx_hash),
    message: row.message == null ? null : String(row.message),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

export interface CopyTaskRuntimeState {
  task_id: string;
  last_source_size: number;
  last_source_snapshot_json?: string | null;
  spent_today_usd: number;
  day_key: string;
}

export class CopyTradeService {
  constructor(private db: Pool = pool) {}

  async startTask(userId: string, req: StartCopyTradingRequest): Promise<StartCopyTradingResponse> {
    const side = typeof req.side === "string" ? req.side : (req.side as string);
    if (req.max_per_trade_usd < req.min_trade_size_usd) {
      return {
        task_id: "",
        status: "paused" as CopyTaskStatus,
        accepted: false,
        reason: "max_per_trade_usd must be >= min_trade_size_usd",
        created_at: new Date().toISOString(),
      };
    }

    const task_id = taskId();
    const status = req.dry_run ? ("running" as CopyTaskStatus) : ("paused" as CopyTaskStatus);
    const reason = req.dry_run ? "dry_run mock execution enabled" : "awaiting real executor";
    const created_at = new Date().toISOString();

    await this.db.query(
      `INSERT INTO copy_tasks (
        task_id, user_id, source_wallet, market_id, side, status, accepted, reason,
        copy_ratio, max_per_trade_usd, min_trade_size_usd, slippage_max, daily_risk_budget_usd, dry_run,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        task_id,
        userId,
        req.source_wallet,
        req.market_id || "*",
        side,
        status,
        true,
        reason,
        req.copy_ratio,
        req.max_per_trade_usd,
        req.min_trade_size_usd,
        req.slippage_max,
        req.daily_risk_budget_usd,
        req.dry_run,
        created_at,
        created_at,
      ]
    );
    await this.db.query(
      `INSERT INTO copy_task_runtime (task_id, last_source_size, last_source_snapshot_json, spent_today_usd, day_key, updated_at)
       VALUES ($1, 0, NULL, 0, CURRENT_DATE, NOW())
       ON CONFLICT (task_id) DO NOTHING`,
      [task_id]
    );

    return {
      task_id,
      status,
      accepted: true,
      reason,
      created_at,
    };
  }

  async listTasks(userId: string | null, limit: number): Promise<{ tasks: CopyTaskItem[]; total: number }> {
    const countResult = userId
      ? await this.db.query("SELECT COUNT(*)::int AS c FROM copy_tasks WHERE user_id = $1", [userId])
      : await this.db.query("SELECT COUNT(*)::int AS c FROM copy_tasks");
    const total = Number(countResult.rows[0]?.c ?? 0);

    const query = userId
      ? "SELECT * FROM copy_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2"
      : "SELECT * FROM copy_tasks ORDER BY created_at DESC LIMIT $1";
    const params = userId ? [userId, Math.max(1, limit)] : [Math.max(1, limit)];
    const result = await this.db.query(query, params);
    const tasks = result.rows.map(rowToItem);
    return { tasks, total };
  }

  async listRunningTasks(limit: number = 200): Promise<CopyTaskItem[]> {
    const result = await this.db.query(
      "SELECT * FROM copy_tasks WHERE status = 'running' ORDER BY updated_at DESC LIMIT $1",
      [Math.max(1, limit)]
    );
    return result.rows.map(rowToItem);
  }

  async getTaskDetail(taskId: string): Promise<CopyTaskItem | null> {
    const result = await this.db.query("SELECT * FROM copy_tasks WHERE task_id = $1", [taskId]);
    const row = result.rows[0];
    if (!row) return null;
    return rowToItem(row);
  }

  async stopTask(taskId: string): Promise<StopCopyTradingResponse | null> {
    const result = await this.db.query("SELECT * FROM copy_tasks WHERE task_id = $1", [taskId]);
    const row = result.rows[0];
    if (!row) return null;

    const updated_at = new Date().toISOString();
    await this.db.query(
      "UPDATE copy_tasks SET status = $1, reason = $2, updated_at = $3 WHERE task_id = $4",
      ["stopped", "stopped by user request", updated_at, taskId]
    );

    return {
      task_id: row.task_id,
      status: "stopped" as CopyTaskStatus,
      stopped: true,
      reason: "stopped by user request",
      updated_at,
    };
  }

  async updateTaskSettings(req: UpdateCopySettingsRequest): Promise<CopyTaskItem | null> {
    const existing = await this.getTaskDetail(req.task_id);
    if (!existing) return null;

    const nextCopyRatio = req.copy_ratio ?? existing.copy_ratio;
    const nextMax = req.max_per_trade_usd ?? existing.max_per_trade_usd;
    const nextMin = req.min_trade_size_usd ?? existing.min_trade_size_usd;
    const nextSlip = req.slippage_max ?? existing.slippage_max;
    const nextDaily = req.daily_risk_budget_usd ?? existing.daily_risk_budget_usd;
    const nextStatus = req.status ?? existing.status;
    const nextDryRun = req.dry_run ?? existing.dry_run;

    if (nextMax < nextMin) {
      throw new Error("max_per_trade_usd must be >= min_trade_size_usd");
    }

    const updatedAt = new Date().toISOString();
    await this.db.query(
      `UPDATE copy_tasks
       SET copy_ratio = $1,
           max_per_trade_usd = $2,
           min_trade_size_usd = $3,
           slippage_max = $4,
           daily_risk_budget_usd = $5,
           status = $6,
           dry_run = $7,
           reason = $8,
           updated_at = $9
       WHERE task_id = $10`,
      [
        nextCopyRatio,
        nextMax,
        nextMin,
        nextSlip,
        nextDaily,
        nextStatus,
        nextDryRun,
        nextDryRun ? "dry_run enabled" : existing.reason,
        updatedAt,
        req.task_id,
      ]
    );
    return this.getTaskDetail(req.task_id);
  }

  async getRuntimeState(taskId: string): Promise<CopyTaskRuntimeState> {
    const result = await this.db.query(
      `SELECT task_id, last_source_size, last_source_snapshot_json, spent_today_usd, day_key
       FROM copy_task_runtime
       WHERE task_id = $1`,
      [taskId]
    );
    const row = result.rows[0];
    if (!row) {
      await this.db.query(
        `INSERT INTO copy_task_runtime (task_id, last_source_size, last_source_snapshot_json, spent_today_usd, day_key, updated_at)
         VALUES ($1, 0, NULL, 0, CURRENT_DATE, NOW())
         ON CONFLICT (task_id) DO NOTHING`,
        [taskId]
      );
      return {
        task_id: taskId,
        last_source_size: 0,
        last_source_snapshot_json: null,
        spent_today_usd: 0,
        day_key: new Date().toISOString().slice(0, 10),
      };
    }
    return {
      task_id: String(row.task_id),
      last_source_size: Number(row.last_source_size ?? 0),
      last_source_snapshot_json:
        row.last_source_snapshot_json == null
          ? null
          : String(row.last_source_snapshot_json),
      spent_today_usd: Number(row.spent_today_usd ?? 0),
      day_key:
        row.day_key instanceof Date
          ? row.day_key.toISOString().slice(0, 10)
          : String(row.day_key),
    };
  }

  async upsertRuntimeState(
    taskId: string,
    state: Omit<CopyTaskRuntimeState, "task_id">
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO copy_task_runtime (task_id, last_source_size, last_source_snapshot_json, spent_today_usd, day_key, updated_at)
       VALUES ($1, $2, $3, $4, $5::date, NOW())
       ON CONFLICT (task_id) DO UPDATE
       SET last_source_size = EXCLUDED.last_source_size,
           last_source_snapshot_json = EXCLUDED.last_source_snapshot_json,
           spent_today_usd = EXCLUDED.spent_today_usd,
           day_key = EXCLUDED.day_key,
           updated_at = NOW()`,
      [
        taskId,
        state.last_source_size,
        state.last_source_snapshot_json ?? null,
        state.spent_today_usd,
        state.day_key,
      ]
    );
  }

  async recordExecution(input: {
    task_id: string;
    user_id: string;
    source_wallet: string;
    market_id: string;
    side: "YES" | "NO";
    amount_usd: number;
    source_delta_size: number;
    status: "simulated" | "submitted" | "failed" | "skipped";
    mode: "dry_run" | "live";
    order_id?: string | null;
    split_tx_hash?: string | null;
    message?: string | null;
  }): Promise<CopyExecutionItem> {
    const exec_id = executionId();
    const created_at = new Date().toISOString();
    await this.db.query(
      `INSERT INTO copy_executions (
        exec_id, task_id, user_id, source_wallet, market_id, side, amount_usd, source_delta_size,
        status, mode, order_id, split_tx_hash, message, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14
      )`,
      [
        exec_id,
        input.task_id,
        input.user_id,
        input.source_wallet,
        input.market_id,
        input.side,
        input.amount_usd,
        input.source_delta_size,
        input.status,
        input.mode,
        input.order_id ?? null,
        input.split_tx_hash ?? null,
        input.message ?? null,
        created_at,
      ]
    );
    return {
      exec_id,
      task_id: input.task_id,
      user_id: input.user_id,
      source_wallet: input.source_wallet,
      market_id: input.market_id,
      side: input.side,
      amount_usd: input.amount_usd,
      source_delta_size: input.source_delta_size,
      status: input.status,
      mode: input.mode,
      order_id: input.order_id ?? null,
      split_tx_hash: input.split_tx_hash ?? null,
      message: input.message ?? null,
      created_at,
    };
  }

  async getTradeHistory(
    options: { user_id?: string; task_id?: string; limit?: number } = {}
  ): Promise<{ trades: CopyExecutionItem[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    let idx = 1;
    if (options.user_id) {
      clauses.push(`user_id = $${idx++}`);
      params.push(options.user_id);
    }
    if (options.task_id) {
      clauses.push(`task_id = $${idx++}`);
      params.push(options.task_id);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const countSql = `SELECT COUNT(*)::int AS c FROM copy_executions ${where}`;
    const countRes = await this.db.query(countSql, params);
    const total = Number(countRes.rows[0]?.c ?? 0);

    const limit = Math.max(1, Math.min(500, Number(options.limit ?? 50)));
    const listSql = `SELECT * FROM copy_executions ${where} ORDER BY created_at DESC LIMIT $${idx}`;
    const listRes = await this.db.query(listSql, [...params, limit]);
    return { trades: listRes.rows.map(rowToExecution), total };
  }

  async getCopyPerformance(taskId: string): Promise<GetCopyPerformanceResponse | null> {
    const exists = await this.getTaskDetail(taskId);
    if (!exists) return null;
    const result = await this.db.query(
      `SELECT
         COUNT(*)::int AS total_trades,
         COUNT(*) FILTER (WHERE status IN ('submitted', 'simulated'))::int AS success_trades,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_trades,
         COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped_trades,
         COALESCE(SUM(amount_usd), 0)::float8 AS total_amount_usd,
         MAX(created_at) AS last_execution_at,
         MAX(mode) AS mode
       FROM copy_executions
       WHERE task_id = $1`,
      [taskId]
    );
    const row = result.rows[0] ?? {};
    const totalTrades = Number(row.total_trades ?? 0);
    const successTrades = Number(row.success_trades ?? 0);
    const failedTrades = Number(row.failed_trades ?? 0);
    const skippedTrades = Number(row.skipped_trades ?? 0);
    const successRate = totalTrades > 0 ? successTrades / totalTrades : 0;
    return {
      task_id: taskId,
      total_trades: totalTrades,
      success_trades: successTrades,
      failed_trades: failedTrades,
      skipped_trades: skippedTrades,
      total_amount_usd: Number(row.total_amount_usd ?? 0),
      success_rate: successRate,
      mode: row.mode ? (String(row.mode) as "dry_run" | "live") : null,
      last_execution_at: row.last_execution_at
        ? new Date(row.last_execution_at).toISOString()
        : null,
    };
  }
}
