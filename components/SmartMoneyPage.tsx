import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSmartMoneyHub, fetchWalletPositions, startCopyTrading, SmartMoneyWalletItem, WalletPositionItem } from '../api';
import Tooltip from './Tooltip';
import ConfirmModal from './ConfirmModal';

const CATEGORIES = [
  { key: '', label: 'All', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> },
  { key: 'CRYPTO', label: 'Crypto', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: 'POLITICS', label: 'Politics', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg> },
  { key: 'SPORTS', label: 'Sports', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: 'CULTURE', label: 'Culture', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: 'WEATHER', label: 'Weather', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg> },
  { key: 'ECONOMICS', label: 'Economics', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  { key: 'TECH', label: 'Tech', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { key: 'FINANCE', label: 'Finance', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> },
];

const TIME_PERIODS = [
  { key: 'WEEK', label: 'Week' },
  { key: 'MONTH', label: 'Month' },
  { key: 'DAY', label: 'Day' },
  { key: 'ALL', label: 'All Time' },
];

const ORDER_OPTIONS = [
  { key: 'PNL', label: 'PNL' },
  { key: 'VOLUME', label: 'VOLUME' },
] as const;

const getAvatarGradient = (wallet: string) => {
  return 'from-black to-gray-900';
};

function shortenAddr(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const SmartMoneyPage: React.FC = () => {
  const navigate = useNavigate();

  // Filters
  const [category, setCategory] = useState('');
  const [timePeriod, setTimePeriod] = useState('WEEK');
  const [orderBy, setOrderBy] = useState('PNL');

  // Data
  const [wallets, setWallets] = useState<SmartMoneyWalletItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom address
  const [customAddr, setCustomAddr] = useState('');
  const [customPositions, setCustomPositions] = useState<WalletPositionItem[] | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Copy modal
  const [copyTarget, setCopyTarget] = useState<{ wallet: string; name: string } | null>(null);
  const [copyDryRun, setCopyDryRun] = useState(true);
  const [copyRatio, setCopyRatio] = useState(100);
  const [copyFixed, setCopyFixed] = useState(false);
  const [copyFixedAmt, setCopyFixedAmt] = useState(100);
  const [copySlippage, setCopySlippage] = useState(30);
  const [copySpendLimit, setCopySpendLimit] = useState(5000);
  const [copySubmitting, setCopySubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSmartMoneyHub({
        limit: 50,
        category: category || undefined,
        time_period: timePeriod,
        order_by: orderBy,
      });
      setWallets(data.wallets || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [category, timePeriod, orderBy]);

  useEffect(() => { void loadWallets(); }, [loadWallets]);

  const lookupCustomAddr = async () => {
    const addr = customAddr.trim();
    if (!addr || !addr.startsWith('0x')) {
      setCustomError('Please enter a valid 0x address');
      return;
    }
    setCustomLoading(true);
    setCustomError(null);
    setCustomPositions(null);
    try {
      const data = await fetchWalletPositions(addr, 20);
      setCustomPositions(data.positions || []);
      if (!data.positions?.length) setCustomError('No positions found for this address.');
    } catch (e: unknown) {
      setCustomError(e instanceof Error ? e.message : String(e));
    } finally {
      setCustomLoading(false);
    }
  };

  const handleCopyConfirm = async () => {
    if (!copyTarget) return;
    setCopySubmitting(true);
    try {
      const ratio = copyFixed ? 1 : copyRatio / 100;
      const maxPerTrade = copyFixed ? copyFixedAmt : copySpendLimit;
      const result = await startCopyTrading({
        source_wallet: copyTarget.wallet,
        market_id: null,
        side: 'AUTO',
        copy_ratio: ratio,
        max_per_trade_usd: maxPerTrade,
        min_trade_size_usd: 5,
        slippage_max: copySlippage / 100,
        daily_risk_budget_usd: copySpendLimit,
        dry_run: copyDryRun,
      });
      setCopySuccess(`${copyDryRun ? 'Dry-run' : 'Live'} task created: ${result.task_id}`);
      setCopyTarget(null);
      setTimeout(() => { navigate('/copytrade'); }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setCopyTarget(null);
    } finally {
      setCopySubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10 flex flex-col xl:flex-row items-start gap-8 min-h-screen animate-fadeIn">
      
      {/* LEFT SIDEBAR (Sticky) */}
      <div className="w-full xl:w-64 shrink-0 xl:sticky xl:top-[100px] xl:max-h-[calc(100vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-6 bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm z-10">
        
        {/* Categories */}
        <div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Categories</h3>
          <div className="flex flex-col gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-left ${
                  category === cat.key
                    ? 'bg-black text-[#c3ff00] shadow-md'
                    : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-black'
                }`}
              >
                <div className={`flex items-center justify-center shrink-0 w-6 h-6 transition-colors ${category === cat.key ? 'text-[#c3ff00]' : 'text-gray-400 group-hover:text-black'}`}>
                  {cat.icon}
                </div>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-gray-100 w-full" />

        {/* Time Filter */}
        <div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Time Period</h3>
          <div className="grid grid-cols-2 gap-2">
            {TIME_PERIODS.map((tp) => (
              <button
                key={tp.key}
                onClick={() => setTimePeriod(tp.key)}
                className={`px-3 py-2.5 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all ${
                  timePeriod === tp.key
                    ? 'bg-black text-white shadow-sm ring-1 ring-black'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {tp.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-gray-100 w-full" />

        {/* Sort Filter */}
        <div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Sort By</h3>
          <div className="grid grid-cols-2 gap-2">
            {ORDER_OPTIONS.map((ord) => (
              <button
                key={ord.key}
                onClick={() => setOrderBy(ord.key)}
                className={`px-3 py-2.5 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all ${
                  orderBy === ord.key
                    ? 'bg-black text-white shadow-sm ring-1 ring-black'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {ord.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT MAIN CONTENT */}
      <div className="flex-1 space-y-8 min-w-0 min-h-[1000px]">
        
        {/* Premium Hero Section */}
        <div className="relative rounded-[32px] overflow-hidden bg-[#0A0A0A] text-white p-8 md:p-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          
          {/* Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-900/20 via-black to-[#c3ff00]/10 pointer-events-none" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#c3ff00]/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 flex-1 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black tracking-widest text-[#c3ff00] uppercase shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c3ff00] shadow-[0_0_8px_#c3ff00] animate-pulse" />
              Live Marketplace
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.1]">
              Smart Money <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c3ff00] to-green-400">Hub</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Discover the most profitable traders across prediction markets. Follow top wallets to automatically copy their winning trades in real-time.
            </p>
          </div>

          {/* Custom Address Input (Hero embedded) */}
          <div className="relative z-10 w-full xl:w-[460px] bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[24px] shadow-2xl">
            <label className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">
              Follow Custom Address
              <div className="relative group cursor-help">
                 <span className="opacity-50 group-hover:opacity-100 transition-opacity">ⓘ</span>
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl text-center pointer-events-none normal-case font-normal border border-white/20">
                   Enter any Polymarket wallet address (0x...) to view their positions and mimic their trades.
                 </div>
              </div>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAddr}
                onChange={(e) => setCustomAddr(e.target.value)}
                placeholder="0x123...abcd"
                className="flex-1 w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-[#c3ff00]/50 focus:ring-1 focus:ring-[#c3ff00]/50 transition-all shadow-inner"
              />
              <button
                onClick={() => void lookupCustomAddr()}
                disabled={customLoading || !customAddr.trim()}
                className="px-6 py-3.5 rounded-xl bg-[#c3ff00] text-black text-sm font-black tracking-wider hover:bg-[#b0e600] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(195,255,0,0.2)]"
              >
                {customLoading ? '...' : 'Lookup'}
              </button>
            </div>
            {customError && <p className="text-xs text-red-400 font-medium px-1 mt-3">{customError}</p>}
            
            {customPositions && customPositions.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{customPositions.length} Positions</span>
                  <button
                    onClick={() => setCopyTarget({ wallet: customAddr.trim(), name: shortenAddr(customAddr.trim()) })}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wider transition-colors border border-white/10"
                  >
                    📋 COPY THIS WALLET
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 select-none">
                  {customPositions.slice(0, 5).map((pos, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-black/40 rounded-lg text-xs border border-white/5">
                      <span className="text-gray-300 font-medium truncate pr-4">{pos.title || pos.condition_id}</span>
                      <span className={`font-black ${Number(pos.cash_pnl ?? 0) >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                        {Number(pos.cash_pnl ?? 0) >= 0 ? '+' : ''}{formatUsd(Number(pos.cash_pnl ?? 0))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators & Main List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="text-xs font-bold text-gray-400">
              {total > 0 && <span>Found <span className="text-black">{total}</span> traders</span>}
            </div>
          </div>

          {/* Success banner */}
          {copySuccess && (
            <div className="px-5 py-4 rounded-2xl bg-gradient-to-r from-[#c3ff00]/20 to-emerald-400/20 border border-[#c3ff00]/30 text-emerald-900 border-l-4 border-l-emerald-500 text-sm font-bold flex items-center gap-3 shadow-lg">
              <span className="text-xl">✅</span> {copySuccess} — Redirecting...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm">
              ❌ {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-32 min-h-[500px]">
              <div className="flex flex-col items-center gap-4 text-gray-400">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#c3ff00] rounded-full animate-spin" />
                <span className="text-sm font-black uppercase tracking-widest">Scanning Markets...</span>
              </div>
            </div>
          )}

          {/* Wallet Grid — compact cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {wallets.map((w, i) => (
                <div
                  key={w.wallet}
                  onClick={() => navigate(`/smartmoney/${w.wallet}`)}
                  className="group relative bg-white rounded-2xl border border-gray-100 p-4 flex flex-col hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                >
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#c3ff00]" />

                  {/* Header row: avatar + name + badge */}
                  <div className="flex items-center gap-3 mb-3">
                    {/* Avatar — real image or letter fallback */}
                    {w.profile_image ? (
                      <img
                        src={w.profile_image}
                        onError={e => (e.currentTarget.style.display = 'none')}
                        alt={w.user_name || 'trader'}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-sm font-black text-[#c3ff00] shrink-0">
                        {w.user_name ? w.user_name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-black truncate leading-tight">
                        {w.user_name || `Trader #${i + 1}`}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-mono text-black">{shortenAddr(w.wallet)}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(w.wallet);
                            setCopiedWallet(w.wallet);
                            setTimeout(() => setCopiedWallet(null), 2000);
                          }}
                          className="text-gray-400 hover:text-black transition-colors"
                        >
                          {copiedWallet === w.wallet
                            ? <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          }
                        </button>
                      </div>
                    </div>

                    <span className="px-2 py-1 rounded-lg bg-gray-50 text-[8px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 shrink-0">
                      {w.category || 'ALL'}
                    </span>
                  </div>

                  {/* Stats — 2 col grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3 pt-3 border-t border-gray-50 border-dashed">
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total PnL</p>
                      <p className={`text-base font-black tracking-tight ${Number(w.pnl_usd) >= 0 ? 'text-[#00c853]' : 'text-red-500'}`}>
                        {Number(w.pnl_usd) >= 0 ? '+' : ''}{formatUsd(Number(w.pnl_usd))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Volume</p>
                      <p className="text-base font-black text-black tracking-tight">{formatUsd(Number(w.volume_usd))}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Rank</p>
                      <p className="text-sm font-black text-gray-700">{w.rank_score}</p>
                    </div>
                    {w.win_rate > 0 && (
                      <div>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Win Rate</p>
                        <p className="text-sm font-black text-gray-700">{(w.win_rate * 100).toFixed(0)}%</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/smartmoney/${w.wallet}`)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 bg-gray-50 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:border-black hover:bg-black hover:text-white transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                    <button
                      onClick={() => setCopyTarget({ wallet: w.wallet, name: w.user_name || `Trader #${i + 1}` })}
                      className="flex-1 py-2 rounded-xl border border-gray-200 bg-gray-50 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:border-black hover:bg-black hover:text-[#c3ff00] transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Trade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && wallets.length === 0 && !error && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                <span className="text-2xl opacity-50">🔍</span>
              </div>
              <h3 className="text-lg font-bold text-black mb-1">No traders found</h3>
              <p className="text-gray-400 text-sm font-medium">Try selecting a different category or time period.</p>
            </div>
          )}
        </div>
      </div>

      {/* Copy Trade Modal — full settings */}
      <ConfirmModal
        open={copyTarget !== null}
        onConfirm={() => void handleCopyConfirm()}
        onCancel={() => { setCopyTarget(null); setCopyDryRun(true); }}
        title={`Copy Trade: ${copyTarget?.name || ''}`}
        description={
          <div className="space-y-5">
            {/* Target wallet */}
            <div className="border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Target Wallet</p>
              <p className="text-sm font-black text-black">{copyTarget?.name}</p>
              <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                {copyTarget ? copyTarget.wallet.slice(0, 10) + '…' + copyTarget.wallet.slice(-6) : ''}
              </p>
            </div>

            {/* Trading Mode */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">Trading Mode</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCopyDryRun(true)}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                    copyDryRun ? 'bg-black text-[#c3ff00] shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  🧪 Dry Run
                </button>
                <button
                  onClick={() => setCopyDryRun(false)}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                    !copyDryRun ? 'bg-black text-[#c3ff00] shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  💰 Live
                </button>
              </div>
            </div>

            {/* Copy Percentage */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">Copy Percentage</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => setCopyFixed(false)}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    !copyFixed ? 'bg-black text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {copyRatio}%
                </button>
                <button
                  onClick={() => setCopyFixed(true)}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    copyFixed ? 'bg-black text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  Fixed $
                </button>
              </div>
              {!copyFixed ? (
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={500} value={copyRatio}
                    onChange={e => setCopyRatio(Number(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-black outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm font-bold text-gray-400">%</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={copyFixedAmt}
                    onChange={e => setCopyFixedAmt(Number(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-black outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm font-bold text-gray-400">USDC</span>
                </div>
              )}
            </div>

            {/* Slippage + Spend Limit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">Max Slippage</p>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={100} value={copySlippage}
                    onChange={e => setCopySlippage(Number(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-black outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm font-bold text-gray-400">%</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">Spend Limit</p>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={copySpendLimit}
                    onChange={e => setCopySpendLimit(Number(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-black outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm font-bold text-gray-400">USDC</span>
                </div>
              </div>
            </div>

            {!copyDryRun && (
              <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">⚠️</span>
                <span>Live mode will use REAL USDC. Ensure your delegated wallet has sufficient balance.</span>
              </div>
            )}
          </div>
        }
        confirmText={copyDryRun ? '🧪 Create Dry Run' : '💰 Create Live Trade'}
        cancelText="Cancel"
        variant={copyDryRun ? 'info' : 'warning'}
        loading={copySubmitting}
      />
    </div>
  );
};

export default SmartMoneyPage;
