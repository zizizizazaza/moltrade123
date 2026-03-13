import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchWalletPositions,
  fetchWalletActivity,
  fetchWalletProfile,
  startCopyTrading,
  WalletPositionItem,
  WalletActivityItem,
  WalletProfileInfo,
} from '../api';
import ConfirmModal from './ConfirmModal';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';

type TabKey = 'overview' | 'positions' | 'activity' | 'history';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildPolymarketUrl(slug?: string | null, eventSlug?: string | null): string | null {
  const s = eventSlug || slug;
  if (!s) return null;
  return `https://polymarket.com/event/${s}`;
}

function formatUsd(n: number, compact = false): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (compact) {
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(ts: string): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function dateStr(ts: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── sub-components ────────────────────────────────────────────────────────────

/** Clickable market title that opens Polymarket event page */
const MarketLink: React.FC<{ title: string; slug?: string | null; eventSlug?: string | null; className?: string }> = ({
  title, slug, eventSlug, className = '',
}) => {
  const url = buildPolymarketUrl(slug, eventSlug);
  if (!url) return <span className={className}>{title || '—'}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className={`hover:underline underline-offset-2 decoration-gray-300 hover:decoration-black transition-all ${className}`}
    >
      {title || '—'}
      <svg className="inline-block ml-1 w-2.5 h-2.5 opacity-40 shrink-0 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
};

const SideBadge: React.FC<{ side: string; type?: string }> = ({ side, type }) => {
  if (type === 'REDEEM') return (
    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-violet-50 text-violet-600 uppercase whitespace-nowrap">REDEEM</span>
  );
  if (side === 'BUY') return (
    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 uppercase">BUY</span>
  );
  if (side === 'SELL') return (
    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-red-50 text-red-500 uppercase">SELL</span>
  );
  return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-gray-100 text-gray-500 uppercase">{side || '—'}</span>;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="bg-black rounded-xl px-4 py-3 shadow-xl text-white">
      <p className="text-[10px] font-bold text-gray-400 mb-1">{label}</p>
      <p className={`text-base font-black ${val >= 0 ? 'text-[#c3ff00]' : 'text-red-400'}`}>
        {val >= 0 ? '+' : ''}{formatUsd(val, true)}
      </p>
    </div>
  );
};

// Stat tile for the header quick-stats strip
const HeaderStat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex flex-col items-end">
    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{label}</p>
    <p className={`text-base font-black mt-0.5 ${highlight ? 'text-[#c3ff00]' : 'text-white'}`}>{value}</p>
  </div>
);

// ── main component ────────────────────────────────────────────────────────────

