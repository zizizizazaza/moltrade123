
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, CartesianGrid, YAxis, XAxis } from 'recharts';
import { Icons } from '../constants';
import { useWallets } from '@privy-io/react-auth';
import { fetchTradeHistory, fetchUserPositions, WalletPositionItem, CopyExecutionItem } from '../api';

// Generate 90 days of dummy data
const generateChartData = () => {
  const data = [];
  let currentTotal = 11000;
  const now = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    currentTotal = currentTotal + (Math.random() * 200 - 90); // Random walk
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: d.getTime(),
      total: currentTotal
    });
  }
  return data;
};

const chartData = generateChartData();

interface PortfolioProps {
  isWalletConnected?: boolean;
  onConnect?: () => void;
  onSettingsClick?: () => void;
}

const Portfolio: React.FC<PortfolioProps> = ({ isWalletConnected = false, onConnect, onSettingsClick }) => {
  const { wallets } = useWallets();
  const [balance] = useState(12450.88);
  const [yieldAccumulated, setYieldAccumulated] = useState(0.00012);
  const [isHidden, setIsHidden] = useState(false);
  const [greeting, setGreeting] = useState('Good Morning');

  const walletAddress = wallets?.[0]?.address || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  const [positions, setPositions] = useState<WalletPositionItem[]>([]);
  const [history, setHistory] = useState<CopyExecutionItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'activity'>('holdings');
  const [timeframe, setTimeframe] = useState('7D');

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
    if (!isWalletConnected || !walletAddress) return;
    let mounted = true;
    Promise.all([
      fetchUserPositions(walletAddress),
      fetchTradeHistory(walletAddress, 20),
    ])
      .then(([p, h]) => {
        if (!mounted) return;
        setPositions(p || []);
        setHistory(h || []);
      })
      .catch(() => {
        // keep mock values if api unavailable
      });
    return () => {
      mounted = false;
    };
  }, [isWalletConnected, walletAddress]);

  const getFilteredData = () => {
    if (timeframe === '7D') return chartData.slice(-7);
    if (timeframe === '30D') return chartData; // Currently dataset is small, so returning full data for 30D
    if (timeframe === '3M') return chartData;
    return chartData; // Return full data by default
  };

  const filteredChartData = getFilteredData();

  if (!isWalletConnected) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-fadeIn">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-black">Authentication Required</h2>
          <p className="text-sm font-medium text-gray-400 max-w-sm mx-auto leading-relaxed">
            Please connect your wallet to access your portfolio positions, track yields, and review transaction history.
          </p>
        </div>
        <button
          onClick={onConnect}
          className="mt-6 px-8 py-3 bg-black text-white rounded-full text-xs font-bold tracking-widest  hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn pb-24 px-4 space-y-10">

      {/* TWO COLUMN PORTFOLIO HERO LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-6 pb-6">

        {/* --- Left Card: Profile & Overview --- */}
        <div className="md:col-span-5 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 flex flex-col justify-between space-y-6">

          {/* User Profile */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Gradiant Avatar Mock */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#00E676] via-blue-400 to-amber-300 opacity-90 shadow-inner flex-shrink-0" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-black tracking-tight">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</h2>
                  <button onClick={handleCopy} className="text-gray-400 hover:text-black transition-colors" title="Copy Address">
                    {copied ? (
                      <svg className="w-4 h-4 text-[#00E676]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-medium text-gray-400">Joined Nov {new Date().getFullYear()}</p>
              </div>
            </div>

            <button
              onClick={onSettingsClick}
              className="p-2 text-gray-400 hover:text-black bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
              title="Account Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="flex justify-between items-center py-2 border-y border-gray-50/80">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold  tracking-widest mb-1">Net Worth</span>
              <span className="text-lg font-black text-black">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-px h-8 bg-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold  tracking-widest mb-1">Total Yield</span>
              <span className="text-lg font-black text-[#00E676]">+$340.00</span>
            </div>
            <div className="w-px h-8 bg-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold  tracking-widest mb-1">Assets</span>
              <span className="text-lg font-black text-black">4</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('loka-open-modal', { detail: 'deposit' }))}
              className="w-full py-2.5 bg-transparent border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-500 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              Deposit
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('loka-open-modal', { detail: 'withdraw' }))}
              className="w-full py-2.5 bg-transparent border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-500 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              Withdraw
            </button>
          </div>

        </div>

        {/* --- Right Card: Chart & History --- */}
        <div className="md:col-span-7 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 flex flex-col justify-between">

          {/* Chart Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-pulse"></div>
                <span className="text-[10px] text-gray-500 font-bold tracking-widest ">Profit / Loss</span>
              </div>
              <h2 className="text-3xl font-black text-black">+${(340.00).toFixed(2)}</h2>
              <p className="text-[11px] font-bold text-gray-400 mt-1  tracking-widest">{timeframe === 'ALL' ? 'All Time' : `Past ${timeframe}`}</p>
            </div>

            {/* Toggles */}
            <div className="flex bg-gray-50 p-1 rounded-full border border-gray-100 gap-0.5">
              {['7D', '30D', '3M', 'ALL'].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3.5 py-1.5 text-[10px] font-black rounded-full transition-all ${timeframe === t ? 'bg-white text-black shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-black'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-[150px] w-full mt-6 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E676" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={30}
                  tickFormatter={(tick) => {
                    const date = new Date(tick);
                    if (timeframe === '7D') return date.toLocaleDateString('en-US', { weekday: 'short' });
                    if (timeframe === '30D') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return date.toLocaleDateString('en-US', { month: 'short' });
                  }}
                  tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }}
                  dy={5}
                />
                <YAxis domain={['dataMin - 200', 'dataMax + 100']} hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-xl">
                          <p className="text-[10px] text-gray-400 font-bold mb-0.5  tracking-widest">{new Date(payload[0].payload.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          <p className="text-sm font-black text-black">${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#00E676"
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  strokeWidth={2.5}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>

      {/* BOTTOM SECTION: Tabs for Holding / Activity */}
      <div className="space-y-6">

        {/* Tabs Control */}
        <div className="flex items-center gap-6 border-b border-gray-100 pb-px">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'holdings' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Holdings
            {activeTab === 'holdings' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'activity' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Activity
            {activeTab === 'activity' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-t-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === 'holdings' ? (
            <section className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 gap-4">
                {positions.length === 0 && (
                  <AllocationCard
                    title="AIUSD"
                    desc="Treasury Backed Stablecoin"
                    apy="5.24% APY"
                    amount="$10,340.00"
                    earnings="+$340.00"
                    icon={<div className="w-6 h-6 bg-black rounded flex items-center justify-center font-black text-white text-[10px]">A</div>}
                    onClick={() => window.dispatchEvent(new CustomEvent('loka-nav-swap'))}
                    action={
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('loka-nav-swap')); }}
                          className="px-4 py-1.5 bg-gray-100/80 text-black text-[11px] font-bold rounded-full hover:bg-gray-200 transition-colors shadow-sm"
                        >
                          Add
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('loka-nav-swap')); }}
                          className="px-4 py-1.5 bg-black text-white text-[11px] font-bold rounded-full hover:bg-gray-800 transition-colors shadow-sm"
                        >
                          Sell
                        </button>
                      </div>
                    }
                  />
                )}
                {positions.slice(0, 8).map((p) => (
                  <AllocationCard
                    key={`${p.condition_id}-${p.outcome_index}`}
                    title={p.title || `Condition ${p.condition_id.slice(0, 8)}`}
                    desc={p.outcome || 'Position'}
                    apy={`Avg ${((p.avg_price || 0) * 100).toFixed(1)}c`}
                    amount={`$${(p.current_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    earnings={`${(p.cash_pnl || 0) >= 0 ? '+' : ''}$${(p.cash_pnl || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    icon={<div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center font-black text-white text-[10px]">P</div>}
                    onClick={() => window.dispatchEvent(new CustomEvent('loka-nav-market'))}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section className="space-y-4 animate-fadeIn">
              <div className="glass rounded-[32px] overflow-hidden bg-white shadow-sm border border-gray-100">
                {history.length === 0 ? (
                  <>
                    <ActivityItem
                      title="Daily Interest Payout"
                      time="Today, 08:00 AM"
                      source="AIUSD"
                      amount="+$5.24"
                      type="INTEREST"
                      onSourceClick={() => window.dispatchEvent(new CustomEvent('loka-nav-swap'))}
                    />
                    <ActivityItem
                      title="USDC Deposit"
                      time="Yesterday, 04:15 PM"
                      amount="+$1,000.00"
                      type="DEPOSIT"
                    />
                  </>
                ) : (
                  history.map((h) => (
                    <ActivityItem
                      key={h.exec_id}
                      title={`Copytrade ${h.status}`}
                      time={new Date(h.created_at).toLocaleString()}
                      source={`${h.side} · ${h.market_id.slice(0, 8)}...`}
                      amount={`${h.amount_usd >= 0 ? '+' : ''}$${Number(h.amount_usd || 0).toFixed(2)}`}
                      type={h.status === 'failed' ? 'DEPOSIT' : 'INTEREST'}
                      onSourceClick={() => window.dispatchEvent(new CustomEvent('loka-nav-market'))}
                    />
                  ))
                )}
              </div>
            </section>
          )}
        </div>

      </div>
    </div>
  );
};

const ActionButton: React.FC<{ label: string; sub: string; icon: React.ReactNode; primary?: boolean; highlight?: boolean; onClick?: () => void }> = ({ label, sub, icon, primary, highlight, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-6 rounded-[32px] transition-all group w-full ${primary ? 'bg-black text-white shadow-xl hover:bg-gray-800' :
    highlight ? 'bg-white border-2 border-green-500/20 text-black shadow-lg shadow-green-500/5 hover:bg-green-50' :
      'bg-white glass text-black hover:bg-gray-50 shadow-md border-gray-100'
    }`}>
    <div className={`mb-3 transition-transform group-hover:-translate-y-1 ${primary ? 'text-white' : highlight ? 'text-green-500' : 'text-gray-400'}`}>
      {icon}
    </div>
    <span className="text-xs font-bold tracking-tight">{label}</span>
    <span className={`text-[9px] font-medium opacity-50  tracking-widest mt-1 ${primary ? 'text-gray-400' : 'text-gray-500'}`}>{sub}</span>
  </button>
);

const AllocationCard: React.FC<{
  title: string;
  desc: string;
  apy: string;
  amount: string;
  earnings: string;
  icon: React.ReactNode;
  progress?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  statusBadge?: React.ReactNode;
}> = ({ title, desc, apy, amount, earnings, icon, progress, action, onClick, statusBadge }) => (
  <div onClick={onClick} className="glass p-6 rounded-[32px] bg-white flex items-center justify-between hover:border-black/20 transition-all cursor-pointer group shadow-sm border-gray-100">
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h5 className="text-sm font-bold text-black">{title}</h5>
          {desc && <span className="text-[9px] font-bold text-gray-400 tracking-tighter">({desc})</span>}
          {statusBadge}
        </div>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">{apy}</p>
        {progress && <p className="text-[10px] text-orange-500 font-bold mt-1 tracking-tight">{progress}</p>}
      </div>
    </div>
    <div className="flex items-center gap-6 text-right">
      <div>
        <p className="text-sm font-bold text-black">{amount}</p>
        <p className="text-[11px] font-bold text-green-600 mt-0.5">{earnings}</p>
      </div>
      {action && (
        <div onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  </div>
);

const ActivityItem: React.FC<{ title: string; time: string; amount: string; type: 'INTEREST' | 'DEPOSIT'; source?: string; onSourceClick?: () => void }> = ({ title, time, amount, type, source, onSourceClick }) => (
  <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 last:border-none hover:bg-gray-50/50 transition-colors">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'INTEREST' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-black'}`}>
        {type === 'INTEREST' ? '💰' : '⬇️'}
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-black">{title}</p>
          {source && (
            <>
              <span className="text-gray-300 text-[10px]">•</span>
              <span className="text-[11px] font-medium text-gray-400">
                From{' '}
                <span
                  onClick={onSourceClick}
                  className="font-bold text-black hover:text-blue-500 hover:underline cursor-pointer transition-colors"
                >
                  {source}
                </span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[10px] text-gray-400 font-medium">{time}</p>
        </div>
      </div>
    </div>
    <span className={`text-sm font-bold ${type === 'INTEREST' ? 'text-green-600' : 'text-black'}`}>{amount}</span>
  </div>
);

export default Portfolio;
