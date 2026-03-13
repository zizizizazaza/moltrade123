import { PolymarketDataClient, LEADERBOARD_CATEGORIES } from "../clients/dataClient";
import {
  FindSmartMoneyWalletsRequest,
  GetWalletPositionsRequest,
  GetWalletPositionsResponse,
  SmartMoneyWallet,
  WalletPosition,
} from "../models";

export class SmartMoneyService {
  private dataClient: PolymarketDataClient;

  constructor() {
    this.dataClient = new PolymarketDataClient();
  }

  /** Convert various timestamp formats to ISO string */
  private normalizeTimestamp(raw: any): string {
    if (!raw) return "";
    // Already an ISO string
    if (typeof raw === "string" && raw.includes("-")) return raw;
    // Unix seconds (< year 2100) or ms
    const n = Number(raw);
    if (!isNaN(n) && n > 0) {
      // If number looks like seconds (< 10 billion), multiply by 1000
      const ms = n < 10_000_000_000 ? n * 1000 : n;
      return new Date(ms).toISOString();
    }
    return String(raw);
  }

  async findWallets(
    req: FindSmartMoneyWalletsRequest
  ): Promise<{ wallets: SmartMoneyWallet[]; total: number }> {
    const wallets = await this.fetchLeaderboardWallets(req);
    const sorted = wallets.sort((a, b) => b.rank_score - a.rank_score);
    const total = sorted.length;
    const limited = sorted.slice(0, Math.max(1, req.limit));
    return { wallets: limited, total };
  }

  private async fetchLeaderboardWallets(
    req: FindSmartMoneyWalletsRequest
  ): Promise<SmartMoneyWallet[]> {
    try {
      let category = "OVERALL";
      if (req.category) {
        const cu = req.category.trim().toUpperCase();
        if (LEADERBOARD_CATEGORIES.includes(cu as any)) {
          category = cu;
        } else if (
          ["CRYPTO", "POLITICS", "SPORTS", "TECH", "FINANCE", "CULTURE"].includes(cu)
        ) {
          category = cu;
        }
      }
      let timePeriod = (req.time_period || "WEEK").trim().toUpperCase();
      if (!["DAY", "WEEK", "MONTH", "ALL"].includes(timePeriod)) {
        timePeriod = "WEEK";
      }
      let orderBy = (req.order_by || "PNL").trim().toUpperCase();
      if (!["PNL", "VOL"].includes(orderBy)) {
        orderBy = "PNL";
      }

      const raw = await this.dataClient.getLeaderboard({
        category,
        timePeriod,
        orderBy,
        limit: Math.max(req.limit, 50),
      });

      const out: SmartMoneyWallet[] = [];
      raw.forEach((row: any, i: number) => {
        const rank = Number(row.rank ?? i + 1);
        const proxy: string = (row.proxyWallet || "").trim();
        if (!proxy || !proxy.startsWith("0x")) return;
        const pnl = Number(row.pnl ?? 0);
        const vol = Number(row.vol ?? 0);
        const userNameRaw = (row.userName || "").trim();
        const user_name = userNameRaw || null;
        const profile_image = (row.profileImage || row.profile_image || null) as string | null;
        out.push({
          wallet: proxy,
          user_name,
          profile_image,
          win_rate: 0,
          roi: 0,
          pnl_usd: pnl,
          volume_usd: vol,
          trades_7d: 0,
          category: (req.category || "overall").toLowerCase(),
          rank_score: Math.max(0, 101 - rank),
        });
      });
      return out;
    } catch {
      return [];
    }
  }

  async getWalletPositions(
    req: GetWalletPositionsRequest
  ): Promise<GetWalletPositionsResponse> {
    const wallet = (req.wallet || "").trim();
    if (!wallet || !wallet.startsWith("0x")) {
      return {
        wallet: wallet || "",
        positions: [],
        total: 0,
      };
    }

    try {
      const raw = await this.dataClient.getPositions({
        user: wallet,
        limit: req.limit,
        offset: req.offset,
        sizeThreshold: req.size_threshold,
        sortBy: req.sort_by,
        sortDirection: req.sort_direction,
      });
      const positions: WalletPosition[] = raw
        .filter((p: any) => p && typeof p === "object")
        .map((p: any) => this.normalizePosition(p))
        .filter((p: any): p is WalletPosition => p != null);

      return {
        wallet,
        positions,
        total: positions.length,
      };
    } catch {
      return { wallet, positions: [], total: 0 };
    }
  }

  private normalizePosition(row: any): WalletPosition | null {
    const cid = row.conditionId;
    if (!cid) return null;
    return {
      condition_id: String(cid),
      title: String(row.title || ""),
      outcome: String(row.outcome || ""),
      outcome_index: Number(row.outcomeIndex ?? 0),
      size: Number(row.size ?? 0),
      avg_price: Number(row.avgPrice ?? 0),
      current_value: Number(row.currentValue ?? 0),
      cash_pnl: Number(row.cashPnl ?? 0),
      percent_pnl:
        row.percentPnl != null ? Number(row.percentPnl) : null,
      cur_price: row.curPrice != null ? Number(row.curPrice) : null,
      slug: (row.slug || "").trim() || null,
      event_slug: (row.eventSlug || "").trim() || null,
      end_date: (row.endDate || "").trim() || null,
      redeemable: Boolean(row.redeemable ?? false),
      mergeable: Boolean(row.mergeable ?? false),
    };
  }

