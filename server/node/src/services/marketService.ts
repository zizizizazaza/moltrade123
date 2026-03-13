import { PolymarketGammaClient } from "../clients/gammaClient";
import {
  GetPolymarketMarketsRequest,
  MarketItem,
  MarketPriceResponse,
} from "../models";

const MOCK_MARKETS: MarketItem[] = [];

export class MarketService {
  private gamma: PolymarketGammaClient;

  constructor() {
    this.gamma = new PolymarketGammaClient();
  }

  async listMarkets(
    req: GetPolymarketMarketsRequest
  ): Promise<{ markets: MarketItem[]; total: number }> {
    let markets: any[] = [];
    let total = 0;

    if (req.search_query && req.search_query.trim()) {
      const result = await this.listMarketsViaSearch(req);
      markets = result.markets;
      total = result.total;
    } else {
      markets = await this.loadMarketsWithFallback(
        Math.max(req.limit * 3, 100),
        req.active_only
      );
      total = markets.length;
    }

    if (req.active_only) {
      markets = markets.filter((m) => m.active);
    }
    if (req.category && req.category.trim().toLowerCase() !== "string") {
      const cat = req.category.trim().toLowerCase();
      markets = markets.filter(
        (m) => (m.category || "").toLowerCase() === cat
      );
    }

    markets = markets.filter(
      (m) =>
        m.volume >= (req.min_volume_usd ?? 0) &&
        m.liquidity >= (req.min_liquidity_usd ?? 0)
    );

    total = markets.length;
    markets = markets.slice(0, Math.max(1, req.limit));
    return { markets: markets as MarketItem[], total };
  }

  async getMarketPrice(marketId: string): Promise<MarketPriceResponse | null> {
    try {
      const raw = await this.gamma.getMarketById(marketId);
      if (raw && typeof raw === "object") {
        const norm = this.normalizeMarket(raw);
        if (norm) {
          return {
            market_id: norm.market_id,
            yes_price: norm.yes_price,
            no_price: norm.no_price,
            implied_prob: norm.yes_price,
            last_trade: new Date().toISOString(),
          };
        }
      }
    } catch {
      // ignore
    }

    const live = await this.loadMarketsWithFallback(400);
    const m = live.find((x) => x.market_id === marketId);
    if (!m) return null;
    return {
      market_id: m.market_id,
      yes_price: m.yes_price,
      no_price: m.no_price,
      implied_prob: m.yes_price,
      last_trade: new Date().toISOString(),
    };
  }

  /** 获取交易所需：condition_id, yes_token_id, no_token_id, yes_price, no_price */
  async getMarketForTrade(marketId: string): Promise<{
    condition_id: string;
    yes_token_id: string;
    no_token_id: string;
    yes_price: number;
    no_price: number;
  } | null> {
    try {
      const raw = await this.gamma.getMarketById(marketId);
      if (!raw || typeof raw !== "object") return null;

      const conditionId =
        raw.conditionId || raw.condition_id || raw.id;
      let clobIds: string[] = raw.clobTokenIds;
      if (typeof clobIds === "string") {
        clobIds = this.parseJsonArrayOrSplit(clobIds, false);
      } else if (!Array.isArray(clobIds)) {
        clobIds = [];
      }

      const [yesPrice, noPrice] = this.extractYesNoPrices(raw);
      const yes_token_id = clobIds[0] ? String(clobIds[0]).trim() : "";
      const no_token_id = clobIds[1] ? String(clobIds[1]).trim() : "";
      if (!conditionId || !yes_token_id || !no_token_id) return null;

      return {
        condition_id: String(conditionId),
        yes_token_id,
        no_token_id,
        yes_price: this.boundProbability(yesPrice),
        no_price: this.boundProbability(noPrice),
      };
    } catch {
      return null;
    }
  }

  private async listMarketsViaSearch(
    req: GetPolymarketMarketsRequest
  ): Promise<{ markets: MarketItem[]; total: number }> {
    try {
      const eventsStatus = req.active_only ? "active" : null;
      const limitPerType = Math.max(100, req.limit * 10);
      const resp = await this.gamma.getPublicSearch(
        req.search_query!.trim(),
        limitPerType,
        eventsStatus
      );

      const events: any[] = resp?.events || [];
      const pagination: any = resp?.pagination || {};
      const totalFromApi: number = pagination.totalResults || 0;

      const flattened: MarketItem[] = [];
      for (const ev of events) {
        if (!ev || typeof ev !== "object") continue;
        const eventSlug = (ev.slug || ev.ticker || "").trim();
        for (const m of ev.markets || []) {
          if (!m || typeof m !== "object") continue;
          const norm = this.normalizeMarket(m, eventSlug);
          if (norm) flattened.push(norm);
        }
      }
      const total = flattened.length > 0 ? flattened.length : totalFromApi;
      return { markets: flattened, total };
    } catch {
      const fallback = await this.loadMarketsWithFallback(
        300,
        req.active_only
      );
      return { markets: fallback, total: fallback.length };
    }
  }

