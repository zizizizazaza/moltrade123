
import React, { useEffect, useRef, useState } from 'react';
import { useLogin, usePrivy, useSigners, useWallets } from '@privy-io/react-auth';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Icons } from './constants';
import { setApiAuthTokenProvider, syncUserWallet } from './api';
import { config } from './config';
import CopyTradePanel from './components/CopyTradePanel';
import Landing from './components/Landing';
import TradePage from './components/TradePage';
import TxModal from './components/TxModal';
import SmartMoneyPage from './components/SmartMoneyPage';
import TraderDetailPage from './components/TraderDetailPage';

type WalletLike = {
  address?: string;
  connectorType?: string;
  walletClientType?: string;
  walletClient?: string;
};

function isOAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const q = window.location.search || '';
  return /[?&](code|state|privy_oauth)=/i.test(q) || q.includes('code=') || q.includes('state=');
}

function clearOAuthParams(): void {
  if (typeof window === 'undefined') return;
  const url = window.location.pathname || '/';
  window.history.replaceState({}, '', url);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickPrimaryConnectedPrivyWallet(wallets: WalletLike[] | undefined): WalletLike | null {
  if (!wallets?.length) return null;
  const embedded = wallets.find((wallet) => {
    const connectorType = String(wallet.connectorType || '').toLowerCase();
    const walletClientType = String(wallet.walletClientType || '').toLowerCase();
    const walletClient = String(wallet.walletClient || '').toLowerCase();
    return (
      connectorType === 'embedded' ||
      walletClientType === 'privy' ||
      walletClient === 'privy'
    );
  });
  return embedded || null;
}

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticated, logout, ready, getAccessToken, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { addSigners } = useSigners();
  const { login } = useLogin({
    onComplete: () => {},
    onError: (error) => {
      console.error('Privy login failed', error);
    },
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [oauthCallbackInProgress, setOauthCallbackInProgress] = useState(() => isOAuthCallback());
  const syncedWalletRef = useRef<string | null>(null);
  const syncingWalletRef = useRef<string | null>(null);

  const primaryWallet = pickPrimaryConnectedPrivyWallet(
    wallets as unknown as WalletLike[] | undefined
  );
  const primaryWalletAddress = primaryWallet?.address || null;
  const isWalletConnected = ready && authenticated;
  const displayAddress = primaryWalletAddress
    ? `${primaryWalletAddress.slice(0, 5)}...${primaryWalletAddress.slice(-4)}`
    : 'Connect';

  useEffect(() => {
    setApiAuthTokenProvider(async () => {
      try {
        return await getAccessToken();
      } catch {
        return null;
      }
    });
    return () => {
      setApiAuthTokenProvider(null);
    };
  }, [getAccessToken]);

  useEffect(() => {
    if (!ready || !authenticated || !walletsReady) return;
    const addr = primaryWalletAddress;
    if (!addr) return;
    if (syncedWalletRef.current === addr.toLowerCase()) return;
    if (syncingWalletRef.current === addr.toLowerCase()) return;

    (async () => {
      syncingWalletRef.current = addr.toLowerCase();
      console.log('[privy] start wallet sync flow', {
        userId: user?.id,
        walletAddress: addr,
        wallets: (wallets as unknown as WalletLike[] | undefined)?.map((wallet) => ({
          address: wallet.address,
          walletClientType: wallet.walletClientType,
          connectorType: wallet.connectorType,
        })),
      });

      if (config.privyKeyQuorumId) {
        try {
          let result: unknown = null;
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
              result = await addSigners({
                address: addr,
                signers: [
                  {
                    signerId: config.privyKeyQuorumId,
                    policyIds: [],
                  },
                ],
              });
              break;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              if (/duplicate signer\(s\) provided/i.test(msg)) {
                console.log('[privy] signer already attached, continue', {
                  walletAddress: addr,
                  signerId: config.privyKeyQuorumId,
                });
                result = { duplicate: true };
                break;
              }
              if (!/wallet proxy not initialized/i.test(msg) || attempt === 3) {
                throw err;
              }
              console.warn(`[privy] addSigners retry ${attempt} after wallet proxy init wait`);
              await sleep(1200);
            }
          }
          console.log('[privy] addSigners result', {
            walletAddress: addr,
            signerId: config.privyKeyQuorumId,
            result,
          });
        } catch (err) {
          console.error('[privy] addSigners failed', err);
        }
      } else {
        console.error('[privy] privyKeyQuorumId is not configured');
      }

      console.log('[privy] calling syncUserWallet', { walletAddress: addr });
      await syncUserWallet(addr);
      syncedWalletRef.current = addr.toLowerCase();
    })()
      .catch((err) => {
        console.error('[privy] sync wallet failed', err);
      })
      .finally(() => {
        syncingWalletRef.current = null;
      });
  }, [ready, authenticated, walletsReady, primaryWalletAddress, addSigners, user?.id, wallets]);

  useEffect(() => {
    setShowDropdown(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!oauthCallbackInProgress) return;
    if (ready && authenticated) {
      setOauthCallbackInProgress(false);
      clearOAuthParams();
      return;
    }
    const t = setTimeout(() => {
      setOauthCallbackInProgress(false);
      clearOAuthParams();
    }, 12000);
    return () => clearTimeout(t);
  }, [ready, authenticated, oauthCallbackInProgress]);

  const openLoginModal = () => {
    if (!ready || authenticated) return;
    login({
      loginMethods: ['google', 'twitter', 'wallet'],
    });
  };

  if (oauthCallbackInProgress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] selection:bg-black selection:text-white">
        <div className="animate-fadeIn flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-black tracking-wide">Signing you in...</p>
        </div>
      </div>
    );
  }

  const hideFooter = location.pathname === '/trade';

  return (
    <div className="min-h-screen flex flex-col selection:bg-black selection:text-white overflow-x-clip bg-[#fafafa]">
      <TxModal />

      <nav className="sticky top-0 z-50 py-6 px-6 md:px-12 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-12">
          <NavLink to="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center font-black text-white group-hover:rotate-12 transition-transform">M</div>
            <span className="text-xl font-bold tracking-tight text-black">Moltrade</span>
          </NavLink>

          <div className="hidden lg:flex items-center gap-10">
            <NavButton to="/" label="Home" />
            <NavButton to="/trade" label="Trade" />
            <NavButton to="/smartmoney" label="Smart Money" />
            <NavButton to="/copytrade" label="Copytrade" />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('loka-open-modal', { detail: 'deposit' }));
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all border border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black hover:shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m0 0l-4-4m4 4l4-4" /></svg>
            Deposit
          </button>

          <div className="relative">
            <button
              onClick={() => {
                if (!isWalletConnected) {
                  openLoginModal();
                } else {
                  setShowDropdown((prev) => !prev);
                }
              }}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-widest transition-all border flex items-center justify-between gap-2.5 ${
                isWalletConnected
                  ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-black cursor-pointer'
                  : 'bg-black text-white hover:bg-gray-800 shadow-md'
              }`}
            >
              {isWalletConnected ? (
                <>
                  <span>{displayAddress}</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </>
              ) : (
                'Connect'
              )}
            </button>

            {isWalletConnected && showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => {
                    logout();
                    setShowDropdown(false);
                    navigate('/');
                  }}
                  className="w-full text-left px-5 py-3 text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass rounded-full p-2 flex gap-1 shadow-2xl bg-white/90">
        <MobileNavButton to="/" icon={<Icons.Dashboard />} />
        <MobileNavButton to="/trade" icon={<span className="text-xs font-bold">T</span>} />
        <MobileNavButton to="/smartmoney" icon={<span className="text-xs font-bold">S</span>} />
        <MobileNavButton to="/copytrade" icon={<span className="text-xs font-bold">C</span>} />
      </div>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/smartmoney" element={<SmartMoneyPage />} />
          <Route path="/smartmoney/:wallet" element={<TraderDetailPage />} />
          <Route path="/copytrade" element={<CopyTradePanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!hideFooter && (
        <footer className="py-12 border-t border-gray-100 text-center px-6">
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-300 text-[10px] tracking-[0.4em] font-medium">
              Powered by Setu Infrastructure &bull; 2026 MoltCash Protocol
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

const NavButton: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) => `text-sm font-bold tracking-wide transition-all py-1 border-b-2 ${
      isActive ? 'text-black border-black' : 'text-gray-400 hover:text-black border-transparent'
    }`}
  >
    {label}
  </NavLink>
);

const MobileNavButton: React.FC<{ to: string; icon: React.ReactNode }> = ({ to, icon }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) => `p-3 rounded-full transition-all ${
      isActive ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
    }`}
  >
    {icon}
  </NavLink>
);

export default App;
