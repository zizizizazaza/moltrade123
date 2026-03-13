import { config } from './config';

const BASE_URL = config.backendApiBaseUrl.replace(/\/$/, '');

type TokenProvider =
  | (() => string | null | undefined | Promise<string | null | undefined>)
  | null;

let tokenProvider: TokenProvider = null;

export function setApiAuthTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = async () => {
    const token =
      tokenProvider != null ? (await tokenProvider()) || null : null;
    return fetch(`${BASE_URL}${path}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
      ...init,
    });
  };

  let res = await doFetch();

  // Auto-retry once on 401 when we have a token provider.
  // Handles the race condition where Privy marks authenticated=true
  // (from local session cache) before getAccessToken() actually resolves
  // with a fresh token from the server.
  if (res.status === 401 && tokenProvider != null) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export interface BackendMarketItem {
  market_id: string;
  question: string;
  slug: string;
  polymarket_url: string;
  category: string;
  yes_price: number;
  no_price: number;
  volume: number;
  liquidity: number;
  active: boolean;
}

export interface SmartMoneyWalletItem {
  wallet: string;
  user_name?: string | null;
  profile_image?: string | null;
  win_rate: number;
  roi: number;
  pnl_usd: number;
  volume_usd?: number;
  trades_7d: number;
  category: string;
  rank_score: number;
}

export interface WalletPositionItem {
  condition_id: string;
  title: string;
  outcome: string;
  outcome_index: number;
  size: number;
  avg_price: number;
  current_value: number;
  cash_pnl: number;
  percent_pnl?: number | null;
  cur_price?: number | null;
  slug?: string | null;
  event_slug?: string | null;
  end_date?: string | null;
  redeemable?: boolean;
  mergeable?: boolean;
}

export interface CopyExecutionItem {
  exec_id: string;
  task_id: string;
  user_id: string;
  source_wallet: string;
  market_id: string;
  side: 'YES' | 'NO';
  amount_usd: number;
  source_delta_size: number;
  status: 'simulated' | 'submitted' | 'failed' | 'skipped';
  mode: 'dry_run' | 'live';
  message?: string | null;
  created_at: string;
}

export interface CopyTaskItem {
  task_id: string;
  user_id: string;
  source_wallet: string;
  market_id: string;
  side: 'YES' | 'NO' | 'AUTO';
  status: 'running' | 'paused' | 'stopped';
  accepted: boolean;
  reason?: string | null;
  copy_ratio: number;
  max_per_trade_usd: number;
  min_trade_size_usd: number;
  slippage_max: number;
  daily_risk_budget_usd: number;
  dry_run: boolean;
  created_at: string;
  updated_at: string;
}

export interface CopyPerformance {
  task_id: string;
  total_trades: number;
  success_trades: number;
  failed_trades: number;
  skipped_trades: number;
  total_amount_usd: number;
  success_rate: number;
  mode?: 'dry_run' | 'live' | null;
  last_execution_at?: string | null;
}

export async function fetchMarkets(limit = 40): Promise<BackendMarketItem[]> {
  const data = await request<{ markets: BackendMarketItem[] }>(
    '/api/v1/tools/get_polymarket_markets',
    {
      method: 'POST',
      body: JSON.stringify({ active_only: true, limit }),
    }
  );
  return data.markets || [];
}

export async function fetchSmartMoney(limit = 20): Promise<SmartMoneyWalletItem[]> {
  const data = await request<{ wallets: SmartMoneyWalletItem[] }>(
    '/api/v1/tools/find_smart_money_wallets',
    {
      method: 'POST',
      body: JSON.stringify({ limit }),
    }
  );
  return data.wallets || [];
}

/** Dedicated API for Smart Money Hub page — full filter support */
export async function fetchSmartMoneyHub(opts: {
  limit?: number;
  category?: string;
  time_period?: string;
  order_by?: string;
} = {}): Promise<{ wallets: SmartMoneyWalletItem[]; total: number }> {
  return request<{ wallets: SmartMoneyWalletItem[]; total: number }>(
    '/api/v1/tools/find_smart_money_wallets',
    {
      method: 'POST',
      body: JSON.stringify({
        limit: opts.limit ?? 50,
        category: opts.category,
        time_period: opts.time_period,
        order_by: opts.order_by,
      }),
    }
  );
}

export async function fetchUserPositions(wallet: string): Promise<WalletPositionItem[]> {
  const q = new URLSearchParams({ wallet, limit: '100' });
  const data = await request<{ positions: WalletPositionItem[] }>(
    `/api/v1/tools/get_user_positions?${q.toString()}`
  );
  return data.positions || [];
}

export async function fetchWalletPositions(
  wallet: string,
  limit = 100
): Promise<{ wallet: string; positions: WalletPositionItem[]; total: number }> {
  return request('/api/v1/tools/get_wallet_positions', {
    method: 'POST',
    body: JSON.stringify({ wallet, limit }),
  });
}

export async function fetchTradeHistory(
  _wallet: string,
  limit = 20
): Promise<CopyExecutionItem[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  const data = await request<{ trades: CopyExecutionItem[] }>(
    `/api/v1/tools/get_trade_history?${q.toString()}`
  );
  return data.trades || [];
}

export async function syncUserWallet(
  walletAddress: string,
  userJwt?: string | null
): Promise<void> {
  await request<{ ok: boolean; user: unknown }>('/api/v1/users/sync_wallet', {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: walletAddress,
      ...(userJwt ? { user_jwt: userJwt } : {}),
    }),
  });
}

export async function startCopyTrading(input: {
  source_wallet: string;
  market_id?: string | null;
  side?: 'YES' | 'NO' | 'AUTO';
  copy_ratio: number;
  max_per_trade_usd: number;
  min_trade_size_usd: number;
  slippage_max: number;
  daily_risk_budget_usd: number;
  dry_run: boolean;
}): Promise<{ task_id: string; status: string; accepted: boolean; reason?: string | null }> {
  return request('/api/v1/tools/start_copy_trading', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchCopyTasks(limit = 50): Promise<CopyTaskItem[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  const data = await request<{ tasks: CopyTaskItem[] }>(
    `/api/v1/tools/get_copy_tasks?${q.toString()}`
  );
  return data.tasks || [];
}

export async function updateCopyTask(input: {
  task_id: string;
  status?: 'running' | 'paused';
  copy_ratio?: number;
  max_per_trade_usd?: number;
  min_trade_size_usd?: number;
  slippage_max?: number;
  daily_risk_budget_usd?: number;
  dry_run?: boolean;
}): Promise<CopyTaskItem> {
  const data = await request<{ updated: boolean; task: CopyTaskItem }>(
    '/api/v1/tools/update_copy_settings',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  return data.task;
}

export async function stopCopyTask(taskId: string): Promise<void> {
  await request('/api/v1/tools/stop_copy_trading', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId }),
  });
}

export async function fetchCopyPerformance(taskId: string): Promise<CopyPerformance> {
  const q = new URLSearchParams({ task_id: taskId });
  return request(`/api/v1/tools/get_copy_performance?${q.toString()}`);
}

// ----------- Trader Detail Page APIs -----------

export interface WalletActivityItem {
  id: string;
  type: string;
  title: string;
  outcome: string;
  side: string;
  size: number;
  price: number;
  amount_usd: number;
  fee: number;
  timestamp: string;
  slug?: string | null;
  event_slug?: string | null;
  market_slug?: string | null;
  icon?: string | null;
  transaction_hash?: string | null;
}

export interface WalletTradeItem {
  id: string;
  market: string;
  outcome: string;
  side: string;
  size: number;
  price: number;
  amount_usd: number;
  pnl: number;
  roi: number;
  timestamp: string;
  slug?: string | null;
  icon?: string | null;
  transaction_hash?: string | null;
}

export interface WalletProfileInfo {
  wallet: string;
  username: string | null;
  pseudonym: string | null;
  profile_image: string | null;
  total_pnl: number;
  volume_usd: number;
  trades_count: number;
}

export async function fetchWalletActivity(
  wallet: string,
  limit = 200
): Promise<{ wallet: string; activities: WalletActivityItem[]; total: number }> {
  return request('/api/v1/tools/get_wallet_activity', {
    method: 'POST',
    body: JSON.stringify({ wallet, limit }),
  });
}

export async function fetchWalletTrades(
  wallet: string,
  limit = 200
): Promise<{ wallet: string; trades: WalletTradeItem[]; total: number }> {
  return request('/api/v1/tools/get_wallet_trades', {
    method: 'POST',
    body: JSON.stringify({ wallet, limit }),
  });
}

export async function fetchWalletProfile(
  wallet: string
): Promise<WalletProfileInfo> {
  const q = new URLSearchParams({ wallet });
  return request(`/api/v1/tools/get_wallet_profile?${q.toString()}`);
}
