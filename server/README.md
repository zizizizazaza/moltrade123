# Polymarket Copytrade Service (MVP)

Node.js/TypeScript backend，base on `polymarket.md`。Market data from Gamma / Data API，copy trade to Postgres，trade on Polygon + CLOB.

---

## From Zero

### Prerequisites

- **Node.js 18+**
- **PostgreSQL** installed and running (port 5432)

### 1. Enter Project and Install Dependencies

```powershell
cd e:\LJC\BlockChain\Hetu\moltcash_polymarket\node
npm install
```

### 2. Environment Variables

Create `.env` (copy `.env.example` and modify) in the project root or `node/`:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/polymarket_copytrade
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
TRADING_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

Only market/smart money queries need RPC and private key; trading, wallet status, approve, order placement need.

### 3. Create Database

```powershell
psql -U postgres -c "CREATE DATABASE polymarket_copytrade;"
```

### 4. Start Service

```powershell
cd node
npm run dev
```

Service default: **http://127.0.0.1:8001**. Creates table `copy_tasks` on startup.

### 5. Validation

- Health check: http://127.0.0.1:8001/health  
- API examples see below or `node/README.md`.

---

## Implemented APIs

- `POST /api/v1/tools/get_polymarket_markets`
- `POST /api/v1/tools/get_market_price`
- `POST /api/v1/tools/find_smart_money_wallets`
- `POST /api/v1/tools/get_wallet_positions`
- `POST /api/v1/tools/start_copy_trading`（Postgres）
- `GET /api/v1/tools/get_copy_tasks`
- `GET /api/v1/tools/get_copy_task_detail/:task_id`
- `POST /api/v1/tools/stop_copy_trading`
- `GET /api/v1/tools/get_wallet_status`
- `POST /api/v1/tools/wallet_approve`
- `POST /api/v1/tools/place_order`

---

## Example Requests (Linux/macOS curl)

```bash
# Market search
curl -X POST "http://127.0.0.1:8001/api/v1/tools/get_polymarket_markets" \
  -H "Content-Type: application/json" \
  -d '{"search_query":"btc","active_only":true,"limit":5}'

# Smart money ranking
curl -X POST "http://127.0.0.1:8001/api/v1/tools/find_smart_money_wallets" \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'

# Wallet status
curl "http://127.0.0.1:8001/api/v1/tools/get_wallet_status"

# Copy trading: create task
curl -X POST "http://127.0.0.1:8001/api/v1/tools/start_copy_trading" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u1","source_wallet":"0x...","market_id":"market_id","side":"YES","dry_run":true}'
```

More details see **node/README.md**.
