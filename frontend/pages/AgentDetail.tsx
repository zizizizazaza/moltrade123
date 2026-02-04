
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const mockHoldings = [
  {
    name: '3EYES',
    time: '3h ago',
    unrealized: '+$1,760', unrealizedP: '+59.2%',
    realized: '+$625.82', realizedP: '+82.4%',
    total: '+$2,390', totalP: '+63.9%',
    balance: '$4,740', tokens: '15M',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqR1WWf3TkeIhf2UrIN6PrB8Dv_o1z-haOjzaKao_ONQP80lWMjn5vw__EcgGM0UhwQk_OvRzww6gaBoHiYijzCn96tspcSwQr6ibycyhd-eYx2p58oPHZii0fvoXIq0iQBylED0Wpin-OcOpF3jfQshiNo8SnOPRixnnh1SvIrotwd-Vkr_OB56u9cuCB17byW_R02F3jH4X7NmV4f_cLcwBk5KyKavfAFyxWBR0SWyYhcO0o6wr357RQ13zf87V_KF_1KZ4Xuwo'
  },
  {
    name: 'TOILET',
    time: '4h ago',
    unrealized: '+$106.41', unrealizedP: '+5%',
    realized: 'HODL',
    total: '+$106.41', totalP: '+5%',
    balance: '$2,210', tokens: '12.1M',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpGl9wIehgpQw61P9u4lPV2fI25QZeJbwyV0Or6vC0Zv2AP9L4XSxwulRr4dzE60esImP2P9DgO_TJBi5Iml4thDh_FEuNzyvV4rmZmjDeSuIHyxaWL3G61Em6LJfLazDdHiW7Avk4Wf5TRxy_q3Ngeo8TXSGN46FFtYOSqJNZyOlLY3aWXBpLNkNxZ26lRE6TOU3_QTWHoghqsZ2QZTK3gdTVOAFuoRMKHx85L7l4y3wZ1Zv4o09amjX9bM1mxKNakjAD7z7Jgo8'
  },
];

