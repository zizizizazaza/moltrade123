import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAgent, type AgentResponse, type AgentHoldingRaw, type AgentTradeRaw } from '../api';

const REFRESH_INTERVAL_MS = 10000;

function formatEth(eth: string): string {
  if (!eth || eth.length < 12) return eth;
  return `${eth.slice(0, 6)}...${eth.slice(-6)}`;
}

function formatPnl(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatPnlUsd(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function formatDurationSecs(secs: number | null | undefined): string {
  if (secs == null || secs < 0) return '—';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h`;
  const m = Math.floor((secs % 3600) / 60);
  return `${m}m`;
}


function mapHolding(h: AgentHoldingRaw, i: number): {
  name: string;
  time: string;
  unrealized: string;
  unrealizedP: string;
  realized: string;
  realizedP: string;
  total: string;
  totalP: string;
  balance: string;
  tokens: string;
  img: string;
} {
  const un = h.unrealized_pnl ?? h.unrealized;
  const unP = h.unrealized_pnl_pct ?? (typeof un === 'number' ? null : undefined);
  const rl = h.realized_pnl ?? h.realized;
  const tot = h.total_pnl ?? h.total;
  const bal = h.balance;
  const tok = h.tokens ?? h.trade_count;
  const formatNum = (n: number | string | undefined) => (n == null ? '—' : typeof n === 'number' ? (n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`) : String(n));
  const formatPct = (n: number | undefined) => (n == null ? '' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);
  return {
    name: h.name ?? h.symbol ?? '—',
    time: h.time ?? '—',
    unrealized: typeof un === 'number' ? (un >= 0 ? `+$${un.toFixed(2)}` : `-$${Math.abs(un).toFixed(2)}`) : String(un ?? '—'),
    unrealizedP: typeof unP === 'number' ? formatPct(unP) : '—',
    realized: rl === undefined || rl === null ? 'HODL' : formatNum(rl as number),
    realizedP: typeof (h as { realized_pnl_pct?: number }).realized_pnl_pct === 'number' ? formatPct((h as { realized_pnl_pct: number }).realized_pnl_pct) : '—',
    total: typeof tot === 'number' ? (tot >= 0 ? `+$${tot.toFixed(2)}` : `-$${Math.abs(tot).toFixed(2)}`) : String(tot ?? '—'),
    totalP: '—',
    balance: bal != null ? (typeof bal === 'number' ? `$${bal.toLocaleString()}` : String(bal)) : '—',
    tokens: tok != null ? String(tok) : '—',
    img: h.img ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(h.name ?? h.symbol ?? '')}&background=random&color=fff`,
  };
}


function mapTrade(t: AgentTradeRaw, i: number): {
  id: number | string;
  type: 'Buy' | 'Sell';
  name: string;
  time: string;
  price: string;
  amount: string;
  total: string;
  pnl: string | null;
  pnlP: string | null;
  img: string;
} {
  const rawType = typeof t.type === 'string' ? t.type.toLowerCase() : '';
  const rawSide = typeof t.side === 'string' ? t.side.toLowerCase() : '';
  const type = (rawType === 'sell' || rawSide === 'short' ? 'Sell' : 'Buy') as 'Buy' | 'Sell';
  const priceNum = typeof t.price === 'number' ? t.price : (typeof t.price === 'string' ? Number.parseFloat(t.price) : NaN);
  const amountNum = typeof t.amount === 'number'
    ? t.amount
    : typeof t.size === 'number'
      ? t.size
      : typeof t.amount === 'string'
        ? Number.parseFloat(t.amount)
        : typeof t.size === 'string'
          ? Number.parseFloat(t.size)
          : NaN;
  const totalNum = typeof t.total === 'number'
    ? t.total
    : typeof t.total === 'string'
      ? Number.parseFloat(t.total)
      : Number.isFinite(priceNum) && Number.isFinite(amountNum)
        ? priceNum * amountNum
        : NaN;
  const pnlRaw = t.pnl ?? t.pnl_usd;
  const timeLabel = t.time ?? (t.created_at ? new Date(t.created_at).toLocaleString() : '—');
  return {
    id: t.id ?? i,
    type,
    name: t.name ?? t.symbol ?? '—',
    time: timeLabel,
    price: Number.isFinite(priceNum) ? `$${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
    amount: Number.isFinite(amountNum) ? amountNum.toLocaleString('en-US', { maximumFractionDigits: 8 }) : '—',
    total: Number.isFinite(totalNum) ? `$${totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
    pnl: pnlRaw != null
      ? (typeof pnlRaw === 'number'
        ? `${pnlRaw >= 0 ? '+' : '-'}$${Math.abs(pnlRaw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : String(pnlRaw))
      : null,
    pnlP: t.pnl_pct != null ? (typeof t.pnl_pct === 'number' ? `+${t.pnl_pct}%` : String(t.pnl_pct)) : null,
    img: t.img ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name ?? t.symbol ?? '')}&background=random&color=fff`,
  };
}

const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'holdings' | 'trades'>('holdings');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setAgent(null);
      setError('Missing agent id');
      return;
    }
    let cancelled = false;

    const loadAgent = async (showLoading: boolean) => {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getAgent(id);
        if (cancelled) return;
        setAgent(data);
      } catch (err) {
        if (cancelled) return;
        if (showLoading) {
          setError(err instanceof Error ? err.message : 'Failed to load agent');
          setAgent(null);
        } else {
          console.error('Failed to refresh agent detail:', err);
        }
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    loadAgent(true);
    const timer = setInterval(() => {
      loadAgent(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  const copyEth = () => {
    if (!agent?.eth_address) return;
    navigator.clipboard.writeText(agent.eth_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="pt-24 pb-20 px-6 flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-white/50">progress_activity</span>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="pt-24 pb-20 px-6 max-w-[1300px] mx-auto">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-8 text-red-400 text-center">
          {error ?? 'Agent not found'}
        </div>
      </div>
    );
  }

  const winRate = agent.win_rate_7d ?? (agent.success_count_7d + agent.failure_count_7d > 0
    ? (agent.success_count_7d / (agent.success_count_7d + agent.failure_count_7d)) * 100
    : null);
  const lossRate = winRate != null ? 100 - winRate : null;

  const holdingsRows = agent.holdings.map(mapHolding);
  const tradesRows = agent.trades.map(mapTrade);

  return (
    <div className="pt-24 pb-20 px-6 lg:px-12 max-w-[1300px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div className="flex items-center space-x-5">
          <div className="relative">
            <img
              alt="Agent Avatar"
              className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/5"
              src={`https://picsum.photos/seed/${agent.bot_pubkey}/128/128`}
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-accent rounded-full border-2 border-main-bg flex items-center justify-center">
              <span className="material-symbols-outlined text-[10px] text-white">bolt</span>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{agent.name || id || '—'}</h1>
              <span className="material-symbols-outlined text-blue-400 text-lg">verified</span>
            </div>
            <div className="flex items-center space-x-2 mt-1.5">
              <span className="text-[11px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {formatEth(agent.eth_address)}
              </span>
              <button type="button" onClick={copyEth} className="text-slate-500 hover:text-slate-300 transition-colors" title="Copy address">
                <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-section-bg border border-white/10 rounded-xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">7D Realized PnL</span>
            <div className="mt-4">
              <div className={`text-4xl font-black tracking-tight ${(agent.realized_pnl_7d ?? 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {formatPnlUsd(agent.realized_pnl_7d)}
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-5">
            <div>
              <div className="text-white/20 text-[9px] font-black uppercase tracking-wider">Total PnL</div>
              <div className={`text-[14px] font-black ${(agent.total_pnl ?? 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {formatPnlUsd(agent.total_pnl)}
              </div>
            </div>
            <div>
              <div className="text-white/20 text-[9px] font-black uppercase tracking-wider">Unrealized</div>
              <div className={`text-[14px] font-black ${(agent.unrealized_pnl ?? 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {formatPnlUsd(agent.unrealized_pnl)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-section-bg border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Analysis</span>
            <span className="text-[9px] font-bold text-white/20 tracking-widest uppercase">7D stats</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center group">
              <span className="text-[12px] text-white/40 font-bold uppercase tracking-wide">Win Rate</span>
              <span className="text-[14px] font-black text-white">{winRate != null ? `${winRate.toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[12px] text-white/40 font-bold uppercase tracking-wide">Total TXs</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[14px] font-black text-[#10B981]">{agent.buy_count_7d}</span>
                <span className="text-[11px] text-white/10 font-bold">/</span>
                <span className="text-[14px] font-black text-[#EF4444]">{agent.sell_count_7d}</span>
              </div>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[12px] text-white/40 font-bold uppercase tracking-wide">Volume</span>
              <span className="text-[14px] font-black text-white/80">{formatVolume(agent.volume_7d)}</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[12px] text-white/40 font-bold uppercase tracking-wide">Avg Duration</span>
              <span className="text-[14px] font-black text-white/60">{formatDurationSecs(agent.avg_duration_7d_secs)}</span>
            </div>
          </div>
        </div>

        <div className="bg-section-bg border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Distribution</span>
            <span className="text-[9px] font-bold text-white/20 tracking-widest uppercase">Tokens: {agent.token_count_7d}</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span className="text-[#10B981]">Win Rate: {winRate != null ? `${winRate.toFixed(2)}%` : '—'}</span>
              <span className="text-[#EF4444]">Loss Rate: {lossRate != null ? `${lossRate.toFixed(2)}%` : '—'}</span>
            </div>
            <div className="h-2.5 w-full bg-[#EF4444]/10 rounded-full overflow-hidden flex font-mono border border-white/5">
              <div
                className="h-full bg-[#10B981] shadow-[0_0_15px_#10B981] opacity-90 transition-all"
                style={{ width: winRate != null ? `${winRate}%` : '0%' }}
              />
              <div
                className="h-full bg-[#EF4444]/40 transition-all"
                style={{ width: lossRate != null ? `${lossRate}%` : '0%' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                <div className="text-[9px] text-white/20 font-black uppercase tracking-widest">Success</div>
                <div className="text-lg font-black text-white/90 mt-0.5">{agent.success_count_7d}</div>
              </div>
              <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                <div className="text-[9px] text-white/20 font-black uppercase tracking-widest">Failure</div>
                <div className="text-lg font-black text-white/90 mt-0.5">{agent.failure_count_7d}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings / Trades Table */}
      <div className="bg-[#1A1A1E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center border-b border-white/5 px-8">
          <div className="flex items-center space-x-10">
            {(['Holdings', 'Trades'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab.toLowerCase() as 'holdings' | 'trades')}
                className={`py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.toLowerCase() ? 'border-b-2 border-primary-accent text-white' : 'text-white/20 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            {activeTab === 'holdings' ? (
              <>
                <thead>
                  <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/10 bg-white/[0.02]">
                    <th className="px-8 py-5">Token</th>
                    <th className="px-8 py-5 text-right">Unrealized PnL</th>
                    <th className="px-8 py-5 text-right">Realized Profit</th>
                    <th className="px-8 py-6 text-right">Total Profit</th>
                    <th className="px-8 py-6 text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {holdingsRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-white/30 text-sm">No holdings</td>
                    </tr>
                  )}
                  {holdingsRows.map((token, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-3.5">
                          <img src={token.img} alt={token.name} className="w-8 h-8 rounded-full border border-white/5" />
                          <div>
                            <div className="font-black text-white text-[13px] tracking-tight">{token.name}</div>
                            <div className="text-[9px] text-slate-500 font-black uppercase mt-0.5 tracking-widest">{token.time}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="text-emerald-500 font-black text-[13px]">{token.unrealized}</div>
                        <div className="text-[9px] text-emerald-500/70 font-black tracking-widest">{token.unrealizedP}</div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {token.realized === 'HODL' ? (
                          <div className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Hodl</div>
                        ) : (
                          <>
                            <div className="text-emerald-500 font-black text-[13px]">{token.realized}</div>
                            <div className="text-[9px] text-emerald-500/70 font-black tracking-widest">{token.realizedP}</div>
                          </>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="text-emerald-500 font-black text-[13px]">{token.total}</div>
                        <div className="text-[9px] text-emerald-500/70 font-black tracking-widest">{token.totalP}</div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="text-white font-black text-[13px]">{token.balance}</div>
                        <div className="text-[9px] text-slate-500 font-black tracking-widest mt-0.5 uppercase">{token.tokens} Tokens</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/10 bg-white/[0.02]">
                    <th className="px-8 py-5">Time</th>
                    <th className="px-8 py-5">Action</th>
                    <th className="px-8 py-5">Token</th>
                    <th className="px-8 py-5 text-right">Price</th>
                    <th className="px-8 py-5 text-right">Amount</th>
                    <th className="px-8 py-5 text-right">Total</th>
                    <th className="px-8 py-5 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tradesRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center text-white/30 text-sm">No trades</td>
                    </tr>
                  )}
                  {tradesRows.map((trade) => (
                    <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6 text-[11px] font-mono text-slate-500">{trade.time}</td>
                      <td className="px-8 py-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${trade.type === 'Buy' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <img src={trade.img} alt={trade.name} className="w-6 h-6 rounded-full" />
                          <span className="font-bold text-white/90 text-[13px] tracking-tight">{trade.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right text-[12px] font-mono text-white/60">{trade.price}</td>
                      <td className="px-8 py-6 text-right text-[12px] font-mono text-white/90">{trade.amount}</td>
                      <td className="px-8 py-6 text-right text-[12px] font-mono text-white/80 tracking-tight">{trade.total}</td>
                      <td className="px-8 py-6 text-right">
                        {trade.pnl != null ? (
                          <>
                            <div className="text-emerald-500 font-black text-[12px] font-mono">{trade.pnl}</div>
                            {trade.pnlP != null && <div className="text-[9px] text-emerald-500/70 font-black tracking-widest font-mono">{trade.pnlP}</div>}
                          </>
                        ) : (
                          <span className="text-slate-600 text-[10px] font-mono">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>

      <footer className="mt-16 pb-12 text-center">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">Moltrade AI Hub © 2024</p>
      </footer>
    </div>
  );
};

export default AgentDetail;
