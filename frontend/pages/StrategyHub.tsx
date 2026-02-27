
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Strategy, Trade } from '../types';
import { getTrendingStrategies, TrendingCategory } from '../api';

const TARGET_ASSETS = ['BTC', 'ETH', 'SOL', 'DOGE'] as const;
const BINANCE_STREAM_SYMBOLS = TARGET_ASSETS.map((asset) => `${asset.toLowerCase()}usdt`);
const BINANCE_STREAM_URL = `wss://stream.binance.com:9443/stream?streams=${BINANCE_STREAM_SYMBOLS.map(symbol => `${symbol}@trade`).join('/')}`;
const UI_UPDATE_INTERVAL_MS = 2000;
type StrategyPeriod = '7d' | '30d' | 'all';
const CATEGORY_OPTIONS: Array<{ label: string; value: TrendingCategory }> = [
  { label: 'All', value: 'all' },
  { label: 'Grid', value: 'grid' },
  { label: 'DCA', value: 'dca' },
  { label: 'Momentum', value: 'momentum' },
  { label: 'Signal-based', value: 'signal-based' },
];

const createPlaceholderTrade = (asset: string): Trade => ({
  id: `placeholder-${asset}`,
  agent: '@binance',
  time: 'Live',
  action: 'Buy',
  asset: `$${asset}`,
  amount: 0,
  price: 0,
  status: 'Loading',
});

