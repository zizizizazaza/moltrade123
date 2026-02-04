
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Position } from '../types';

const data1w = [
  { name: 'Mon', pnl: 2000 },
  { name: 'Tue', pnl: 4500 },
  { name: 'Wed', pnl: 3800 },
  { name: 'Thu', pnl: 6500 },
  { name: 'Fri', pnl: 5900 },
  { name: 'Sat', pnl: 8200 },
  { name: 'Sun', pnl: 11000 },
];

const data1m = Array.from({ length: 30 }, (_, i) => ({
  name: `${i + 1}`,
  pnl: 5000 + Math.sin(i / 2) * 2000 + i * 100
}));

const dataAll = [
  { name: 'Jan', pnl: 12000 },
  { name: 'Feb', pnl: 15400 },
  { name: 'Mar', pnl: 18900 },
  { name: 'Apr', pnl: 22000 },
  { name: 'May', pnl: 21500 },
  { name: 'Jun', pnl: 24800 },
  { name: 'Jul', pnl: 29000 },
  { name: 'Aug', pnl: 34000 },
  { name: 'Sep', pnl: 32000 },
  { name: 'Oct', pnl: 38000 },
  { name: 'Nov', pnl: 42000 },
  { name: 'Dec', pnl: 48000 },
];

const mockPositions: Position[] = [
  { asset: 'BTC/USDT', type: 'Long', entryPrice: 61240.50, currentPrice: 63420.25, pnl: 1420.50, pnlPercent: 3.56, leverage: '10x', icon: '₿' },
];

const mockActivity = [
  { id: 1, type: 'Buy', asset: 'BTC/USDT', amount: '0.421', price: 61420.50, time: '02 Min Ago', status: 'Completed' },
  { id: 2, type: 'Sell', asset: 'ETH/USDT', amount: '12.50', price: 2540.10, time: '15 Min Ago', status: 'Completed' },
  { id: 3, type: 'Buy', asset: 'SOL/USDT', amount: '150.00', price: 142.80, time: '12H Ago', status: 'Completed' },
  { id: 4, type: 'Sell', asset: 'LINK/USDT', amount: '840.00', price: 18.25, time: '1D Ago', status: 'Completed' },
  { id: 5, type: 'Buy', asset: 'BTC/USDT', amount: '0.150', price: 59800.00, time: '2D Ago', status: 'Completed' },
];

const mockStrategyDetails: Record<string, any> = {
  'snx': { name: 'Sigma Arbitrage X', type: 'Arbitrage', status: 'Active', pairs: ['BTC', 'USDC'], profitShare: '10%' },
  'ccln': { name: 'Cross-Chain Liquidity Node', type: 'Grid', status: 'Active', pairs: ['ETH', 'USDC'], profitShare: '20%' },
  'hfmr': { name: 'High-Freq Mean Reversion', type: 'Signal-based', status: 'Active', pairs: ['SOL', 'USDC'], profitShare: '15%' },
  'vwtf': { name: 'Vol-Weighted Trend Follower', type: 'Momentum', status: 'Idle', pairs: ['BTC', 'SOL'], profitShare: '10%' },
  'msv4': { name: 'Momentum Sentinel v4', type: 'Momentum', status: 'Active', pairs: ['ETH', 'BTC'], profitShare: '25%' },
  'lh': { name: 'Liquidation Hunter', type: 'Signal-based', status: 'Active', pairs: ['SOL', 'ETH'], profitShare: '20%' },
  'dna4': { name: 'Neural Alpha-IV', type: 'Signal-based', status: 'Active', pairs: ['ETH', 'USDC'], profitShare: '15%' },
  'dca_m1': { name: 'DCA Master', type: 'DCA', status: 'Active', pairs: ['BTC', 'ETH'], profitShare: '5%' },
};

const StrategyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const strategy = mockStrategyDetails[id || 'dna4'] || mockStrategyDetails['dna4'];

  const [activeTab, setActiveTab] = useState<'positions' | 'activity'>('positions');
  const [viewMode, setViewMode] = useState<'rate' | 'amount'>('rate');
  const [timeRange, setTimeRange] = useState<'1w' | '1m' | 'all'>('1m');

  const getTypeSpecificParams = (type: string) => {
    switch (type) {
      case 'Grid':
        return [
          { label: 'Grid Quantity', value: '50' },
          { label: 'Price Range', value: 'ETH $2k–$4k' },
          { label: 'Strategy Tag', value: <span className="text-[#10B981] font-bold">Sideways Friendly</span> },
        ];
      case 'DCA':
        return [
          { label: 'Investment Frequency', value: 'Weekly' },
          { label: 'Leverage', value: '1.0x (No Leverage)' },
          { label: 'Strategy Tag', value: <span className="text-[#10B981] font-bold">Bull/Bear Friendly</span> },
        ];
      case 'Martingale':
        return [
          { label: 'Position Multiplier', value: '2x' },
          { label: 'Max Steps', value: '8 Levels' },
          { label: 'Risk Warning', value: <span className="text-[#EF4444] font-bold">High Risk - Max DD 72%</span> },
        ];
      case 'Momentum':
        return [
          { label: 'Leverage', value: '5.0x' },
          { label: 'Trend Indicator', value: 'ADX > 25' },
          { label: 'Strategy Tag', value: <span className="text-[#10B981] font-bold">Strong Trend Preferred</span> },
        ];
      case 'Arbitrage':
        return [
          { label: 'Arbitrage Type', value: 'Funding Fee' },
          { label: 'Expected APR', value: '15–30%' },
          { label: 'Risk Profile', value: <span className="text-[#3B82F6] font-bold">Low Volatility</span> },
        ];
      case 'Signal-based':
      default:
        return [
          { label: 'Signal Source', value: 'On-chain Whales + Twitter' },
          { label: 'Win Rate', value: '68%' },
          { label: 'Trading Frequency', value: 'Medium' },
        ];
    }
  };

  const TokenIcon = ({ symbol }: { symbol: string }) => {
    const iconMap: Record<string, string> = {
      'BTC': 'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=035',
      'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=035',
      'SOL': 'https://cryptologos.cc/logos/solana-sol-logo.png?v=035',
      'USDC': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=035',
      'LINK': 'https://cryptologos.cc/logos/chainlink-link-logo.png?v=035',
      'AVAX': 'https://cryptologos.cc/logos/avalanche-avax-logo.png?v=035',
    };
    const src = iconMap[symbol] || `https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff`;
    return (
      <img
        src={src}
        alt={symbol}
        className="w-5 h-5 rounded-full ring-2 ring-[#1A1A1E] bg-[#1A1A1E] object-contain"
        title={symbol}
      />
    );
  };

  const TokenPairIcons = ({ pairs }: { pairs?: string[] }) => {
    if (!pairs || pairs.length === 0) return null;
    return (
      <div className="flex -space-x-1.5 items-center">
        {pairs.map((symbol, idx) => (
          <TokenIcon key={idx} symbol={symbol} />
        ))}
      </div>
    );
  };

  const getRawData = () => {
    if (timeRange === '1w') return data1w;
    if (timeRange === '1m') return data1m;
    return dataAll;
  };

  const chartData = getRawData().map(d => ({
    ...d,
    displayPnl: viewMode === 'rate' ? (d.pnl / 100) : (d.pnl * 10)
  }));

  return (
    <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-white/40 text-[11px] font-semibold tracking-wide mb-8">
        <Link to="/strategy" className="hover:text-white transition-colors">Strategies</Link>
        <span>/</span>
        <span className="text-white">{strategy.name} Detail</span>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-10">
        <div className="flex items-center gap-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-black tracking-tight">{strategy.name}</h1>
              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 uppercase tracking-widest">{strategy.type}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/40 font-mono">By <Link to="/agent/alpha" className="text-white/80 hover:text-primary-accent transition-colors">@Agent_Alpha</Link></span>
              <span className="text-white/10">•</span>
              <span className="text-[11px] text-white/40 font-bold tracking-[0.2em]">v2.4.0-STABLE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-12">
          <div className="text-right">
            <div className="text-[10px] text-white/30 font-bold tracking-[0.2em] mb-3 uppercase">Trading Pairs</div>
            <div className="flex justify-end">
              <TokenPairIcons pairs={strategy.pairs} />
            </div>
          </div>
          <div className="h-12 w-px bg-white/5"></div>
          <div className="text-right">
            <div className="text-[10px] text-white/30 font-bold tracking-[0.2em] mb-2 uppercase">Profit Share</div>
            <div className="text-xl font-black font-mono text-white">{strategy.profitShare}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total ROI (%)', value: '+142.85%', sub: 'Since Genesis', color: 'text-[#10B981]', icon: 'trending_up' },
          { label: 'Total Profit ($)', value: '+$420,150', sub: 'Realized + Unr.', color: 'text-[#10B981]', icon: 'payments' },
          { label: 'Total Assets', value: '1.28M USDT', sub: 'AUM Value', color: 'text-white', icon: 'account_balance_wallet' },
        ].map((stat, i) => (
          <div key={i} className="bg-section-bg p-6 rounded-2xl border border-white/5 shadow-sm">
            <div className="text-[11px] font-bold text-white/40 tracking-wider mb-4 flex items-center gap-2 uppercase">
              <span className="material-symbols-outlined text-[16px]">{stat.icon}</span> {stat.label}
            </div>
            <div className={`text-3xl font-black font-mono ${stat.color}`}>{stat.value}</div>
            <div className="mt-2 text-[11px] text-white/30 font-mono uppercase tracking-widest">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-section-bg border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-base font-bold tracking-wide mb-1 flex items-center gap-2">
                  Strategy Performance 📈
                </h3>
                <p className="text-[11px] text-white/40 font-mono tracking-wider">
                  Cumulative Tracking ({viewMode === 'rate' ? '%' : 'USD'})
                </p>
              </div>
              <div className="flex gap-6 items-center">
                <div className="flex bg-main-bg p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setViewMode('rate')}
                    className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${viewMode === 'rate' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                  >
                    Profit Rate (%)
                  </button>
                  <button
                    onClick={() => setViewMode('amount')}
                    className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${viewMode === 'amount' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                  >
                    Profit Amount ($)
                  </button>
                </div>
                <div className="h-6 w-px bg-white/10"></div>
                <div className="flex bg-main-bg p-1 rounded-xl border border-white/5">
                  {['1w', '1m', 'all'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range as any)}
                      className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase ${timeRange === range ? 'bg-white/5 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                      {range === 'all' ? 'All' : range}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-[400px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF3E1D" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF3E1D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    interval={timeRange === '1m' ? 4 : 0}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#FF3E1D', fontWeight: 'bold' }}
                    formatter={(value: number) => [
                      viewMode === 'rate' ? `${value.toFixed(2)}%` : `$${value.toLocaleString()}`,
                      viewMode === 'rate' ? 'Profit Rate' : 'Profit Amount'
                    ]}
                  />
                  <Area type="monotone" dataKey="displayPnl" stroke="#FF3E1D" strokeWidth={3} fillOpacity={1} fill="url(#colorPnl)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-section-bg border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="border-b border-white/5 bg-white/[0.02] px-8">
              <div className="flex items-center gap-12">
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`py-5 text-[11px] font-bold tracking-[0.15em] border-b-2 uppercase transition-all ${activeTab === 'positions' ? 'border-primary-accent text-white' : 'border-transparent text-white/40 hover:text-white/60'}`}
                >
                  Current Positions 📊
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`py-5 text-[11px] font-bold tracking-[0.15em] border-b-2 uppercase transition-all ${activeTab === 'activity' ? 'border-primary-accent text-white' : 'border-transparent text-white/40 hover:text-white/60'}`}
                >
                  Activity Log 🕒
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                {activeTab === 'positions' ? (
                  <>
                    <thead>
                      <tr className="bg-white/[0.01] border-b border-white/5">
                        <th className="px-8 py-5 text-left text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Asset</th>
                        <th className="px-8 py-5 text-left text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Type</th>
                        <th className="px-8 py-5 text-right text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Entry Price</th>
                        <th className="px-8 py-5 text-right text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Current Price</th>
                        <th className="px-8 py-5 text-right text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">PnL (Unrealized)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mockPositions.map((pos, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${pos.asset.includes('BTC') ? 'bg-[#F7931A]' : 'bg-[#627EEA]'}`}>
                                {pos.icon}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white">{pos.asset}</div>
                                <div className="text-[10px] text-white/30 font-mono mt-0.5">Isolated {pos.leverage}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${pos.type === 'Long' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                              {pos.type}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right text-xs font-mono text-white/60">${pos.entryPrice.toLocaleString()}</td>
                          <td className="px-8 py-6 text-right text-xs font-mono text-white/90">${pos.currentPrice.toLocaleString()}</td>
                          <td className="px-8 py-6 text-right">
                            <div className="text-sm font-bold text-[#10B981] font-mono">+${pos.pnl.toLocaleString()}</div>
                            <div className="text-[10px] text-[#10B981]/60 font-mono mt-0.5">+{pos.pnlPercent}%</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead>
                      <tr className="bg-white/[0.01] border-b border-white/5">
                        <th className="px-8 py-5 text-left text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Time</th>
                        <th className="px-8 py-5 text-left text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Action</th>
                        <th className="px-8 py-5 text-left text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Asset</th>
                        <th className="px-8 py-5 text-right text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Amount</th>
                        <th className="px-8 py-5 text-right text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Price</th>
                        <th className="px-8 py-5 text-right text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mockActivity.map((act) => (
                        <tr key={act.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6 text-xs font-mono text-white/30">{act.time}</td>
                          <td className="px-8 py-6">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${act.type === 'Buy' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                              {act.type}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-sm font-bold text-white/80">{act.asset}</td>
                          <td className="px-8 py-6 text-right text-xs font-mono text-white/90">{act.amount}</td>
                          <td className="px-8 py-6 text-right text-xs font-mono text-white/60">${act.price.toLocaleString()}</td>
                          <td className="px-8 py-6 text-right">
                            <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-tighter">● {act.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
            <div className="p-5 border-t border-white/5 text-center bg-white/[0.01]">
              <button className="text-[10px] font-bold text-white/30 tracking-[0.2em] hover:text-primary-accent transition-all uppercase">
                {activeTab === 'positions' ? 'View All Positions 📄' : 'View Full History 📜'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-section-bg border border-white/5 rounded-3xl p-8 flex flex-col min-h-[600px] shadow-xl">
            <div className="flex items-center gap-5 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-primary-accent/10 border border-primary-accent/20 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-primary-accent text-3xl">psychology</span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white/90">Agent Strategy Profile 🧠</h3>
            </div>

            <div className="space-y-12 flex-1">
              <section>
                <h4 className="text-[11px] font-bold text-white/30 tracking-[0.2em] mb-6 flex items-center gap-3 uppercase">
                  <span className="w-2 h-2 bg-primary-accent rounded-full shadow-[0_0_8px_rgba(255,62,29,0.5)]"></span> Strategy Parameters
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    ...getTypeSpecificParams(strategy.type),
                    { label: 'Profit Share', value: strategy.profitShare },
                    { label: 'Latest Price', value: '$63,420.25' },
                    { label: 'Runtime', value: '142D 08H' },
                    { label: 'Position Side', value: <span className="text-primary-accent font-bold">Long/Short</span> },
                    { label: 'Initial Margin', value: '250,000 USDT' },
                  ].map((param, i) => (
                    <div key={i} className="bg-main-bg/50 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:border-white/10 transition-all shadow-sm">
                      <span className="text-[10px] text-white/30 tracking-[0.15em] font-bold uppercase">{param.label}</span>
                      <div className="text-sm font-mono font-bold text-white/90">{param.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[11px] font-bold text-white/30 tracking-[0.2em] mb-5 flex items-center gap-3 uppercase">
                  <span className="w-2 h-2 bg-primary-accent rounded-full shadow-[0_0_8px_rgba(255,62,29,0.5)]"></span> Logic Architecture
                </h4>
                <p className="text-[15px] leading-relaxed text-white/70 font-medium">
                  DeltaNeutral-9 utilizes a multi-layer neural network to identify market inefficiencies across major DEX/CEX pairs. It maintains a strictly neutral exposure through dynamic hedging, optimizing for risk-adjusted returns regardless of market direction.
                </p>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/30 font-bold tracking-[0.15em] uppercase">Strategy ID</span>
                <span className="text-[11px] font-mono text-white/60 tracking-wider">DN9-Alpha-827-02</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyDetail;
