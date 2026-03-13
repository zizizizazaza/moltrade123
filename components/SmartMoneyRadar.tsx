import React, { useEffect, useState } from 'react';
import { fetchSmartMoney, SmartMoneyWalletItem } from '../api';

type SmartMoneyRadarProps = {
  selectedWallet?: string | null;
  onSelectWallet?: (wallet: SmartMoneyWalletItem) => void;
};

function shorten(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

const SmartMoneyRadar: React.FC<SmartMoneyRadarProps> = ({
  selectedWallet,
  onSelectWallet,
}) => {
  const [wallets, setWallets] = useState<SmartMoneyWalletItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSmartMoney(8);
      setWallets(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <section className="glass rounded-3xl p-6 md:p-8 bg-white border border-gray-100 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="text-sm font-bold tracking-widest text-gray-500">SMART MONEY RADAR</h3>
          <p className="text-sm text-gray-500">
            先选一个想跟随的钱包，再把地址自动带入下方的跟单任务表单。
          </p>
        </div>
        <button
          onClick={() => void reload()}
          className="px-4 py-2 rounded-full text-xs font-bold border border-gray-200 hover:border-black transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      {loading ? <p className="text-sm text-gray-500">Loading wallets...</p> : null}
      {!loading && wallets.length === 0 ? (
        <p className="text-sm text-gray-500">No smart money wallets available right now.</p>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {wallets.map((wallet, idx) => {
          const active = selectedWallet?.toLowerCase() === wallet.wallet.toLowerCase();
          return (
            <button
              key={wallet.wallet}
              type="button"
              onClick={() => onSelectWallet?.(wallet)}
              className={`text-left rounded-3xl border p-5 transition-all ${
                active ? 'border-black bg-black text-white' : 'border-gray-100 bg-[#fafafa] hover:border-black'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-[10px] font-bold tracking-[0.25em] ${active ? 'text-white/70' : 'text-gray-400'}`}>
                    RANK #{idx + 1}
                  </p>
                  <h4 className="text-lg font-bold mt-2">
                    {wallet.user_name || `Wallet ${idx + 1}`}
                  </h4>
                  <p className={`text-xs font-mono mt-2 ${active ? 'text-white/80' : 'text-gray-500'}`}>
                    {shorten(wallet.wallet)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest ${
                  active ? 'bg-white text-black' : 'bg-gray-100 text-gray-500'
                }`}>
                  {wallet.category || 'General'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                <Metric label="PnL" value={`$${Number(wallet.pnl_usd || 0).toFixed(0)}`} active={active} />
                <Metric label="7D Trades" value={String(wallet.trades_7d || 0)} active={active} />
                <Metric label="Score" value={Number(wallet.rank_score || 0).toFixed(1)} active={active} />
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className={`text-xs ${active ? 'text-white/85' : 'text-gray-500'}`}>
                  {active ? 'Selected for copy trading' : 'Use this wallet as source'}
                </span>
                <span className={`text-xs font-bold tracking-widest ${active ? 'text-white' : 'text-black'}`}>
                  SELECT
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string; active: boolean }> = ({ label, value, active }) => (
  <div className={`rounded-2xl p-3 ${active ? 'bg-white/10' : 'bg-white border border-gray-100'}`}>
    <p className={`text-[10px] font-bold tracking-widest ${active ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
    <p className="text-sm font-bold mt-1">{value}</p>
  </div>
);

export default SmartMoneyRadar;
