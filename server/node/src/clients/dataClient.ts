import axios, { AxiosInstance } from "axios";

export const LEADERBOARD_CATEGORIES = [
  "OVERALL",
  "POLITICS",
  "SPORTS",
  "CRYPTO",
  "CULTURE",
  "MENTIONS",
  "WEATHER",
  "ECONOMICS",
  "TECH",
  "FINANCE",
] as const;

export class PolymarketDataClient {
  private client: AxiosInstance;

  constructor(
    baseUrl: string = "https://data-api.polymarket.com",
    timeoutMs: number = 10000
  ) {
    this.client = axios.create({
      baseURL: baseUrl.replace(/\/$/, ""),
      timeout: timeoutMs,
    });
  }

  async getLeaderboard(options: {
    category?: string;
    timePeriod?: string;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const {
      category = "OVERALL",
      timePeriod = "WEEK",
      orderBy = "PNL",
      limit = 50,
      offset = 0,
    } = options;

    const normalizedCategory = LEADERBOARD_CATEGORIES.includes(
      category.toUpperCase() as any
    )
      ? category.toUpperCase()
      : "OVERALL";

    const params = {
      category: normalizedCategory,
      timePeriod: timePeriod.toUpperCase(),
      orderBy: orderBy.toUpperCase(),
      limit: Math.max(1, Math.min(50, limit)),
      offset: Math.max(0, offset),
    };
    const res = await this.client.get("/v1/leaderboard", { params });
    const data = res.data;
    return Array.isArray(data) ? data : [];
  }

  async getPositions(options: {
    user: string;
    limit?: number;
    offset?: number;
    sizeThreshold?: number;
    sortBy?: string;
    sortDirection?: string;
  }): Promise<any[]> {
    const {
      user,
      limit = 100,
      offset = 0,
      sizeThreshold = 0,
      sortBy = "TOKENS",
      sortDirection = "DESC",
    } = options;

    const params: Record<string, string | number> = {
      user: user.trim(),
      limit: Math.max(0, Math.min(500, limit)),
      offset: Math.max(0, offset),
      sizeThreshold,
      sortBy: sortBy.toUpperCase(),
      sortDirection: sortDirection.toUpperCase(),
    };
    const res = await this.client.get("/positions", { params });
    const data = res.data;
    return Array.isArray(data) ? data : [];
  }

  async getActivity(options: {
    user: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { user, limit = 200, offset = 0 } = options;
    const params: Record<string, string | number> = {
      user: user.trim(),
      limit: Math.max(1, Math.min(500, limit)),
      offset: Math.max(0, offset),
    };
    const res = await this.client.get("/activity", { params });
    const data = res.data;
    return Array.isArray(data) ? data : [];
  }

  async getTrades(options: {
    user: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { user, limit = 200, offset = 0 } = options;
    const params: Record<string, string | number> = {
      user: user.trim(),
      limit: Math.max(1, Math.min(500, limit)),
      offset: Math.max(0, offset),
    };
    const res = await this.client.get("/trades", { params });
    const data = res.data;
    return Array.isArray(data) ? data : [];
  }

  async getProfile(user: string): Promise<any | null> {
    try {
      const params = { user: user.trim() };
      const res = await this.client.get("/profile", { params });
      return res.data || null;
    } catch {
      return null;
    }
  }
}