const TraderDetailPage: React.FC = () => {
  const { wallet } = useParams<{ wallet: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('overview');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'REDEEM'>('ALL');

  // Copy Trade modal state
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyDryRun, setCopyDryRun] = useState(true);
  const [copyRatio, setCopyRatio] = useState(100);        // % of position size to copy
  const [copyFixed, setCopyFixed] = useState(false);       // false=percentage, true=fixed $
  const [copyFixedAmt, setCopyFixedAmt] = useState(100);   // fixed $ per trade
  const [copySlippage, setCopySlippage] = useState(30);    // max slippage %
  const [copySpendLimit, setCopySpendLimit] = useState(5000); // max USDC per trade
  const [copySubmitting, setCopySubmitting] = useState(false);
  const [copyResult, setCopyResult] = useState<string | null>(null);

  const [profile, setProfile] = useState<WalletProfileInfo | null>(null);
  const [positions, setPositions] = useState<WalletPositionItem[]>([]);
  const [activities, setActivities] = useState<WalletActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── SCROLL TO TOP ON MOUNT ──
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as any }); }, [wallet]);

  // Load profile & positions on mount
  const loadInitial = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, posRes] = await Promise.all([
        fetchWalletProfile(wallet).catch(() => null),
        fetchWalletPositions(wallet, 200),
      ]);
      if (profileRes) setProfile(profileRes);
      setPositions(posRes.positions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Lazy-load activity whenever tab changes to one that needs it
  useEffect(() => {
    if (!wallet || activities.length > 0) return;
    if (tab === 'activity' || tab === 'history' || tab === 'overview') {
      setActLoading(true);
      fetchWalletActivity(wallet, 500)
        .then(r => setActivities(r.activities || []))
        .catch(() => {})
        .finally(() => setActLoading(false));
    }
  }, [tab, wallet, activities.length]);

  // ── computed data ──

  const dailyPnl = useMemo(() => {
    const map = new Map<string, { redeems: number; buys: number }>();
    activities.forEach(a => {
      if (!a.timestamp) return;
      const date = a.timestamp.slice(0, 10);
      const entry = map.get(date) || { redeems: 0, buys: 0 };
      if (a.type === 'REDEEM') entry.redeems += a.amount_usd;
      else if (a.side === 'BUY') entry.buys += a.amount_usd;
      map.set(date, entry);
    });
    const sorted = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, { redeems, buys }]) => ({
        date: date.slice(5),
        pnl: Math.round((redeems - buys) * 100) / 100,
      }));
    let cum = 0;
    return sorted.map(d => { cum += d.pnl; return { ...d, cumPnl: Math.round(cum * 100) / 100 }; });
  }, [activities]);

  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const pnlMap = new Map<string, number>();
    dailyPnl.forEach(d => {
      const [mm, dd] = d.date.split('-');
      pnlMap.set(`${year}-${mm}-${dd}`, d.pnl);
    });
    const cells: Array<{ day: number; pnl: number | null; isToday: boolean }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: 0, pnl: null, isToday: false });
    const todayDay = now.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, pnl: pnlMap.get(dStr) ?? null, isToday: d === todayDay });
    }
    while (cells.length % 7 !== 0) cells.push({ day: 0, pnl: null, isToday: false });
    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { year, monthName: now.toLocaleString('en-US', { month: 'long' }), weeks };
  }, [dailyPnl]);

  const stats = useMemo(() => {
    const buys = activities.filter(a => a.type !== 'REDEEM' && a.side === 'BUY');
    const sells = activities.filter(a => a.type !== 'REDEEM' && a.side === 'SELL');
    const redeems = activities.filter(a => a.type === 'REDEEM');
    const totalBought = buys.reduce((s, a) => s + a.amount_usd, 0);
    const totalRedeemed = redeems.reduce((s, a) => s + a.amount_usd, 0);
    const realizedPnl = totalRedeemed - totalBought;
    const posTotal = positions.reduce((s, p) => s + p.current_value, 0);
    const posPnl = positions.reduce((s, p) => s + p.cash_pnl, 0);
    return { buys: buys.length, sells: sells.length, redeems: redeems.length, totalBought, totalRedeemed, realizedPnl, positionsValue: posTotal, positionsPnl: posPnl };
  }, [activities, positions]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'ALL') return activities;
    return activities.filter(a =>
      activityFilter === 'REDEEM' ? a.type === 'REDEEM' : a.side === activityFilter
    );
  }, [activities, activityFilter]);

  const displayName = profile?.username || profile?.pseudonym || (wallet ? wallet.slice(0, 8) + '…' + wallet.slice(-6) : '—');
  const totalPnl = profile?.total_pnl ?? stats.realizedPnl;
  const pnlColor = totalPnl >= 0 ? '#00c853' : '#f87171';

  const handleCopyConfirm = async () => {
    if (!wallet) return;
    setCopySubmitting(true);
    try {
      const ratio = copyFixed ? 1 : copyRatio / 100;
      const maxPerTrade = copyFixed ? copyFixedAmt : copySpendLimit;
      const result = await startCopyTrading({
        source_wallet: wallet,
        market_id: null,
        side: 'AUTO',
        copy_ratio: ratio,
        max_per_trade_usd: maxPerTrade,
        min_trade_size_usd: 5,
        slippage_max: copySlippage / 100,
        daily_risk_budget_usd: copySpendLimit,
        dry_run: copyDryRun,
      });
      setCopyResult(`${copyDryRun ? 'Dry-run' : 'Live'} task created: ${result.task_id}`);
      setCopyOpen(false);
      setTimeout(() => navigate('/copytrade'), 1500);
    } catch (e: any) {
      setCopyResult(`Error: ${e.message}`);
      setCopyOpen(false);
    } finally {
      setCopySubmitting(false);
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'positions', label: `Positions (${positions.length})` },
    { key: 'activity', label: `Activity${activities.length > 0 ? ` (${activities.length})` : ''}` },
    { key: 'history', label: 'P&L Chart' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">

      {/* ══ STICKY LIGHT HEADER — matches app style ══ */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1440px] mx-auto">

          {/* ─ Top breadcrumb + copy trade ─ */}
          <div className="flex items-center justify-between px-6 md:px-10 pt-3 pb-0">
            <button
              onClick={() => navigate('/smartmoney')}
              className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-widest group"
            >
              <svg className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Smart Money Hub
            </button>
            <button
              onClick={() => setCopyOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-[#c3ff00] text-xs font-black tracking-wider hover:bg-gray-800 active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Trade
            </button>
          </div>

          {/* ─ Profile + stats row ─ */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-6 md:px-10 py-4">

            {/* Left: avatar + identity */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="relative shrink-0">
                {profile?.profile_image ? (
                  <img src={profile.profile_image} alt={displayName} className="w-11 h-11 rounded-xl object-cover border border-gray-200" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center text-base font-black text-[#c3ff00]">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-black text-black tracking-tight">{displayName}</h1>
                  {profile?.pseudonym && profile.username && (
                    <span className="text-[10px] font-bold text-gray-400">@{profile.pseudonym}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-gray-400 break-all leading-tight">{wallet || ''}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(wallet || ''); setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); }}
                    className="shrink-0 text-gray-400 hover:text-black transition-colors" title="Copy address"
                  >
                    {copiedAddr
                      ? <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    }
                  </button>
                  <a href={`https://polymarket.com/profile/${wallet}`} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-gray-400 hover:text-black transition-colors" title="View on Polymarket">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Right: key metrics */}
            <div className="flex items-center gap-6 lg:gap-8 flex-wrap shrink-0">
              <div className="flex flex-col">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Realized P&L</p>
                <p style={{ color: pnlColor }} className="text-xl font-black mt-0.5 tracking-tight">{formatUsd(totalPnl, true)}</p>
              </div>
              <div className="w-px h-7 bg-gray-100" />
              {[
                { label: 'Volume', value: formatUsd(profile?.volume_usd || stats.totalBought, true) },
                { label: 'Trades', value: (profile?.trades_count || activities.length).toLocaleString() },
                { label: 'Positions', value: positions.length.toString() },
              ].map(m => (
                <div key={m.label}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{m.label}</p>
                  <p className="text-base font-black text-black mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─ Tab bar ─ */}
          <div className="flex px-6 md:px-10">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${
                  tab === t.key
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-400 hover:text-black'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-8">

        {loading && (
          <div className="flex flex-col items-center gap-4 py-32 text-gray-400">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
            <span className="text-sm font-black uppercase tracking-widest">Loading…</span>
          </div>
        )}
        {error && (
          <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold mb-6">❌ {error}</div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {!loading && tab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* LEFT column — stats + chart */}
            <div className="xl:col-span-2 space-y-5">
              {/* 4 stat cards in a 2×2 grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: 'Realized P&L', value: formatUsd(stats.realizedPnl, true),
                    sub: `from ${stats.redeems} redeems`,
                    accent: stats.realizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500',
                    bg: stats.realizedPnl >= 0 ? 'bg-emerald-50/60' : 'bg-red-50/60',
                  },
                  {
                    label: 'Open Positions', value: formatUsd(stats.positionsValue, true),
                    sub: `unrealized: ${formatUsd(stats.positionsPnl, true)}`,
                    accent: stats.positionsPnl >= 0 ? 'text-emerald-500' : 'text-red-500',
                    bg: 'bg-white',
                  },
                  {
                    label: 'Total Bought', value: formatUsd(stats.totalBought, true),
                    sub: `${stats.buys} buy txns`,
                    accent: 'text-gray-900', bg: 'bg-white',
                  },
                  {
                    label: 'Total Redeemed', value: formatUsd(stats.totalRedeemed, true),
                    sub: `${stats.redeems} redemptions`,
                    accent: 'text-emerald-500', bg: 'bg-emerald-50/60',
                  },
                ].map(c => (
                  <div key={c.label} className={`${c.bg} rounded-2xl border border-gray-100 p-5 flex flex-col gap-1 transition-shadow hover:shadow-md`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{c.label}</p>
                    <p className={`text-[1.6rem] font-black tracking-tight leading-none ${c.accent}`}>{c.value}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* Cumulative PnL chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Cumulative P&L</h2>
                  {actLoading && <div className="w-4 h-4 border-2 border-gray-200 border-t-black rounded-full animate-spin" />}
                </div>
                {dailyPnl.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={dailyPnl}>
                      <defs>
                        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c3ff00" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#c3ff00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f4" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatUsd(v, true)} width={65} />
                      <ReTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="cumPnl" stroke="#c3ff00" strokeWidth={2.5} fill="url(#pnlGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-44 text-gray-300">
                    {actLoading
                      ? <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                      : <span className="text-sm font-bold">No chart data yet</span>}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT column — positions + recent activity */}
            <div className="space-y-5">
              {/* Top Positions */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                  <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Top Positions</h2>
                  <button onClick={() => setTab('positions')} className="text-[10px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-widest">
                    All →
                  </button>
                </div>
                {positions.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-400 text-sm font-bold">No open positions</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {positions.slice(0, 6).map((p, i) => {
                      const polyUrl = p.slug ? `https://polymarket.com/event/${p.event_slug || p.slug}` : null;
                      return (
                        <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                          <span className={`mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-black shrink-0 ${p.outcome === 'Yes' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {p.outcome || 'YES'}
                          </span>
                          <div className="flex-1 min-w-0">
                            {polyUrl ? (
                              <a href={polyUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gray-900 hover:underline underline-offset-2 decoration-gray-300 hover:decoration-black line-clamp-2 leading-snug">
                                {p.title || p.condition_id}
                                <svg className="inline-block ml-1 w-2.5 h-2.5 opacity-30 shrink-0 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ) : (
                              <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">{p.title || p.condition_id}</p>
                            )}
                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">{formatUsd(p.current_value, true)} value</p>
                          </div>
                          <p className={`text-xs font-black shrink-0 ${p.cash_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {p.cash_pnl >= 0 ? '+' : ''}{formatUsd(p.cash_pnl, true)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                  <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Recent Activity</h2>
                  <button onClick={() => setTab('activity')} className="text-[10px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-widest">
                    All →
                  </button>
                </div>
                {actLoading ? (
                  <div className="flex items-center gap-3 px-5 py-6 text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-black rounded-full animate-spin shrink-0" />
                    <span className="text-xs font-bold">Loading…</span>
                  </div>
                ) : activities.length === 0 ? (
                  <p className="px-5 py-6 text-xs text-gray-400 font-bold text-center">No activity data</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {activities.slice(0, 8).map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-gray-50/50 transition-colors">
                        <SideBadge side={a.side} type={a.type} />
                        <div className="flex-1 min-w-0">
                          <MarketLink
                            title={a.title || '—'}
                            slug={a.slug}
                            eventSlug={a.slug}
                            className="text-xs font-bold text-gray-900 block truncate"
                          />
                          {a.outcome && (
                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">{a.outcome}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-black ${a.type === 'REDEEM' ? 'text-emerald-500' : 'text-gray-900'}`}>
                            {a.type === 'REDEEM' ? '+' : ''}{formatUsd(a.amount_usd, true)}
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold">{timeAgo(a.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── POSITIONS TAB ── */}
        {!loading && tab === 'positions' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Open Positions</h2>
              <span className="text-xs font-bold text-gray-400">({positions.length})</span>
            </div>
            {positions.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-3xl mb-3">📊</div>
                <p className="font-bold text-sm">No open positions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/50">
                      <th className="text-left px-6 py-3">Market</th>
                      <th className="text-left px-4 py-3">Outcome</th>
                      <th className="text-right px-4 py-3">Shares</th>
                      <th className="text-right px-4 py-3">Avg Buy</th>
                      <th className="text-right px-4 py-3">Current</th>
                      <th className="text-right px-4 py-3">Value</th>
                      <th className="text-right px-6 py-3">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p, i) => {
                      const polyUrl = p.slug ? `https://polymarket.com/event/${p.event_slug || p.slug}` : null;
                      return (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 max-w-[320px]">
                            {polyUrl ? (
                              <a href={polyUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-gray-900 hover:underline underline-offset-2 decoration-gray-300 hover:decoration-black line-clamp-2 block text-sm leading-snug">
                                {p.title || p.condition_id}
                                <svg className="inline-block ml-1 w-2.5 h-2.5 opacity-30 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ) : (
                              <span className="font-bold text-gray-900">{p.title || p.condition_id}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black ${p.outcome === 'Yes' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                              {p.outcome || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-gray-600 text-xs">{p.size.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-gray-500 text-xs">{(p.avg_price * 100).toFixed(1)}¢</td>
                          <td className="px-4 py-3.5 text-right font-mono text-gray-500 text-xs">{p.cur_price != null ? `${(p.cur_price * 100).toFixed(1)}¢` : '—'}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-gray-800 text-xs">{formatUsd(p.current_value, true)}</td>
                          <td className={`px-6 py-3.5 text-right font-black ${p.cash_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {p.cash_pnl >= 0 ? '+' : ''}{formatUsd(p.cash_pnl, true)}
                            {p.percent_pnl != null && (
                              <span className="block text-[9px] font-bold text-gray-400 mt-0.5">{p.percent_pnl >= 0 ? '+' : ''}{(p.percent_pnl * 100).toFixed(1)}%</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {!loading && tab === 'activity' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">
                Activity {activities.length > 0 && <span className="text-gray-400">({filteredActivities.length} of {activities.length})</span>}
              </h2>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {(['ALL', 'BUY', 'SELL', 'REDEEM'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setActivityFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      activityFilter === f ? 'bg-black text-white shadow-sm' : 'text-gray-400 hover:text-black'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {actLoading ? (
              <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                <span className="text-sm font-bold">Loading…</span>
              </div>
            ) : filteredActivities.length === 0 ? (
              <p className="text-center py-20 text-gray-400 font-bold text-sm">No activity found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 border-b border-gray-50">
                      <th className="text-left px-6 py-3">Type</th>
                      <th className="text-left px-4 py-3">Market</th>
                      <th className="text-right px-4 py-3">Shares</th>
                      <th className="text-right px-4 py-3">Price</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-right px-6 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.slice(0, 200).map((a, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <SideBadge side={a.side} type={a.type} />
                        </td>
                        <td className="px-4 py-3 max-w-[380px]">
                          <MarketLink
                            title={a.title || '—'}
                            slug={a.slug}
                            className="font-bold text-gray-900 text-sm block truncate"
                          />
                          {a.outcome && <span className="text-[9px] text-gray-400 font-bold">{a.outcome}</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">{a.size > 0 ? a.size.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">{a.price > 0 ? `${(a.price * 100).toFixed(1)}¢` : '—'}</td>
                        <td className={`px-4 py-3 text-right font-black text-sm ${a.type === 'REDEEM' ? 'text-emerald-500' : 'text-gray-900'}`}>
                          {a.type === 'REDEEM' ? '+' : ''}{formatUsd(a.amount_usd, true)}
                        </td>
                        <td className="px-6 py-3 text-right text-[10px] text-gray-400 font-bold whitespace-nowrap">
                          {dateStr(a.timestamp)} · {timeAgo(a.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── P&L CHART TAB ── */}
        {!loading && tab === 'history' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest mb-6">Cumulative P&L Over Time</h2>
              {actLoading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                </div>
              ) : dailyPnl.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p className="font-bold text-sm">No chart data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={dailyPnl} margin={{ left: 10 }}>
                    <defs>
                      <linearGradient id="pnlGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c3ff00" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c3ff00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatUsd(v, true)} width={70} />
                    <ReTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="cumPnl" stroke="#c3ff00" strokeWidth={3} fill="url(#pnlGrad2)" dot={false} activeDot={{ r: 5, fill: '#c3ff00', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Daily PnL Calendar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-4 mb-5">
                <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Daily P&L — {calendarData.monthName} {calendarData.year}</h2>
                <div className="flex items-center gap-3 text-[9px] font-bold text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> Profit</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Loss</span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-[9px] font-black text-gray-400 uppercase">{d}</div>
                ))}
              </div>
              <div className="grid gap-2">
                {calendarData.weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-2">
                    {week.map((cell, ci) => (
                      <div
                        key={ci}
                        className={`rounded-xl p-2 min-h-[54px] flex flex-col items-center justify-center transition-all ${
                          cell.day === 0 ? 'bg-transparent' :
                          cell.isToday ? 'bg-black text-white ring-2 ring-black ring-offset-1' :
                          cell.pnl === null ? 'bg-gray-50/80' :
                          cell.pnl > 0 ? 'bg-emerald-50 border border-emerald-200/70 hover:bg-emerald-100 cursor-default' :
                          cell.pnl < 0 ? 'bg-red-50 border border-red-200/70 hover:bg-red-100 cursor-default' :
                          'bg-gray-50/80'
                        }`}
                      >
                        {cell.day > 0 && (
                          <>
                            <span className={`text-xs font-black ${cell.isToday ? 'text-white' : 'text-gray-500'}`}>{cell.day}</span>
                            {cell.pnl !== null && cell.pnl !== 0 && (
                              <span className={`text-[8px] font-black mt-0.5 ${cell.pnl > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {cell.pnl > 0 ? '+' : ''}{formatUsd(cell.pnl, true)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copy Result toast */}
      {copyResult && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-black text-[#c3ff00] text-sm font-bold rounded-2xl shadow-2xl animate-fadeIn">
          {copyResult}
        </div>
      )}

      {/* ── REAL COPY TRADE MODAL ── */}
      <ConfirmModal
        open={copyOpen}
        onConfirm={() => void handleCopyConfirm()}
        onCancel={() => { setCopyOpen(false); setCopyDryRun(true); }}
        title={`Copy Trade: ${displayName}`}
        description={
          <div className="space-y-5">
            {/* Target wallet */}
            <div className="border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Target Wallet</p>
              <p className="text-sm font-black text-black">{displayName}</p>
              <p className="text-[10px] font-mono text-gray-400 mt-0.5">{wallet ? wallet.slice(0, 10) + '…' + wallet.slice(-6) : ''}</p>
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

            {/* Copy Percentage / Fixed */}
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
                  <input
                    type="number" min={1} max={500} value={copyRatio}
                    onChange={e => setCopyRatio(Number(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-black outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm font-bold text-gray-400">%</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1} value={copyFixedAmt}
                    onChange={e => setCopyFixedAmt(Number(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-black outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm font-bold text-gray-400">USDC</span>
                </div>
              )}
            </div>

            {/* Slippage + Spend Limit row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">Max Slippage</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100} value={copySlippage}
                    onChange={e => setCopySlippage(Number(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-black outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm font-bold text-gray-400">%</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">Spend Limit</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1} value={copySpendLimit}
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

export default TraderDetailPage;
