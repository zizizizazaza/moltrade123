/**
 * API 
 * Base URL: http://localhost:8080
 */

// const API_BASE = 'http://localhost:8080';
const API_BASE = 'https://nftkashai.online/moltrade';

export interface LeaderboardItemRaw {
  bot_pubkey: string;
  name: string;
  eth_address: string;
  followers: number;
  buy_count: number;
  sell_count: number;
  volume: number;
  pnl_30d: number;
}

export interface LeaderboardResponse {
  data: LeaderboardItemRaw[];
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const res = await fetch(`${API_BASE}/api/leaderboard`);
  if (!res.ok) {
    throw new Error(`Leaderboard request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Agent detail GET /api/agents/<bot_pubkey_or_eth> ---

export interface AgentHoldingRaw {
  name?: string;
  symbol?: string;
  time?: string;
  unrealized?: number | string;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
  realized?: number | string;
  realized_pnl?: number;
  total?: number | string;
  total_pnl?: number;
  balance?: number | string;
  tokens?: number | string;
  trade_count?: number | string;
  img?: string;
  [key: string]: unknown;
}

export interface AgentTradeRaw {
  id?: number | string;
  type?: 'Buy' | 'Sell' | string;
  side?: 'long' | 'short' | string;
  name?: string;
  symbol?: string;
  time?: string;
  created_at?: string;
  price?: number | string;
  amount?: number | string;
  size?: number | string;
  total?: number | string;
  pnl?: number | string;
  pnl_usd?: number | string | null;
  pnl_pct?: number | string;
  status?: string;
  img?: string;
  [key: string]: unknown;
}

export interface AgentResponse {
  bot_pubkey: string;
  name: string;
  eth_address: string;
  realized_pnl_7d: number | null;
  total_pnl: number | null;
  unrealized_pnl: number | null;
  win_rate_7d: number | null;
  buy_count_7d: number;
  sell_count_7d: number;
  volume_7d: number;
  avg_duration_7d_secs: number | null;
  success_count_7d: number;
  failure_count_7d: number;
  token_count_7d: number;
  holdings: AgentHoldingRaw[];
  trades: AgentTradeRaw[];
}

export async function getAgent(botPubkeyOrEth: string): Promise<AgentResponse> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(botPubkeyOrEth)}`);
  if (!res.ok) {
    throw new Error(`Agent request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Dashboard Summary GET /api/dashboard/summary ---

export interface DashboardSummaryResponse {
  total_ai_agents: number;
  total_ai_agents_change_pct: number;
  total_strategies: number;
  total_strategies_change_pct: number;
  cumulative_pnl: number;
  cumulative_pnl_change_pct: number;
  avg_win_rate: number;
  avg_win_rate_change_pct: number;
}

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await fetch(`${API_BASE}/api/dashboard/summary`);
  if (!res.ok) {
    throw new Error(`Dashboard summary request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Trending Strategies GET /api/strategies/trending ---

export type TrendingPeriod = '7d' | '30d' | 'all';
export type TrendingRankBy = 'pnl' | 'followers' | 'roi';
export type TrendingOrder = 'asc' | 'desc';
export type TrendingCategory = 'all' | 'grid' | 'dca' | 'martingale' | 'momentum' | 'arbitrage' | 'signal-based';

export interface TrendingStrategiesParams {
  category?: TrendingCategory;
  period?: TrendingPeriod;
  period_days?: number;
  rank_by?: TrendingRankBy;
  order?: TrendingOrder;
  limit?: number;
  offset?: number;
}

export interface TrendingStrategyRaw {
  id?: string;
  strategy_id?: string;
  name?: string;
  strategy?: string;
  category?: Exclude<TrendingCategory, 'all'>;
  author?: string;
  followers?: number;
  pnl?: number;
  roi?: number;
  profit_share?: number | string;
  type?: string;
  max_drawdown?: number;
  pairs?: string[] | string;
  version?: string;
  status?: 'Active' | 'Idle' | string;
  trading_days?: number;
  [key: string]: unknown;
}

export interface TrendingStrategiesResponse {
  data: TrendingStrategyRaw[];
}

export async function getTrendingStrategies(
  params: TrendingStrategiesParams = {},
): Promise<TrendingStrategiesResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.period) query.set('period', params.period);
  if (params.period_days !== undefined) query.set('period_days', String(params.period_days));
  if (params.rank_by) query.set('rank_by', params.rank_by);
  if (params.order) query.set('order', params.order);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));

  const queryString = query.toString();
  const url = `${API_BASE}/api/strategies/trending${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Trending strategies request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Strategy Detail GET /api/strategies/{strategy}/detail ---

export interface StrategyDetailParams {
  period?: TrendingPeriod;
  period_days?: number;
  activity_limit?: number;
}

export interface StrategyDetailOverviewRaw {
  strategy: string;
  category: string;
  trading_pairs?: number;
  profit_share?: number;
  total_roi?: number;
  total_profit?: number;
  total_assets?: number;
  win_rate?: number;
  trading_frequency?: string;
  latest_price?: number;
  runtime_days?: number;
}

export interface StrategyDetailPositionRaw {
  asset: string;
  side: 'long' | 'short' | string;
  amount: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
}

export interface StrategyDetailActivityRaw {
  id: number | string;
  action: 'buy' | 'sell' | string;
  asset: string;
  amount: number;
  price: number;
  status: string;
  created_at: string;
}

export interface StrategyDetailResponse {
  overview: StrategyDetailOverviewRaw;
  current_positions: StrategyDetailPositionRaw[];
  activity_logs: StrategyDetailActivityRaw[];
}

export async function getStrategyDetail(
  strategy: string,
  params: StrategyDetailParams = {},
): Promise<StrategyDetailResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set('period', params.period);
  if (params.period_days !== undefined) query.set('period_days', String(params.period_days));
  if (params.activity_limit !== undefined) query.set('activity_limit', String(params.activity_limit));

  const queryString = query.toString();
  const url = `${API_BASE}/api/strategies/${encodeURIComponent(strategy)}/detail${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Strategy detail request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Strategy Performance GET /api/strategies/{strategy}/performance ---

export type StrategyPerformancePeriod = '1w' | '1m' | 'all';
export type StrategyPerformanceMetric = 'roi' | 'pnl';
export type StrategyPerformanceInterval = '1h' | '1d';

export interface StrategyPerformanceParams {
  period?: StrategyPerformancePeriod;
  period_days?: number;
  metric?: StrategyPerformanceMetric;
  interval?: StrategyPerformanceInterval;
}

export interface StrategyPerformancePoint {
  ts: string;
  value: number;
}

export interface StrategyPerformanceResponse {
  strategy: string;
  metric: StrategyPerformanceMetric;
  interval: StrategyPerformanceInterval;
  points: StrategyPerformancePoint[];
}

export async function getStrategyPerformance(
  strategy: string,
  params: StrategyPerformanceParams = {},
): Promise<StrategyPerformanceResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set('period', params.period);
  if (params.period_days !== undefined) query.set('period_days', String(params.period_days));
  if (params.metric) query.set('metric', params.metric);
  if (params.interval) query.set('interval', params.interval);

  const queryString = query.toString();
  const url = `${API_BASE}/api/strategies/${encodeURIComponent(strategy)}/performance${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Strategy performance request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
