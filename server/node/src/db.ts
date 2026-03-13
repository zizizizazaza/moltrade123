import { Pool } from "pg";

function buildDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ||
    "postgresql://postgres:1234qwer@localhost:5432/polymarket_copytrade";
  return url.replace(/^postgresql\+psycopg:\/\//, "postgresql://");
}

export const pool = new Pool({
  connectionString: buildDatabaseUrl(),
});

const CREATE_COPY_TASKS = `
CREATE TABLE IF NOT EXISTS copy_tasks (
  task_id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  source_wallet VARCHAR(128) NOT NULL,
  market_id VARCHAR(128) NOT NULL,
  side VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  copy_ratio DOUBLE PRECISION NOT NULL,
  max_per_trade_usd DOUBLE PRECISION NOT NULL,
  min_trade_size_usd DOUBLE PRECISION NOT NULL,
  slippage_max DOUBLE PRECISION NOT NULL,
  daily_risk_budget_usd DOUBLE PRECISION NOT NULL,
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_copy_tasks_user_id ON copy_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_tasks_source_wallet ON copy_tasks(source_wallet);
CREATE INDEX IF NOT EXISTS idx_copy_tasks_market_id ON copy_tasks(market_id);
CREATE INDEX IF NOT EXISTS idx_copy_tasks_status ON copy_tasks(status);
`;

const CREATE_COPY_TASK_RUNTIME = `
CREATE TABLE IF NOT EXISTS copy_task_runtime (
  task_id VARCHAR(32) PRIMARY KEY REFERENCES copy_tasks(task_id) ON DELETE CASCADE,
  last_source_size DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_source_snapshot_json TEXT,
  spent_today_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  day_key DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_copy_task_runtime_day_key ON copy_task_runtime(day_key);
`;

const CREATE_COPY_EXECUTIONS = `
CREATE TABLE IF NOT EXISTS copy_executions (
  exec_id VARCHAR(32) PRIMARY KEY,
  task_id VARCHAR(32) NOT NULL REFERENCES copy_tasks(task_id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL,
  source_wallet VARCHAR(128) NOT NULL,
  market_id VARCHAR(128) NOT NULL,
  side VARCHAR(8) NOT NULL,
  amount_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  source_delta_size DOUBLE PRECISION NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  order_id VARCHAR(128),
  split_tx_hash VARCHAR(128),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_copy_executions_task_id ON copy_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_copy_executions_user_id ON copy_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_executions_created_at ON copy_executions(created_at DESC);
`;

const CREATE_APP_USERS = `
CREATE TABLE IF NOT EXISTS app_users (
  user_id VARCHAR(128) PRIMARY KEY,
  auth_provider VARCHAR(32) NOT NULL DEFAULT 'privy',
  primary_wallet VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_users_primary_wallet ON app_users(primary_wallet);
`;

const CREATE_USER_WALLETS = `
CREATE TABLE IF NOT EXISTS user_wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  wallet_address VARCHAR(128) NOT NULL,
  privy_wallet_id VARCHAR(128),
  privy_authorization_key TEXT,
  privy_authorization_expires_at TIMESTAMPTZ,
  chain_type VARCHAR(32) NOT NULL DEFAULT 'ethereum',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_wallet_address ON user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_privy_wallet_id ON user_wallets(privy_wallet_id);
`;

export async function ensureCopyTasksTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(CREATE_COPY_TASKS);
    await client.query(CREATE_COPY_TASK_RUNTIME);
    await client.query(CREATE_COPY_EXECUTIONS);
    await client.query(CREATE_APP_USERS);
    await client.query(CREATE_USER_WALLETS);
    await client.query(
      "ALTER TABLE copy_task_runtime ADD COLUMN IF NOT EXISTS last_source_snapshot_json TEXT"
    );
    await client.query(
      "ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS privy_wallet_id VARCHAR(128)"
    );
    await client.query(
      "ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS privy_authorization_key TEXT"
    );
    await client.query(
      "ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS privy_authorization_expires_at TIMESTAMPTZ"
    );
  } finally {
    client.release();
  }
}
