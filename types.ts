
export interface TreasuryStats {
  tvl: number;
  collateralRatio: number;
  treasuryRevenue: number;
  lastPoR: string;
  reserveAllocation: {
    tBills: number;
    liquidity: number;
    operations: number;
  };
}

export interface MarketAsset {
  id: string;
  title: string;
  subtitle: string;
  category: 'Compute' | 'SaaS' | 'E-commerce';
  issuer: string;
  faceValue: number;
  askPrice: number;
  apy: number;
  durationDays: number;
  creditScore: number;
  status: 'Fundraising' | 'Ending Soon' | 'Sold Out' | 'Failed' | 'Funded';
  targetAmount: number;
  raisedAmount: number;
  backersCount: number;
  remainingCap: number;
  coverageRatio: number;
  verifiedSource: string;
  description: string;
  useOfFunds: string;
  monthlyRevenue: { month: string; amount: number }[];
  coverImage: string;
  issuerLogo: string;
}

export interface HistoryItem {
  timestamp: string;
  type: 'MINT' | 'REDEEM' | 'INTEREST' | 'DEPOSIT';
  amount: number;
  asset: string;
  status: 'COMPLETED' | 'PENDING' | 'QUEUED';
}

export enum Page {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  SWAP = 'SWAP',
  MARKET = 'MARKET',
  COPYTRADE = 'COPYTRADE',
  PORTFOLIO = 'PORTFOLIO',
  AGENT = 'AGENT',
  CHAT = 'CHAT',
  SETTINGS = 'SETTINGS',
  TASKS = 'TASKS',
  LEADERBOARD = 'LEADERBOARD',
  TASK_DETAIL = 'TASK_DETAIL',
  GROUPS = 'GROUPS'
}