  async getWalletActivity(
    wallet: string,
    limit = 200,
    offset = 0
  ): Promise<{ wallet: string; activities: any[]; total: number }> {
    if (!wallet || !wallet.startsWith("0x")) {
      return { wallet, activities: [], total: 0 };
    }
    try {
      const raw = await this.dataClient.getActivity({ user: wallet, limit, offset });
      const activities = raw.map((row: any) => ({
        id: String(row.transactionHash || ""),
        // "type" is TRADE or REDEEM from Polymarket
        type: String(row.type || "TRADE").toUpperCase(),
        // For TRADE: side is BUY/SELL. For REDEEM: no side
        side: String(row.side || row.type || "").toUpperCase(),
        title: String(row.title || ""),
        outcome: String(row.outcome || ""),
        // shares traded
        size: Number(row.size ?? 0),
        // price per share
        price: Number(row.price ?? 0),
        // USDC amount — for TRADE: cost/proceeds; for REDEEM: amount received
        amount_usd: Number(row.usdcSize ?? 0),
        timestamp: this.normalizeTimestamp(row.timestamp),
        slug: (row.slug || "").trim() || null,
        icon: (row.icon || "").trim() || null,
        transaction_hash: (row.transactionHash || "").trim() || null,
      }));
      return { wallet, activities, total: activities.length };
    } catch {
      return { wallet, activities: [], total: 0 };
    }
  }

  async getWalletTrades(
    wallet: string,
    limit = 200,
    offset = 0
  ): Promise<{ wallet: string; trades: any[]; total: number; volume_usd: number }> {
    if (!wallet || !wallet.startsWith("0x")) {
      return { wallet, trades: [], total: 0, volume_usd: 0 };
    }
    try {
      const raw = await this.dataClient.getTrades({ user: wallet, limit, offset });
      let volume = 0;
      const trades = raw.map((row: any) => {
        const size = Number(row.size ?? 0);
        const price = Number(row.price ?? 0);
        // Amount = shares * price (Polymarket /trades has no usdcSize field)
        const amount_usd = Math.round(size * price * 100) / 100;
        volume += amount_usd;
        return {
          id: String(row.transactionHash || ""),
          market: String(row.title || ""),
          outcome: String(row.outcome || ""),
          side: String(row.side || "").toUpperCase(),
          size,
          price,
          amount_usd,
          // PnL is not available from this endpoint; default to 0
          pnl: 0,
          roi: 0,
          timestamp: this.normalizeTimestamp(row.timestamp),
          slug: (row.slug || "").trim() || null,
          icon: (row.icon || "").trim() || null,
          transaction_hash: (row.transactionHash || "").trim() || null,
        };
      });
      return { wallet, trades, total: trades.length, volume_usd: Math.round(volume * 100) / 100 };
    } catch {
      return { wallet, trades: [], total: 0, volume_usd: 0 };
    }
  }

  async getWalletProfile(
    wallet: string
  ): Promise<{
    wallet: string;
    username: string | null;
    pseudonym: string | null;
    profile_image: string | null;
    total_pnl: number;
    volume_usd: number;
    trades_count: number;
  }> {
    const defaults = {
      wallet,
      username: null as string | null,
      pseudonym: null as string | null,
      profile_image: null as string | null,
      total_pnl: 0,
      volume_usd: 0,
      trades_count: 0,
    };
    if (!wallet || !wallet.startsWith("0x")) return defaults;
    try {
      // Profile info is embedded in each activity/trade record
      // Fetch a few activity rows to extract name, pseudonym, profileImage
      const raw = await this.dataClient.getActivity({ user: wallet, limit: 5 });
      const first = raw[0] || {};
      const username = (first.name || first.username || "").trim() || null;
      const pseudonym = (first.pseudonym || "").trim() || null;
      const profile_image = (first.profileImage || first.profileImageOptimized || "").trim() || null;

      // Compute volume from full trades
      const tradesData = await this.getWalletTrades(wallet, 500);

      // Compute total PnL: sum REDEEM amounts minus BUY amounts from activity
      const activityAll = await this.dataClient.getActivity({ user: wallet, limit: 500 });
      let redeems = 0;
      let buys = 0;
      activityAll.forEach((r: any) => {
        const usd = Number(r.usdcSize ?? 0);
        if (r.type === "REDEEM") redeems += usd;
        else if (r.side === "BUY") buys += usd;
      });
      const total_pnl = Math.round((redeems - buys) * 100) / 100;

      return {
        wallet,
        username,
        pseudonym,
        profile_image,
        total_pnl,
        volume_usd: tradesData.volume_usd,
        trades_count: tradesData.total,
      };
    } catch {
      return defaults;
    }
  }
}