  private async loadMarketsWithFallback(
    limit: number,
    activeOnly: boolean = false
  ): Promise<MarketItem[]> {
    try {
      const raw = await this.gamma.getMarkets(limit, activeOnly);
      const normalized = raw
        .map((m: any) => this.normalizeMarket(m))
        .filter((x: MarketItem | null): x is MarketItem => x != null);
      if (normalized.length) return normalized;
    } catch {
      // ignore
    }
    return MOCK_MARKETS;
  }

  private normalizeMarket(
    market: any,
    eventSlugOverride?: string
  ): MarketItem | null {
    const marketId =
      market.id || market.conditionId || market.marketId || market.slug;
    const question = market.question || market.title;
    if (!marketId || !question) return null;

    const [yesPrice, noPrice] = this.extractYesNoPrices(market);
    const volume = this.toFloat(
      market.volume || market.volumeNum || market.volumeUsd || 0
    );
    const liquidity = this.toFloat(
      market.liquidity || market.liquidityNum || market.liquidityUsd || 0
    );

    const category = String(market.category || "unknown").toLowerCase();
    const slug = market.slug || String(marketId);

    let eventSlug = eventSlugOverride;
    if (!eventSlug) {
      const events = market.events;
      if (Array.isArray(events) && events.length > 0) {
        const first = events[0];
        if (first && typeof first === "object") {
          eventSlug = first.slug;
        }
      }
    }
    const polymarketUrl = eventSlug
      ? `https://polymarket.com/event/${eventSlug}/${slug}`
      : `https://polymarket.com/market/${slug}`;

    let active =
      Boolean(market.active ?? true) && !Boolean(market.closed ?? false);
    const endDateStr =
      market.endDateIso || market.end_date || market.endDate || null;
    if (typeof endDateStr === "string" && endDateStr.trim()) {
      const endDt = this.parseEndDate(endDateStr);
      if (endDt && endDt.getTime() < Date.now()) {
        active = false;
      }
    }

    return {
      market_id: String(marketId),
      question: String(question),
      slug: String(slug),
      polymarket_url: polymarketUrl,
      category,
      yes_price: yesPrice,
      no_price: noPrice,
      volume,
      liquidity,
      active,
    };
  }

  private extractYesNoPrices(market: any): [number, number] {
    if ("yesPrice" in market || "noPrice" in market) {
      const yes = this.toFloat(market.yesPrice ?? 0.5);
      const no = this.toFloat(
        market.noPrice ?? (1 - (typeof yes === "number" ? yes : 0.5))
      );
      return [this.boundProbability(yes), this.boundProbability(no)];
    }

    const bestBid = market.bestBid;
    const bestAsk = market.bestAsk;
    if (bestBid != null && bestAsk != null) {
      const bid = this.toFloat(bestBid);
      const ask = this.toFloat(bestAsk);
      if (bid > 0 || ask > 0) {
        const yes = ask > 0 ? ask : 1 - bid;
        const no = 1 - yes;
        return [this.boundProbability(yes), this.boundProbability(no)];
      }
    }

    let outcomes = market.outcomes;
    let outcomePrices = market.outcomePrices;

    if (typeof outcomes === "string") {
      outcomes = this.parseJsonArrayOrSplit(outcomes, true);
    } else if (Array.isArray(outcomes)) {
      outcomes = outcomes.map((s: any) =>
        String(s).trim().toUpperCase()
      );
    } else {
      outcomes = [];
    }

    if (typeof outcomePrices === "string") {
      outcomePrices = this.parseJsonArrayOrSplit(outcomePrices, false);
    } else if (!Array.isArray(outcomePrices)) {
      outcomePrices = [];
    }

    let yesPrice = 0.5;
    let noPrice = 0.5;
    if (
      outcomes.length &&
      outcomePrices.length &&
      outcomes.length === outcomePrices.length
    ) {
      const paired: Record<string, number> = {};
      for (let i = 0; i < outcomes.length; i++) {
        paired[outcomes[i]] = this.toFloat(outcomePrices[i]);
      }
      if ("YES" in paired) {
        yesPrice = paired["YES"];
        noPrice = 1 - yesPrice;
      } else if ("NO" in paired) {
        noPrice = paired["NO"];
        yesPrice = 1 - noPrice;
      } else if (outcomePrices.length >= 2) {
        yesPrice = this.toFloat(outcomePrices[0]);
        noPrice = this.toFloat(outcomePrices[1]);
      }
    }
    return [this.boundProbability(yesPrice), this.boundProbability(noPrice)];
  }

  private parseJsonArrayOrSplit(value: string, upper: boolean): string[] {
    const s = (value || "").trim();
    if (!s) return [];
    try {
      const out = JSON.parse(s);
      if (Array.isArray(out)) {
        return out.map((x) =>
          upper ? String(x).trim().toUpperCase() : String(x).trim()
        );
      }
    } catch {
      // ignore
    }
    return s.split(",").map((x) =>
      upper ? x.trim().toUpperCase() : x.trim()
    );
  }

  private parseEndDate(value: string): Date | null {
    try {
      let s = value.trim();
      if (!s) return null;
      if (s.endsWith("Z")) {
        s = s.slice(0, -1) + "+00:00";
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  private toFloat(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  private boundProbability(v: number): number {
    if (!isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }
}