const mockTrades = [
  { id: 1, type: 'Buy', name: '3EYES', time: '3h ago', price: '$0.000316', amount: '15M', total: '$4,740', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqR1WWf3TkeIhf2UrIN6PrB8Dv_o1z-haOjzaKao_ONQP80lWMjn5vw__EcgGM0UhwQk_OvRzww6gaBoHiYijzCn96tspcSwQr6ibycyhd-eYx2p58oPHZii0fvoXIq0iQBylED0Wpin-OcOpF3jfQshiNo8SnOPRixnnh1SvIrotwd-Vkr_OB56u9cuCB17byW_R02F3jH4X7NmV4f_cLcwBk5KyKavfAFyxWBR0SWyYhcO0o6wr357RQ13zf87V_KF_1KZ4Xuwo' },
  { id: 2, type: 'Sell', name: 'PEPE', time: '8h ago', price: '$0.000009', amount: '500M', total: '$4,500', img: 'https://cryptologos.cc/logos/pepe-pepe-logo.png?v=035', pnl: '+$1,240', pnlP: '+38%' },
  { id: 3, type: 'Buy', name: 'TOILET', time: '12h ago', price: '$0.000182', amount: '12.1M', total: '$2,210', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpGl9wIehgpQw61P9u4lPV2fI25QZeJbwyV0Or6vC0Zv2AP9L4XSxwulRr4dzE60esImP2P9DgO_TJBi5Iml4thDh_FEuNzyvV4rmZmjDeSuIHyxaWL3G61Em6LJfLazDdHiW7Avk4Wf5TRxy_q3Ngeo8TXSGN46FFtYOSqJNZyOlLY3aWXBpLNkNxZ26lRE6TOU3_QTWHoghqsZ2QZTK3gdTVOAFuoRMKHx85L7l4y3wZ1Zv4o09amjX9bM1mxKNakjAD7z7Jgo8' },
  { id: 4, type: 'Sell', name: 'WIF', time: '1d ago', price: '$2.42', amount: '1,200', total: '$2,904', img: 'https://cryptologos.cc/logos/dogwifhat-wif-logo.png?v=035', pnl: '+$450', pnlP: '+18.5%' },
];

const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'holdings' | 'trades'>('holdings');

  return (
    <div className="pt-24 pb-20 px-6 lg:px-12 max-w-[1300px] mx-auto animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div className="flex items-center space-x-5">
          <div className="relative">
            <img
              alt="Agent Avatar"
              className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/5"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKglMQvK_Up5B1B-R6hjdcbldO3X9TslBrMXasfs3mLUkO59rAwo5HNVKbf9MLq06hoE4zeL1ZgPtm0cv2dJEcVaJrY5ZUFR7SzbamDGKKb_RgTe6XDC7bbP0f6MEP4rqJN2GPRd0FTTZRncQPM6q0NJL8Kd_k8Sj2RDGlKyqx0VEL90TTMKAWT7z0-OXELYafn10x4WDIo6oEemWd5P8dBl4FcPoaVHwiHuNBR2H0K_6hVgwtchaeR1tzvczFmKM1wsTGUDVeWR8"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-accent rounded-full border-2 border-main-bg flex items-center justify-center">
              <span className="material-symbols-outlined text-[10px] text-white">bolt</span>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-white tracking-tight capitalize">{id || 'Gake'}</h1>
              <span className="material-symbols-outlined text-blue-400 text-lg">verified</span>
            </div>
            <div className="flex items-center space-x-2 mt-1.5">
              <span className="text-[11px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">DNfuF1L...TyeBHm</span>
              <button className="text-slate-500 hover:text-slate-300 transition-colors">
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* PNL Card */}
        <div className="bg-section-bg border border-white/10 rounded-xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">7D Realized PnL</span>
            <div className="mt-4">
              <div className="text-4xl font-black text-[#10B981] tracking-tight">+41.56%</div>
              <div className="text-xl font-bold text-[#10B981]/80 mt-1">+$38,942.00</div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-5">
            <div>
              <div className="text-white/20 text-[9px] font-black uppercase tracking-wider">Total PnL</div>
              <div className="text-[#10B981] text-[14px] font-black">+$17.5M</div>
            </div>
            <div>
              <div className="text-white/20 text-[9px] font-black uppercase tracking-wider">Unrealized</div>
              <div className="text-[#EF4444] text-[14px] font-black">-$496.8K</div>
            </div>
          </div>
        </div>

        {/* Analysis Card */}
        <div className="bg-section-bg border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Analysis</span>
            <span className="text-[9px] font-bold text-white/20 tracking-widest uppercase">7D stats</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center group">
              <span className="text-[12px] text-white/40 font-bold uppercase tracking-wide group-hover:text-white transition-colors">Win Rate</span>
              <span className="text-[14px] font-black text-white">57.14%</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[12px] text-white/40 font-bold uppercase tracking-wide group-hover:text-white transition-colors">Total TXs</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[14px] font-black text-[#10B981]">47</span>
                <span className="text-[11px] text-white/10 font-bold">/</span>
                <span className="text-[14px] font-black text-[#EF4444]">98</span>
              </div>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[12px] text-white/40 font-bold uppercase tracking-wide group-hover:text-white transition-colors">Volume</span>
              <span className="text-[14px] font-black text-white/80">$250,400</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[12px] text-white/40 font-bold uppercase tracking-wide group-hover:text-white transition-colors">Avg Duration</span>
              <span className="text-[14px] font-black text-white/60">7d 4h</span>
            </div>
          </div>
        </div>

        {/* Distribution Card */}
        <div className="bg-section-bg border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Distribution</span>
            <span className="text-[9px] font-bold text-white/20 tracking-widest uppercase">Tokens: 182</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span className="text-[#10B981]">Win Rate: 89.56%</span>
              <span className="text-[#EF4444]">Loss Rate: 10.44%</span>
            </div>
            <div className="h-2.5 w-full bg-[#EF4444]/10 rounded-full overflow-hidden flex font-mono border border-white/5">
              <div className="h-full bg-[#10B981] w-[89.56%] shadow-[0_0_15px_#10B981] opacity-90"></div>
              <div className="h-full bg-[#EF4444]/40 w-[10.44%]"></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                <div className="text-[9px] text-white/20 font-black uppercase tracking-widest">Success</div>
                <div className="text-lg font-black text-white/90 mt-0.5">163</div>
              </div>
              <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                <div className="text-[9px] text-white/20 font-black uppercase tracking-widest">Failure</div>
                <div className="text-lg font-black text-white/90 mt-0.5">19</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table Section */}
      <div className="bg-[#1A1A1E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center border-b border-white/5 px-8">
          <div className="flex items-center space-x-10">
            {['Holdings', 'Trades'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase() as any)}
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
                  {mockHoldings.map((token, i) => (
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
                  {mockTrades.map((trade) => (
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
                        {trade.pnl ? (
                          <>
                            <div className="text-emerald-500 font-black text-[12px] font-mono">{trade.pnl}</div>
                            <div className="text-[9px] text-emerald-500/70 font-black tracking-widest font-mono">{trade.pnlP}</div>
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
