
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Strategy, Trade } from '../types';

const mockStrategies: Strategy[] = [
  { id: 'snx', name: 'Sigma Arbitrage X', author: '@agent_alpha', version: 'v2.4.0', status: 'Active', roi: 12.4, profit: 14200, followers: '1,240', tradingDays: 142, icon: '🦾', pairs: ['BTC', 'USDC'], profitShare: '10%', type: 'Arbitrage', maxDrawdown: 4.2 },
  { id: 'ccln', name: 'Cross-Chain Liquidity Node', author: '@neuro_trader', version: 'v1.1.2', status: 'Active', roi: 34.8, profit: 42900, followers: '842', tradingDays: 84, icon: 'FOX', pairs: ['ETH', 'USDC'], profitShare: '20%', type: 'Grid', maxDrawdown: 12.5 },
  { id: 'hfmr', name: 'High-Freq Mean Reversion', author: '@grid_master', version: 'v0.9.5', status: 'Active', roi: 18.2, profit: 8450, followers: '2.1k', tradingDays: 312, icon: '🧬', pairs: ['SOL', 'USDC'], profitShare: '15%', type: 'Signal-based', maxDrawdown: 8.4 },
  { id: 'vwtf', name: 'Vol-Weighted Trend Follower', author: '@deep_agent', version: 'v3.0.1', status: 'Idle', roi: -1.2, profit: -2100, followers: '5.2k', tradingDays: 520, icon: '🐋', pairs: ['BTC', 'SOL'], profitShare: '10%', type: 'Momentum', maxDrawdown: 15.2 },
  { id: 'msv4', name: 'Momentum Sentinel v4', author: '@speed_demon', version: 'v4.1.0', status: 'Active', roi: 45.2, profit: 128400, followers: '12.4k', tradingDays: 842, icon: '⚡', pairs: ['ETH', 'BTC'], profitShare: '25%', type: 'Momentum', maxDrawdown: 18.2 },
  { id: 'lh', name: 'Liquidation Hunter', author: '@dark_pool', version: 'v0.2.1', status: 'Active', roi: 124.5, profit: 342000, followers: '3.1k', tradingDays: 45, icon: '🎯', pairs: ['SOL', 'ETH'], profitShare: '20%', type: 'Signal-based', maxDrawdown: 22.4 },
  { id: 'dna4', name: 'Neural Alpha-IV', author: '@gpt_trader', version: 'v1.0.0', status: 'Active', roi: 89.2, profit: 56400, followers: '4.8k', tradingDays: 156, icon: '🧠', pairs: ['ETH', 'USDC'], profitShare: '15%', type: 'Signal-based', maxDrawdown: 9.8 },
  { id: 'dca_m1', name: 'DCA Master', author: '@stacker', version: 'v2.1.0', status: 'Active', roi: 15.6, profit: 12300, followers: '1.5k', tradingDays: 420, icon: '🧱', pairs: ['BTC', 'ETH'], profitShare: '5%', type: 'DCA', maxDrawdown: 5.4 },
];

const mockTrades: Trade[] = [
  { id: '1', agent: '@agent_alpha', time: '2s ago', action: 'Buy', asset: '$BTC', amount: 0.45, price: 28140, status: 'Filled' },
  { id: '2', agent: '@speed_demon', time: '8s ago', action: 'Sell', asset: '$ETH', amount: 12.4, price: 32520, status: 'Filled' },
  { id: '3', agent: '@grid_master', time: '15s ago', action: 'Buy', asset: '$SOL', amount: 85.2, price: 12410, status: 'Filled' },
  { id: '4', agent: '@agent_alpha', time: '45s ago', action: 'Sell', asset: '$BTC', amount: 0.12, price: 28450, status: 'Filled' },
  { id: '5', agent: '@dark_pool', time: '1m ago', action: 'Buy', asset: '$SOL', amount: 1200, price: 123.5, status: 'Filled' },
];

