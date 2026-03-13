import axios, { AxiosInstance } from "axios";

export class PolymarketGammaClient {
  private client: AxiosInstance;

  constructor(
    baseUrl: string = "https://gamma-api.polymarket.com",
    timeoutMs: number = 8000
  ) {
    this.client = axios.create({
      baseURL: baseUrl.replace(/\/$/, ""),
      timeout: timeoutMs,
    });
  }

  async getMarkets(limit: number = 100, activeOnly: boolean = false): Promise<any[]> {
    const params: Record<string, string | number> = {
      limit: Math.max(1, Math.min(500, limit)),
    };
    if (activeOnly) {
      params["active"] = "true";
      params["closed"] = "false";
    }
    const res = await this.client.get("/markets", { params });
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.markets)) return data.markets;
    }
    return [];
  }

  async getPublicSearch(
    q: string,
    limitPerType: number = 100,
    eventsStatus: string | null = "active",
    page: number = 1
  ): Promise<any> {
    const params: Record<string, string | number> = {
      q: q.trim(),
      limit_per_type: Math.max(1, Math.min(500, limitPerType)),
      page,
    };
    if (eventsStatus) {
      params["events_status"] = eventsStatus;
    }
    const res = await this.client.get("/public-search", { params });
    return res.data;
  }

  async getMarketById(marketId: string): Promise<any | null> {
    try {
      const res = await this.client.get(`/markets/${marketId}`);
      return res.data;
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        return null;
      }
      throw err;
    }
  }
}

