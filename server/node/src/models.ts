import { z } from "zod";

// ----------- Enums & basic types -----------

export const SideEnum = z.enum(["YES", "NO"]);
export type SideEnum = z.infer<typeof SideEnum>;

export const CopyTaskStatus = z.enum(["running", "paused", "stopped"]);
export type CopyTaskStatus = z.infer<typeof CopyTaskStatus>;

// ----------- Market models -----------

export const MarketItem = z.object({
  market_id: z.string(),
  question: z.string(),
  slug: z.string(),
  polymarket_url: z.string(),
  category: z.string(),
  yes_price: z.number(),
  no_price: z.number(),
  volume: z.number(),
  liquidity: z.number(),
  active: z.boolean(),
});
export type MarketItem = z.infer<typeof MarketItem>;

export const GetPolymarketMarketsRequest = z.object({
  search_query: z.string().optional(),
  active_only: z.boolean().default(true),
  category: z.string().optional(),
  min_volume_usd: z.number().default(0),
  min_liquidity_usd: z.number().default(0),
  limit: z.number().int().default(20),
  cursor: z.string().optional(),
});
export type GetPolymarketMarketsRequest = z.infer<typeof GetPolymarketMarketsRequest>;

export const GetPolymarketMarketsResponse = z.object({
  markets: z.array(MarketItem),
  next_cursor: z.string().nullable().optional(),
  total: z.number().int(),
});
export type GetPolymarketMarketsResponse = z.infer<typeof GetPolymarketMarketsResponse>;

export const GetMarketPriceRequest = z.object({
  market_id: z.string(),
});
export type GetMarketPriceRequest = z.infer<typeof GetMarketPriceRequest>;

export const MarketPriceResponse = z.object({
  market_id: z.string(),
  yes_price: z.number(),
  no_price: z.number(),
  implied_prob: z.number(),
  last_trade: z.string(), // ISO string
});
export type MarketPriceResponse = z.infer<typeof MarketPriceResponse>;

// ----------- Smart money models -----------

export const SmartMoneyWallet = z.object({
  wallet: z.string(),
  user_name: z.string().nullable().optional(),
  profile_image: z.string().nullable().optional(),
  win_rate: z.number(),
  roi: z.number(),
  pnl_usd: z.number(),
  volume_usd: z.number().default(0),
  trades_7d: z.number().int(),
  category: z.string(),
  rank_score: z.number(),
});
export type SmartMoneyWallet = z.infer<typeof SmartMoneyWallet>;

export const FindSmartMoneyWalletsRequest = z.object({
  min_win_rate: z.number().default(0.6),
  min_roi: z.number().default(0.2),
  min_trades_7d: z.number().int().default(5),
  category: z.string().optional(),
  time_period: z.string().optional(),
  order_by: z.string().optional(),
  limit: z.number().int().default(20),
});
export type FindSmartMoneyWalletsRequest = z.infer<typeof FindSmartMoneyWalletsRequest>;

export const FindSmartMoneyWalletsResponse = z.object({
  wallets: z.array(SmartMoneyWallet),
  total: z.number().int(),
});
export type FindSmartMoneyWalletsResponse = z.infer<typeof FindSmartMoneyWalletsResponse>;

// ----------- Positions -----------

export const WalletPosition = z.object({
  condition_id: z.string(),
  title: z.string(),
  outcome: z.string(),
  outcome_index: z.number().int(),
  size: z.number(),
  avg_price: z.number(),
  current_value: z.number(),
  cash_pnl: z.number(),
  percent_pnl: z.number().nullable().optional(),
  cur_price: z.number().nullable().optional(),
  slug: z.string().nullable().optional(),
  event_slug: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  redeemable: z.boolean().default(false),
  mergeable: z.boolean().default(false),
});
export type WalletPosition = z.infer<typeof WalletPosition>;

export const GetWalletPositionsRequest = z.object({
  wallet: z.string(),
  limit: z.number().int().default(100),
  offset: z.number().int().default(0),
  size_threshold: z.number().default(0),
  sort_by: z.string().default("TOKENS"),
  sort_direction: z.string().default("DESC"),
});
export type GetWalletPositionsRequest = z.infer<typeof GetWalletPositionsRequest>;

export const GetWalletPositionsResponse = z.object({
  wallet: z.string(),
  positions: z.array(WalletPosition),
  total: z.number().int(),
});
export type GetWalletPositionsResponse = z.infer<typeof GetWalletPositionsResponse>;

// ----------- Copy trading -----------

export const StartCopyTradingRequest = z.object({
  source_wallet: z.string(),
  market_id: z.string().optional().nullable(),
  side: z.enum(["YES", "NO", "AUTO"]).default("AUTO"),
  copy_ratio: z.number().min(0).max(5).default(1),
  max_per_trade_usd: z.number().positive().default(100),
  min_trade_size_usd: z.number().positive().default(5),
  slippage_max: z.number().min(0).max(0.2).default(0.03),
  daily_risk_budget_usd: z.number().positive().default(500),
  dry_run: z.boolean().default(true),
});
export type StartCopyTradingRequest = z.infer<typeof StartCopyTradingRequest>;

export const StartCopyTradingResponse = z.object({
  task_id: z.string(),
  status: CopyTaskStatus,
  accepted: z.boolean(),
  reason: z.string().nullable().optional(),
  created_at: z.string(),
});
export type StartCopyTradingResponse = z.infer<typeof StartCopyTradingResponse>;