const StrategyHub: React.FC = () => {
  const [showTrades, setShowTrades] = useState(true);
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [sortBy, setSortBy] = useState<'roi' | 'profit' | 'followers'>('roi');
  const [filterType, setFilterType] = useState<string>('All');

  const strategyTypes = ['All', 'Grid', 'DCA', 'Martingale', 'Momentum', 'Arbitrage', 'Signal-based'];

  // Parse followers string (e.g., '1.2k' -> 1200)
  const parseFollowers = (val: string) => {
    const num = parseFloat(val.replace(/[kK]/g, ''));
    return val.toLowerCase().includes('k') ? num * 1000 : num;
  };

  const sortedStrategies = [...mockStrategies]
    .filter(s => filterType === 'All' || s.type === filterType)
    .sort((a, b) => {
      if (sortBy === 'roi') return b.roi - a.roi;
      if (sortBy === 'profit') return b.profit - a.profit;
      if (sortBy === 'followers') return parseFollowers(b.followers) - parseFollowers(a.followers);
      return 0;
    });

  // Simulate real-time trades
  useEffect(() => {
    const assets = ['$BTC', '$ETH', '$SOL', '$LINK', '$AVAX'];
    const agents = ['@agent_alpha', '@speed_demon', '@grid_master', '@dark_pool', '@neuro_trader'];

    const interval = setInterval(() => {
      const newTrade: Trade = {
        id: Date.now().toString(),
        agent: agents[Math.floor(Math.random() * agents.length)],
        time: 'Just now',
        action: Math.random() > 0.5 ? 'Buy' : 'Sell',
        asset: assets[Math.floor(Math.random() * assets.length)],
        amount: Math.floor(Math.random() * 1000) / 10,
        price: Math.floor(Math.random() * 50000),
        status: 'Filled'
      };

      setTrades(prev => [newTrade, ...prev.slice(0, 19)]); // Keep last 20 trades
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const TradeTicker = () => {
    // Group trades into rows of 4 to show more items per line compactly
    const groupedTrades: Trade[][] = [];
    const itemsPerRow = 4;
    for (let i = 0; i < trades.length; i += itemsPerRow) {
      groupedTrades.push(trades.slice(i, i + itemsPerRow));
    }

    // Duplicate for smooth vertical marquee
    const displayGroups = [...groupedTrades, ...groupedTrades];

    return (
      <div className="fixed bottom-0 left-0 right-0 h-11 bg-section-bg/95 backdrop-blur-md border-t border-white/10 z-[100] flex items-center overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 px-6 border-r border-white/5 h-full bg-section-bg z-10 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Latest Trades 📡</span>
        </div>
        <div className="flex-1 overflow-hidden relative group h-full">
          <div className="flex flex-col animate-marquee-vertical items-start h-full">
            {displayGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="flex items-center h-11 w-full divide-x divide-white/5 shrink-0">
                {group.map((trade, idx) => (
                  <div key={`${trade.id}-${idx}`} className="flex items-center gap-4 h-full px-4 flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-white/30 font-mono truncate w-20 shrink-0">{trade.agent}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase border ${trade.action === 'Buy'
                        ? 'bg-green-500/10 text-[#10B981] border-green-500/10'
                        : 'bg-red-500/10 text-[#EF4444] border-red-500/10'
                        }`}>
                        {trade.action}
                      </span>
                      <span className="text-[11px] font-black text-white/90 font-mono">{trade.asset}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                      <span className="text-[11px] font-black text-white/70 font-mono">{trade.amount}</span>
                      <span className="text-[9px] text-white/20 font-mono">@ ${trade.price.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Vertical Fade gradients */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-section-bg to-transparent z-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-section-bg to-transparent z-10 pointer-events-none"></div>
        </div>
      </div>
    );
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
        className="w-5 h-5 rounded-full ring-2 ring-card-bg bg-card-bg object-contain"
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

  return (
    <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        <div className="flex-1 w-full">
          {/* Header Row */}
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tighter text-white mb-2">
              Trending Strategies 📈
            </h2>
            <p className="text-white/40 text-sm font-medium">Discover and copy top performing AI trading agents</p>
          </div>

          <div className="flex flex-col gap-6 mb-10">
            {/* Filter & Sort Controls Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                {strategyTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${filterType === type
                      ? 'bg-primary-accent border-primary-accent text-white shadow-lg shadow-primary-accent/20'
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {/* Sort Filter Dropdown */}
                <div className="relative group">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-card-bg border border-white/10 text-[11px] font-bold text-white/80 px-4 py-2 rounded-xl outline-none appearance-none hover:bg-white/10 hover:border-white/20 transition-all pr-9 cursor-pointer min-w-[120px]"
                  >
                    <option value="roi" className="bg-card-bg">Rank: ROI</option>
                    <option value="profit" className="bg-card-bg">Rank: Profit</option>
                    <option value="followers" className="bg-card-bg">Rank: Followers</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-white/20 pointer-events-none group-hover:text-white/40 transition-colors">
                    unfold_more
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  <button className="px-4 py-1.5 text-[11px] font-bold text-white/40 hover:text-white transition-colors">7d</button>
                  <button className="px-4 py-1.5 text-[11px] font-bold bg-white/10 text-white rounded-lg">30d</button>
                  <button className="px-4 py-1.5 text-[11px] font-bold text-white/40 hover:text-white transition-colors">All</button>
                </div>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-300`}>
            {sortedStrategies.map((strat) => (
              /* ... strategy cards ... */
              <Link
                to={`/strategy/${strat.id}`}
                key={strat.id}
                className="bg-card-bg rounded-2xl p-6 border border-white/5 hover:border-primary-accent/30 transition-all cursor-pointer group shadow-xl flex flex-col"
              >
                {/* ... existing card content ... */}
                <div className="flex items-center justify-between mb-6">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-[16px] leading-tight truncate tracking-tight mb-2">{strat.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-3">
                      <span className="text-[11px] text-white/40 font-mono truncate">{strat.author}</span>
                      <div className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-primary-accent/80 uppercase tracking-tight">{strat.type}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-0.5">Profit Share</div>
                    <div className="text-[13px] font-black text-white font-mono">{strat.profitShare}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/5 pt-8 mt-auto">
                  <div className="flex flex-col col-span-1">
                    <div className="text-[9px] text-white/30 font-bold mb-1.5 tracking-widest uppercase">PnL Performance</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-black font-mono leading-none ${strat.roi >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {strat.roi >= 0 ? '+' : ''}{strat.roi}%
                      </span>
                      <span className={`text-[11px] font-bold font-mono ${strat.profit >= 0 ? 'text-white/50' : 'text-[#EF4444]/50'}`}>
                        {strat.profit >= 0 ? '+$' : '-$'}{Math.abs(strat.profit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col text-right">
                    <div className="text-[9px] text-white/30 font-bold mb-1 tracking-widest uppercase">Max Drawdown</div>
                    <div className="text-xl font-black font-mono leading-none text-white/80">
                      {strat.maxDrawdown}%
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[9px] text-white/30 font-bold mb-1 tracking-widest uppercase">Followers</div>
                    <div className="flex items-center gap-1.5 font-bold text-white/70 font-mono text-[13px] leading-none">
                      <span className="material-symbols-outlined text-white/30 text-[14px]">group</span>
                      {strat.followers}
                    </div>
                  </div>
                  <div className="flex flex-col text-right">
                    <div className="text-[9px] text-white/30 font-bold mb-1 tracking-widest uppercase">Trading Pairs</div>
                    <div className="flex justify-end">
                      <TokenPairIcons pairs={strat.pairs} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <TradeTicker />
    </div>
  );
};

export default StrategyHub;
