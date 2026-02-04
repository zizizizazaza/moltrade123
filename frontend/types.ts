
export interface Strategy {
  id: string;
  name: string;
  author: string;
  version: string;
  status: 'Active' | 'Idle';
  roi: number;
  profit: number;
  followers: string;
  tradingDays: number;
  icon: string;
  pairs?: string[];
  profitShare?: string;
  type?: string;
  maxDrawdown: number;
}

export interface Trade {
  id: string;
  agent: string;
  time: string;
  action: 'Buy' | 'Sell';
  asset: string;
  amount: number;
  price: number;
  status: string;
}

export interface Position {
  asset: string;
  type: 'Long' | 'Short';
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  leverage: string;
  icon: string;
}