export const CopyTaskItem = z.object({
  task_id: z.string(),
  user_id: z.string(),
  source_wallet: z.string(),
  market_id: z.string(),
  side: z.string(),
  status: z.string(),
  accepted: z.boolean(),
  reason: z.string().nullable().optional(),
  copy_ratio: z.number(),
  max_per_trade_usd: z.number(),
  min_trade_size_usd: z.number(),
  slippage_max: z.number(),
  daily_risk_budget_usd: z.number(),
  dry_run: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CopyTaskItem = z.infer<typeof CopyTaskItem>;

export const GetCopyTasksResponse = z.object({
  tasks: z.array(CopyTaskItem),
  total: z.number().int(),
});
export type GetCopyTasksResponse = z.infer<typeof GetCopyTasksResponse>;

export const StopCopyTradingRequest = z.object({
  task_id: z.string(),
});
export type StopCopyTradingRequest = z.infer<typeof StopCopyTradingRequest>;

export const StopCopyTradingResponse = z.object({
  task_id: z.string(),
  status: CopyTaskStatus,
  stopped: z.boolean(),
  reason: z.string().nullable().optional(),
  updated_at: z.string(),
});
export type StopCopyTradingResponse = z.infer<typeof StopCopyTradingResponse>;

export const UpdateCopySettingsRequest = z
  .object({
    task_id: z.string(),
    copy_ratio: z.number().min(0).max(5).optional(),
    max_per_trade_usd: z.number().positive().optional(),
    min_trade_size_usd: z.number().positive().optional(),
    slippage_max: z.number().min(0).max(0.2).optional(),
    daily_risk_budget_usd: z.number().positive().optional(),
    status: z.enum(["running", "paused"]).optional(),
    dry_run: z.boolean().optional(),
  })
  .refine(
    (data: {
      copy_ratio?: number;
      max_per_trade_usd?: number;
      min_trade_size_usd?: number;
      slippage_max?: number;
      daily_risk_budget_usd?: number;
      status?: "running" | "paused";
      dry_run?: boolean;
    }) =>
      data.copy_ratio !== undefined ||
      data.max_per_trade_usd !== undefined ||
      data.min_trade_size_usd !== undefined ||
      data.slippage_max !== undefined ||
      data.daily_risk_budget_usd !== undefined ||
      data.status !== undefined ||
      data.dry_run !== undefined,
    {
      message: "at least one field to update is required",
    }
  );
export type UpdateCopySettingsRequest = z.infer<typeof UpdateCopySettingsRequest>;

export const UpdateCopySettingsResponse = z.object({
  updated: z.boolean(),
  task: CopyTaskItem.nullable().optional(),
  reason: z.string().nullable().optional(),
});
export type UpdateCopySettingsResponse = z.infer<typeof UpdateCopySettingsResponse>;

export const CopyExecutionItem = z.object({
  exec_id: z.string(),
  task_id: z.string(),
  user_id: z.string(),
  source_wallet: z.string(),
  market_id: z.string(),
  side: SideEnum,
  amount_usd: z.number(),
  source_delta_size: z.number(),
  status: z.enum(["simulated", "submitted", "failed", "skipped"]),
  mode: z.enum(["dry_run", "live"]),
  order_id: z.string().nullable().optional(),
  split_tx_hash: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  created_at: z.string(),
});
export type CopyExecutionItem = z.infer<typeof CopyExecutionItem>;

export const GetTradeHistoryResponse = z.object({
  trades: z.array(CopyExecutionItem),
  total: z.number().int(),
});
export type GetTradeHistoryResponse = z.infer<typeof GetTradeHistoryResponse>;

export const GetCopyPerformanceResponse = z.object({
  task_id: z.string(),
  total_trades: z.number().int(),
  success_trades: z.number().int(),
  failed_trades: z.number().int(),
  skipped_trades: z.number().int(),
  total_amount_usd: z.number(),
  success_rate: z.number(),
  mode: z.enum(["dry_run", "live"]).nullable().optional(),
  last_execution_at: z.string().nullable().optional(),
});
export type GetCopyPerformanceResponse = z.infer<typeof GetCopyPerformanceResponse>;

// ----------- Trading (wallet / place order) -----------

export const WalletStatusResponse = z.object({
  address: z.string(),
  pol: z.number(),
  usdc_e: z.number(),
  approved: z.boolean().nullable().optional(),
});
export type WalletStatusResponse = z.infer<typeof WalletStatusResponse>;

export const WalletApproveResponse = z.object({
  success: z.boolean(),
  tx_hashes: z.array(z.string()),
  message: z.string().nullable().optional(),
});
export type WalletApproveResponse = z.infer<typeof WalletApproveResponse>;

export const PlaceOrderRequest = z.object({
  market_id: z.string(),
  side: z.enum(["YES", "NO"]),
  amount_usd: z.number().positive().max(10000),
  skip_sell: z.boolean().default(false),
});
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequest>;

export const PlaceOrderResponse = z.object({
  success: z.boolean(),
  split_tx_hash: z.string().nullable().optional(),
  order_id: z.string().nullable().optional(),
  side: z.string(),
  amount_usd: z.number(),
  message: z.string().nullable().optional(),
});
export type PlaceOrderResponse = z.infer<typeof PlaceOrderResponse>;

