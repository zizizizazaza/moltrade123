# Node Polymarket Copytrade Service

Compatible with Python API, default port **8001**.

## Environment Variables

Create `.env` (copy `.env.example` and modify) in the project root or `node/`:

```env
# Database (same as Python, pg uses postgresql:// prefix)
DATABASE_URL=postgresql://postgres:1234qwer@localhost:5432/polymarket_copytrade

# Privy auth (protect user-level copytrade interfaces)
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
# Optional: copy verification key from Dashboard
# PRIVY_VERIFICATION_KEY=-----BEGIN PUBLIC KEY-----...

# On-chain/Trading (wallet_status, wallet_approve, place_order)
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
TRADING_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

## Start

```bash
cd node
npm install
npm run dev
```

Service address: `http://127.0.0.1:8001`.

## Implemented APIs (same as Python)

- `POST /api/v1/tools/get_polymarket_markets`
- `POST /api/v1/tools/get_market_price`
- `POST /api/v1/tools/find_smart_money_wallets`
- `POST /api/v1/tools/get_wallet_positions`
- `POST /api/v1/tools/start_copy_trading`
- `GET /api/v1/tools/get_copy_tasks`
- `GET /api/v1/tools/get_copy_task_detail/:task_id`
- `POST /api/v1/tools/stop_copy_trading`
- `POST /api/v1/tools/update_copy_settings`
- `GET /api/v1/tools/get_copy_performance?task_id=...`
- `GET /api/v1/tools/get_trade_history?user_id=...&task_id=...&limit=...`
- `GET /api/v1/tools/get_wallet_status`
- `POST /api/v1/tools/wallet_approve`
- `POST /api/v1/tools/place_order`
- `GET /api/v1/tools/get_user_positions` (wallet optional, default to trading wallet)
- `POST /api/v1/users/sync_wallet` (login to report current Privy wallet address)

First start will create tables:

- `copy_tasks`
- `copy_task_runtime`
- `copy_executions`

And default start a copytrade worker (polling interval `COPYTRADE_POLL_MS`, default 15 seconds).

## Auth

- The following interfaces require `Authorization: Bearer <privy_access_token>`:
  - `start_copy_trading`
  - `get_copy_tasks`
  - `get_copy_task_detail`
  - `stop_copy_trading`
  - `update_copy_settings`
  - `get_copy_performance`
  - `get_trade_history`
  - `POST /api/v1/users/sync_wallet`
- Copytrade task `user_id` is extracted from Privy token claims, avoid forging others' user_id.