const StrategyHub: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>(() => TARGET_ASSETS.map((asset) => createPlaceholderTrade(asset)));
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isStrategiesLoading, setIsStrategiesLoading] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'roi' | 'profit' | 'followers'>('roi');
  const [category, setCategory] = useState<TrendingCategory>('all');
  const [period, setPeriod] = useState<StrategyPeriod>('30d');
  const lastPriceByAssetRef = useRef<Record<string, number>>({});
  const pendingTradesByAssetRef = useRef<Record<string, Trade>>({});
  const latestTradesByAssetRef = useRef<Record<string, Trade>>({});

  // Parse followers string (e.g., '1.2k' -> 1200)
  const parseFollowers = (val: string) => {
    const num = parseFloat(val.replace(/[kK]/g, ''));
    return val.toLowerCase().includes('k') ? num * 1000 : num;
  };

  const sortedStrategies = [...strategies]
    .sort((a, b) => {
      if (sortBy === 'roi') return b.roi - a.roi;
      if (sortBy === 'profit') return b.profit - a.profit;
      if (sortBy === 'followers') return parseFollowers(b.followers) - parseFollowers(a.followers);
      return 0;
    });

  useEffect(() => {
    let cancelled = false;
    const rankBy = sortBy === 'profit' ? 'pnl' : sortBy;
    const formatCategoryLabel = (value: unknown): string => {
      if (typeof value !== 'string' || !value.trim()) return 'Signal-based';
      const normalized = value.trim().toLowerCase();
      if (normalized === 'signal-based') return 'Signal-based';
      if (normalized === 'dca') return 'DCA';
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    const toNumber = (value: unknown, fallback = 0): number => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return fallback;
    };

    const toPairs = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.map(String).map((it) => it.toUpperCase());
      }
      if (typeof value === 'string') {
        return value
          .split(/[\/,_\-\s]+/)
          .map((it) => it.trim().toUpperCase())
          .filter(Boolean)
          .slice(0, 2);
      }
      return ['BTC', 'USDT'];
    };

    const formatFollowers = (value: number): string => {
      if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
      return Math.round(value).toString();
    };

    const formatProfitShare = (value: unknown): string => {
      if (typeof value === 'string') return value.includes('%') ? value : `${value}%`;
      if (typeof value === 'number' && Number.isFinite(value)) {
        const pct = value <= 1 ? value * 100 : value;
        return `${pct.toFixed(0)}%`;
      }
      return '10%';
    };

    const loadStrategies = async () => {
      setIsStrategiesLoading(true);
      try {
        const res = await getTrendingStrategies({
          category,
          period,
          rank_by: rankBy,
          order: 'desc',
          limit: 50,
          offset: 0,
        });
        const rawList = Array.isArray(res.data) ? res.data : [];

        const mapped: Strategy[] = rawList.map((item, idx) => {
          const rawStrategyName = typeof item.strategy === 'string' && item.strategy.trim() ? item.strategy : '';
          const name =
            typeof item.name === 'string' && item.name.trim()
              ? item.name
              : rawStrategyName
                ? rawStrategyName
                : `Strategy #${idx + 1}`;
          const idBase =
            rawStrategyName ||
            (typeof item.strategy_id === 'string' ? item.strategy_id : typeof item.id === 'string' ? item.id : name);
          const id = idBase.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
          const followersNum = toNumber(item.followers, 0);
          const pnl = toNumber(item.pnl, 0);
          const roi = toNumber(item.roi, 0);

          return {
            id,
            name,
            author: typeof item.author === 'string' && item.author.trim() ? item.author : '@unknown',
            version: typeof item.version === 'string' && item.version.trim() ? item.version : 'v1.0.0',
            status: item.status === 'Idle' ? 'Idle' : 'Active',
            roi,
            profit: pnl,
            followers: formatFollowers(followersNum),
            tradingDays: toNumber(item.trading_days, period === '7d' ? 7 : period === '30d' ? 30 : 365),
            icon: '🧠',
            pairs: toPairs(item.pairs),
            profitShare: formatProfitShare(item.profit_share),
            type:
              typeof item.type === 'string' && item.type.trim()
                ? item.type
                : item.category
                  ? formatCategoryLabel(item.category)
                : rawStrategyName
                  ? rawStrategyName
                  : 'Signal-based',
            maxDrawdown: toNumber(item.max_drawdown, 0),
          };
        });

        if (!cancelled) {
          setStrategies(mapped);
        }
      } catch (error) {
        console.error('Failed to load trending strategies:', error);
        if (!cancelled) {
          setStrategies([]);
        }
      } finally {
        if (!cancelled) {
          setIsStrategiesLoading(false);
        }
      }
    };

    loadStrategies();
    return () => {
      cancelled = true;
    };
  }, [period, sortBy, category]);

  // Subscribe to Binance public trades stream for real-time ticker data
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let manuallyClosed = false;

    const loadInitialPrices = async () => {
      try {
        const symbols = encodeURIComponent(JSON.stringify(BINANCE_STREAM_SYMBOLS.map((symbol) => symbol.toUpperCase())));
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${symbols}`);
        if (!res.ok) return;

        const rows = (await res.json()) as Array<{ symbol: string; price: string }>;
        const mapped: Record<string, Trade> = {};

        for (const row of rows) {
          const symbol = row.symbol.toUpperCase();
          const baseAsset = symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol;
          const price = Number.parseFloat(row.price);
          if (!TARGET_ASSETS.includes(baseAsset as (typeof TARGET_ASSETS)[number])) continue;
          if (!Number.isFinite(price)) continue;

          lastPriceByAssetRef.current[baseAsset] = price;
          mapped[baseAsset] = {
            id: `snapshot-${baseAsset}`,
            agent: '@binance',
            time: 'Live',
            action: 'Buy',
            asset: `$${baseAsset}`,
            amount: 0,
            price: Number(price.toFixed(6)),
            status: 'Filled',
          };
        }

        latestTradesByAssetRef.current = mapped;
        setTrades(TARGET_ASSETS.map((asset) => mapped[asset] ?? createPlaceholderTrade(asset)));
      } catch (error) {
        console.error('Failed to load initial Binance prices:', error);
      }
    };

    const connect = () => {
      socket = new WebSocket(BINANCE_STREAM_URL);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            data?: {
              s?: string;
              t?: number;
              p?: string;
              q?: string;
              T?: number;
              m?: boolean;
            };
          };

          const trade = payload.data;
          if (!trade?.s || !trade.p || !trade.q) return;

          const price = Number.parseFloat(trade.p);
          const amount = Number.parseFloat(trade.q);
          if (!Number.isFinite(price) || !Number.isFinite(amount)) return;

          const symbol = trade.s.toUpperCase();
          const baseAsset = symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol;
          if (!TARGET_ASSETS.includes(baseAsset as (typeof TARGET_ASSETS)[number])) return;
          const previousPrice = lastPriceByAssetRef.current[baseAsset];
          const action: Trade['action'] = previousPrice !== undefined && price < previousPrice ? 'Sell' : 'Buy';
          lastPriceByAssetRef.current[baseAsset] = price;

          pendingTradesByAssetRef.current[baseAsset] = {
            id: String(trade.t ?? Date.now()),
            agent: '@binance',
            time: trade.T ? new Date(trade.T).toLocaleTimeString() : 'Live',
            action,
            asset: `$${baseAsset}`,
            amount: Number(amount.toFixed(4)),
            price: Number(price.toFixed(2)),
            status: 'Filled',
          };
        } catch (error) {
          console.error('Failed to parse Binance trade message:', error);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (manuallyClosed) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    flushTimer = setInterval(() => {
      const pending = pendingTradesByAssetRef.current;
      const keys = Object.keys(pending);
      if (keys.length === 0) return;

      latestTradesByAssetRef.current = {
        ...latestTradesByAssetRef.current,
        ...pending,
      };
      pendingTradesByAssetRef.current = {};

      setTrades(TARGET_ASSETS.map((asset) => latestTradesByAssetRef.current[asset] ?? createPlaceholderTrade(asset)));
    }, UI_UPDATE_INTERVAL_MS);

    loadInitialPrices();
    connect();

    return () => {
      manuallyClosed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (flushTimer) clearInterval(flushTimer);
      socket?.close();
    };
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
                  <div key={`${trade.id}-${idx}`} className="flex items-center gap-2.5 h-full px-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase border ${trade.status === 'Loading'
                        ? 'bg-white/5 text-white/40 border-white/10'
                        : trade.action === 'Buy'
                          ? 'bg-green-500/10 text-[#10B981] border-green-500/10'
                          : 'bg-red-500/10 text-[#EF4444] border-red-500/10'
                        }`}>
                        {trade.status === 'Loading' ? 'Live' : trade.action}
                      </span>
                      <span className="text-[11px] font-black text-white/90 font-mono">{trade.asset}</span>
                    </div>
                    <div className="flex items-center shrink-0">
                      <span className="text-[10px] font-black text-white font-mono">
                        {trade.status === 'Loading' ? '--' : `$${trade.price.toLocaleString()}`}
                      </span>
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
          <div key={`${symbol}-${idx}`}>
            <TokenIcon symbol={symbol} />
          </div>
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
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCategory(option.value)}
                    className={`px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${category === option.value
                      ? 'bg-primary-accent border-primary-accent text-white shadow-lg shadow-primary-accent/20'
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    {option.label}
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
                  <button
                    onClick={() => setPeriod('7d')}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${period === '7d' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setPeriod('30d')}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${period === '30d' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                  >
                    30d
                  </button>
                  <button
                    onClick={() => setPeriod('all')}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${period === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isStrategiesLoading ? (
            <div className="w-full py-16 flex items-center justify-center">
              <div className="flex items-center gap-3 text-white/60 text-sm font-semibold">
                <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-primary-accent rounded-full animate-spin"></span>
                Loading strategies...
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
      <TradeTicker />
    </div>
  );
};

export default StrategyHub;
