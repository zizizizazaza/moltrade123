import React, { useEffect, useState } from 'react';
import { fetchSmartMoney, SmartMoneyWalletItem } from '../api';

type AgentRow = {
  id: number;
  name: string;
  address: string;
  points: number;
  credits: number;
  deposit: number;
  rank: number;
};

const mockAgents: AgentRow[] = [
  { id: 1, name: 'Agent Smith', address: '0x1A2...4bC', points: 15400, credits: 8200, deposit: 4200.5, rank: 1 },
  { id: 2, name: 'Neo', address: '0x7B9...2fA', points: 12100, credits: 6500, deposit: 3150, rank: 2 },
  { id: 3, name: 'Morpheus', address: '0x9E1...8dC', points: 9800, credits: 5400, deposit: 2500, rank: 3 },
];

function shorten(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

function toAgentRows(rows: SmartMoneyWalletItem[]): AgentRow[] {
  return rows.map((row, idx) => {
    const credits = Math.max(0, Math.round(Number(row.trades_7d || 0) * 120 + Number(row.rank_score || 0) * 18));
    const points = Math.max(0, Math.round(Number(row.pnl_usd || 0) + Number(row.rank_score || 0) * 25));
    const deposit = Math.max(0, Number(row.pnl_usd || 0));
    return {
      id: idx + 1,
      name: row.user_name || `Wallet ${idx + 1}`,
      address: shorten(row.wallet),
      points,
      credits,
      deposit,
      rank: idx + 1,
    };
  });
}

const Leaderboard: React.FC = () => {
  const [agents, setAgents] = useState<AgentRow[]>(mockAgents);

  useEffect(() => {
    let mounted = true;
    fetchSmartMoney(20)
      .then((rows) => {
        if (!mounted || !rows.length) return;
        setAgents(toAgentRows(rows));
      })
      .catch(() => {
        // fallback to mock data
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="mb-12">
        <h1 className="font-serif text-3xl md:text-5xl mb-4 text-black italic">Agent Leaderboard</h1>
        <p className="text-gray-500 text-base max-w-2xl font-medium tracking-wide">
          Top performing agents ranked by Credits, Points, and deposited value.
        </p>
      </div>

      <div className="glass rounded-[40px] p-6 md:p-10 bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">
                <th className="py-4 px-4 w-24">Rank</th>
                <th className="py-4 px-4">Agent Name</th>
                <th className="py-4 px-4 text-right">Compute Credits</th>
                <th className="py-4 px-4 text-right">MoltCash Points</th>
                <th className="py-4 px-4 text-right">Deposit (USDC)</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className={`border-b border-gray-50/50 hover:bg-gray-50/50 transition-colors ${agent.rank <= 3 ? 'bg-green-50/20' : ''}`}
                >
                  <td className="py-6 px-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        agent.rank === 1
                          ? 'bg-yellow-100 text-yellow-700'
                          : agent.rank === 2
                            ? 'bg-gray-200 text-gray-700'
                            : agent.rank === 3
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {agent.rank}
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex flex-col">
                      <span className="font-serif text-lg text-black font-bold italic">{agent.name}</span>
                      <span className="text-xs text-gray-400 font-mono tracking-widest mt-1">{agent.address}</span>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-right space-x-2">
                    <span className="font-bold text-black text-lg">{agent.credits.toLocaleString()}</span>
                    <span className="text-xs text-blue-500 tracking-widest uppercase">Credits</span>
                  </td>
                  <td className="py-6 px-4 text-right space-x-2">
                    <span className="font-bold text-black text-lg">{agent.points.toLocaleString()}</span>
                    <span className="text-xs text-[#00E676] tracking-widest uppercase">Points</span>
                  </td>
                  <td className="py-6 px-4 text-right font-mono text-black font-bold tracking-tight">
                    ${agent.deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
