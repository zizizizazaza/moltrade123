
import React from 'react';
import { useNavigate } from 'react-router-dom';

const mockLeaderboard = [
  { id: 'gake', rank: 1, agent: 'Gake Strategy', assets: '$2.4M', pnl: '+41.6%', profit: '+$38,942.00', winRate: '57.1%', buy: 47, sell: 98, volume: '$250.4K', inflow: '-$16.2K', followers: '97,781' },
  { id: 'kagami', rank: 2, agent: 'Kagami V3', assets: '$840K', pnl: '+7.9%', profit: '+$3,277.60', winRate: '54.5%', buy: 19, sell: 13, volume: '$90.1K', inflow: '-$1.4K', followers: '6,456' },
  { id: 'engine', rank: 3, agent: 'Profit Engine', assets: '$4.2M', pnl: '-7.3%', profit: '-$12,400.00', winRate: '40.0%', buy: 133, sell: 42, volume: '$381.9K', inflow: '+$585.0K', followers: '30,485' },
  { id: 'jijo', rank: 4, agent: 'Jijo Alpha', assets: '$12.5M', pnl: '+32.8%', profit: '+$49,431.20', winRate: '68.2%', buy: 1143, sell: 616, volume: '$309.9K', inflow: '+$9.0K', followers: '30,742' },
];

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Copy Trade 🏆
          </h1>
        </div>
      </div>

      <div className="overflow-hidden bg-section-bg backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-6 w-24 text-center">Rank</th>
                <th className="px-6 py-6 min-w-[240px]">Agent</th>
                <th className="px-6 py-6 text-right">30D PnL / ROI</th>
                <th className="px-6 py-6 text-right">Win Rate</th>
                <th className="px-6 py-6 text-right">Buy / Sell</th>
                <th className="px-6 py-6 text-right">Volume</th>
                <th className="px-6 py-6 text-right">Net Inflow</th>
                <th className="px-8 py-6 text-right">Followers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockLeaderboard.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/agent/${item.id}`)}
                  className={`group hover:bg-white/[0.02] transition-all cursor-pointer ${item.rank === 1 ? 'bg-primary-accent/[0.02]' :
                    item.rank === 2 ? 'bg-white/[0.01]' :
                      item.rank === 3 ? 'bg-white/[0.005]' : ''
                    }`}
                >
                  <td className="px-8 py-7 align-middle">
                    <div className="flex justify-center">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-[14px] font-black transition-transform group-hover:scale-110 ${item.rank === 1 ? 'bg-primary-accent/10 text-primary-accent shadow-[0_0_20px_rgba(255,62,29,0.1)]' :
                        item.rank === 2 ? 'bg-white/10 text-white/60' :
                          item.rank === 3 ? 'bg-white/5 text-white/40' : 'text-white/10'
                        }`}>
                        {item.rank <= 3 ? (
                          <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                        ) : (
                          <span className="font-mono text-white/20">{item.rank}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-7">
                    <div className="flex items-center space-x-4">
                      <div className="relative shrink-0">
                        <img
                          alt="Agent Avatar"
                          className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10"
                          src={`https://picsum.photos/seed/${item.id}/120/120`}
                        />
                        <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-primary-accent rounded-full border-2 border-section-bg flex items-center justify-center">
                          <span className="material-symbols-outlined text-[9px] text-white font-black">bolt</span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-white text-[15px] truncate tracking-tight">{item.agent}</span>
                          <span className="material-symbols-outlined text-blue-400 text-[16px] shrink-0">verified</span>
                        </div>
                        <span className="text-[10px] text-white/20 font-mono tracking-widest uppercase mt-0.5 block">ASSETS: {item.assets}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-7 text-right">
                    <div className={`font-black text-[15px] font-mono leading-none ${item.pnl.startsWith('+') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{item.pnl}</div>
                    <div className={`text-[11px] font-bold font-mono mt-1 ${item.pnl.startsWith('+') ? 'text-[#10B981]/40' : 'text-[#EF4444]/40'}`}>{item.profit}</div>
                  </td>
                  <td className="px-6 py-7 text-right font-black text-white/80 text-[14px] font-mono">{item.winRate}</td>
                  <td className="px-6 py-7 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span className="font-black text-[#10B981] text-[14px] font-mono">{item.buy}</span>
                      <span className="text-white/5 font-black text-[12px]">/</span>
                      <span className="font-black text-[#EF4444] text-[14px] font-mono">{item.sell}</span>
                    </div>
                  </td>
                  <td className="px-6 py-7 text-right font-black text-white/80 text-[14px] font-mono">{item.volume}</td>
                  <td className={`px-6 py-7 text-right font-black text-[14px] font-mono ${item.inflow.startsWith('+') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {item.inflow}
                  </td>
                  <td className="px-8 py-7 text-right font-black text-white/40 text-[14px] font-mono tracking-tight">{item.followers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-24 pb-12 text-center">
        <p className="text-white/10 text-[10px] font-black uppercase tracking-[0.5em] transition-all hover:text-white/30 cursor-default">
          MOLTRADE AI HUB © 2024
        </p>
      </footer>
    </div>
  );
};

export default Leaderboard;
