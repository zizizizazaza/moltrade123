
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getStrategyDetail, getStrategyPerformance, StrategyDetailResponse, StrategyPerformanceResponse } from '../api';

const REFRESH_INTERVAL_MS = 10000;

const StrategyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'positions' | 'activity'>('positions');
  const [viewMode, setViewMode] = useState<'rate' | 'amount'>('rate');
  const [timeRange, setTimeRange] = useState<'1w' | '1m' | 'all'>('1m');
  const [detail, setDetail] = useState<StrategyDetailResponse | null>(null);
  const [performance, setPerformance] = useState<StrategyPerformanceResponse | null>(null);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async (showLoading: boolean) => {
      if (showLoading) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const res = await getStrategyDetail(id, { period: '30d', activity_limit: 20 });
        if (!cancelled) setDetail(res);
      } catch (err) {
        if (!cancelled && showLoading) setError(err instanceof Error ? err.message : 'Failed to load strategy detail');
      } finally {
        if (!cancelled && showLoading) setIsLoading(false);
      }
    };

    load(true);
    const timer = setInterval(() => {
      load(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const metric = viewMode === 'rate' ? 'roi' : 'pnl';

    const loadPerformance = async (showLoading: boolean) => {
      if (showLoading) setIsPerformanceLoading(true);
      try {
        const res = await getStrategyPerformance(id, {
          period: timeRange,
          metric,
          interval: '1d',
        });
        if (!cancelled) setPerformance(res);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load strategy performance:', err);
          if (showLoading) setPerformance(null);
        }
      } finally {
        if (!cancelled && showLoading) setIsPerformanceLoading(false);
      }
    };

    loadPerformance(true);
    const timer = setInterval(() => {
      loadPerformance(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, timeRange, viewMode]);

  const formatCategoryLabel = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized === 'signal-based') return 'Signal-based';
    if (normalized === 'dca') return 'DCA';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const strategyName = detail?.overview.strategy ? formatCategoryLabel(detail.overview.strategy) : (id || 'Strategy');
  const strategyType = detail?.overview.category ? formatCategoryLabel(detail.overview.category) : 'Signal-based';
  const strategyPairs = useMemo(() => {
    const fromPositions = (detail?.current_positions || [])
      .map((pos) => pos.asset.split('/').map((x) => x.toUpperCase()))
      .flat()
      .filter(Boolean);
    const unique = Array.from(new Set(fromPositions));
    return unique.length > 0 ? unique.slice(0, 2) : ['BTC', 'USDT'];
  }, [detail]);
  const profitShareText = `${(detail?.overview.profit_share ?? 0).toFixed(1)}%`;

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
          <div key={`${symbol}-${idx}`}>
            <TokenIcon symbol={symbol} />
          </div>
        ))}
      </div>
    );
  };

  const chartData = useMemo(() => {
    const points = performance?.points || [];
    const buildFallbackPoints = () => {
      const count = timeRange === '1w' ? 7 : timeRange === '1m' ? 30 : 12;
      const now = new Date();
      return Array.from({ length: count }, (_, idx) => {
        const d = new Date(now);
        if (timeRange === 'all') {
          d.setMonth(now.getMonth() - (count - 1 - idx));
        } else {
          d.setDate(now.getDate() - (count - 1 - idx));
        }
        return { ts: d.toISOString(), value: 0 };
      });
    };
    const normalizedPoints = points.length > 0 ? points : buildFallbackPoints();
    return normalizedPoints.map((point) => {
      const date = new Date(point.ts);
      const label =
        timeRange === 'all'
          ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : timeRange === '1m'
            ? date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
            : date.toLocaleDateString(undefined, { weekday: 'short' });
      return {
        name: label,
        ts: point.ts,
        displayPnl: point.value,
      };
    });
  }, [performance, timeRange]);

  const yAxisDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [-1, 1];
    const values = chartData.map((d) => d.displayPnl);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      const padding = Math.abs(min) < 1 ? 1 : Math.abs(min) * 0.1;
      return [min - padding, max + padding];
    }
    return [min, max];
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="w-full py-16 flex items-center justify-center">
          <div className="flex items-center gap-3 text-white/60 text-sm font-semibold">
            <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-primary-accent rounded-full animate-spin"></span>
            Loading strategy detail...
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="bg-section-bg border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/70 text-sm">{error || 'Strategy detail not found'}</p>
          <Link to="/strategy" className="inline-block mt-4 text-primary-accent hover:underline text-sm">
            Back to strategies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-white/40 text-[11px] font-semibold tracking-wide mb-8">
        <Link to="/strategy" className="hover:text-white transition-colors">Strategies</Link>
        <span>/</span>
        <span className="text-white">{strategyName} Detail</span>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-10">
        <div className="flex items-center gap-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-black tracking-tight">{strategyName}</h1>
              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 uppercase tracking-widest">{strategyType}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/40 font-mono">By <span className="text-white/80">@system</span></span>
              <span className="text-white/10">•</span>
              <span className="text-[11px] text-white/40 font-bold tracking-[0.2em]">RUNTIME {detail.overview.runtime_days ?? 0}D</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-12">
          <div className="text-right">
            <div className="text-[10px] text-white/30 font-bold tracking-[0.2em] mb-3 uppercase">Trading Pairs</div>
            <div className="flex justify-end">
              <TokenPairIcons pairs={strategyPairs} />
            </div>
          </div>
          <div className="h-12 w-px bg-white/5"></div>
          <div className="text-right">
            <div className="text-[10px] text-white/30 font-bold tracking-[0.2em] mb-2 uppercase">Profit Share</div>
            <div className="text-xl font-black font-mono text-white">{profitShareText}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          {
            label: 'Total ROI (%)',
            value: `${(detail.overview.total_roi ?? 0) >= 0 ? '+' : ''}${(detail.overview.total_roi ?? 0).toFixed(2)}%`,
            sub: 'Since Genesis',
            color: (detail.overview.total_roi ?? 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]',
            icon: 'trending_up',
          },
          {
            label: 'Total Profit ($)',
            value: `${(detail.overview.total_profit ?? 0) >= 0 ? '+$' : '-$'}${Math.abs(detail.overview.total_profit ?? 0).toLocaleString()}`,
            sub: 'Realized + Unr.',
            color: (detail.overview.total_profit ?? 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]',
            icon: 'payments',
          },
          {
            label: 'Total Assets',
            value: `$${(detail.overview.total_assets ?? 0).toLocaleString()}`,
            sub: 'AUM Value',
            color: 'text-white',
            icon: 'account_balance_wallet',
          },
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
              {isPerformanceLoading ? (
                <div className="h-full flex items-center justify-center text-white/60 text-sm font-semibold">
                  <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-primary-accent rounded-full animate-spin mr-3"></span>
                  Loading performance...
                </div>
              ) : (
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
                    <YAxis hide domain={yAxisDomain} />
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
              )}
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
                      {detail.current_positions.map((pos, i) => {
                        const pnlPctRaw = pos.entry_price ? ((pos.current_price - pos.entry_price) / pos.entry_price) * 100 : 0;
                        const pnlPct = pos.side.toLowerCase() === 'short' ? -pnlPctRaw : pnlPctRaw;
                        const pnlColor = pos.unrealized_pnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]';
                        const side = pos.side.toLowerCase();
                        const sideClass =
                          side === 'long'
                            ? 'bg-green-500/10 text-green-500'
                            : side === 'short'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-white/10 text-white/60';
                        return (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${pos.asset.includes('BTC') ? 'bg-[#F7931A]' : 'bg-[#627EEA]'}`}>
                                {pos.asset.split('/')[0]}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white">{pos.asset}</div>
                                <div className="text-[10px] text-white/30 font-mono mt-0.5">Amount {pos.amount}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${sideClass}`}>
                              {pos.side}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right text-xs font-mono text-white/60">${pos.entry_price.toLocaleString()}</td>
                          <td className="px-8 py-6 text-right text-xs font-mono text-white/90">${pos.current_price.toLocaleString()}</td>
                          <td className="px-8 py-6 text-right">
                            <div className={`text-sm font-bold font-mono ${pnlColor}`}>
                              {pos.unrealized_pnl >= 0 ? '+$' : '-$'}{Math.abs(pos.unrealized_pnl).toLocaleString()}
                            </div>
                            <div className={`text-[10px] font-mono mt-0.5 ${pnlColor}`}>
                              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                        );
                      })}
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
                      {detail.activity_logs.map((act) => {
                        const action = act.action.toLowerCase();
                        const actionClass =
                          action === 'long' || action === 'buy'
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : action === 'short' || action === 'sell'
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : 'bg-white/10 text-white/60 border-white/20';
                        return (
                          <tr key={act.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-8 py-6 text-xs font-mono text-white/30">{new Date(act.created_at).toLocaleString()}</td>
                            <td className="px-8 py-6">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${actionClass}`}>
                                {act.action}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-sm font-bold text-white/80">{act.asset}</td>
                            <td className="px-8 py-6 text-right text-xs font-mono text-white/90">{act.amount.toLocaleString()}</td>
                            <td className="px-8 py-6 text-right text-xs font-mono text-white/60">${act.price.toLocaleString()}</td>
                            <td className="px-8 py-6 text-right">
                              <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-tighter">● {act.status}</span>
                            </td>
                          </tr>
                        );
                      })}
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
                    ...getTypeSpecificParams(strategyType),
                    { label: 'Profit Share', value: profitShareText },
                    { label: 'Latest Price', value: `$${(detail.overview.latest_price ?? 0).toLocaleString()}` },
                    { label: 'Runtime', value: `${detail.overview.runtime_days ?? 0}D` },
                    { label: 'Trading Frequency', value: detail.overview.trading_frequency || 'N/A' },
                    { label: 'Win Rate', value: `${(detail.overview.win_rate ?? 0).toFixed(1)}%` },
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
                  Strategy detail now comes from backend live data. This section can be upgraded later to render strategy-specific narrative from server-side metadata.
                </p>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/30 font-bold tracking-[0.15em] uppercase">Strategy ID</span>
                <span className="text-[11px] font-mono text-white/60 tracking-wider">{id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyDetail;
