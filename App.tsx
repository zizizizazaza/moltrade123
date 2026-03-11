
import React, { useState, useEffect } from 'react';
import { Icons, COLORS } from './constants';
import { Page } from './types';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import Market from './components/Market';
import AgentMode from './components/AgentMode';
import Portfolio from './components/Portfolio';
import Chat from './components/Chat';
import AuthModal from './components/AuthModal';
import TxModal from './components/TxModal';
import Landing from './components/Landing';
import Settings from './components/Settings';
import Tasks from './components/Tasks';
import Leaderboard from './components/Leaderboard';
import TaskDetail from './components/TaskDetail';
import Groups from './components/Groups';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.LANDING);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    const handleNav = () => setCurrentPage(Page.CHAT);
    const handleNavSwap = () => setCurrentPage(Page.SWAP);
    const handleNavMarket = () => setCurrentPage(Page.MARKET);

    window.addEventListener('loka-nav-chat', handleNav);
    window.addEventListener('loka-nav-swap', handleNavSwap);
    window.addEventListener('loka-nav-market', handleNavMarket);

    return () => {
      window.removeEventListener('loka-nav-chat', handleNav);
      window.removeEventListener('loka-nav-swap', handleNavSwap);
      window.removeEventListener('loka-nav-market', handleNavMarket);
    };
  }, []);

  const triggerComingSoon = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  const connectWallet = () => {
    setShowAuthModal(true);
  };

  const handleLogin = () => {
    setIsWalletConnected(true);
    setShowAuthModal(false);
  };

  const isChatPage = currentPage === Page.CHAT;

  return (
    <div className="min-h-screen flex flex-col selection:bg-black selection:text-white overflow-x-hidden bg-[#fafafa]">
      {/* Toast Notification */}
      <div className={`fixed top-6 right-6 z-[100] transition-all duration-500 transform ${showComingSoon ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0 pointer-events-none'
        }`}>
        <div className="bg-black text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3">
          <span className="text-sm">⏳</span>
          <p className="text-xs font-bold tracking-widest ">Coming soon</p>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal
          onLogin={handleLogin}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      <TxModal />

      {/* Navbar - Refined Light Mode */}
      <nav className="sticky top-0 z-40 py-6 px-6 md:px-12 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentPage(Page.LANDING)}>
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center font-black text-white group-hover:rotate-12 transition-transform">M</div>
            <span className="text-xl font-bold tracking-tight text-black">Moltrade</span>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            <NavButton
              active={currentPage === Page.LANDING}
              onClick={() => setCurrentPage(Page.LANDING)}
              label="Home"
            />
            <NavButton
              active={currentPage === Page.CHAT}
              onClick={() => setCurrentPage(Page.CHAT)}
              label="Trade"
            />
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
                  connectWallet();
                } else {
                  setShowDropdown(!showDropdown);
                }
              }}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-widest transition-all border flex items-center justify-between gap-2.5 ${isWalletConnected
                ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-black cursor-pointer'
                : 'bg-black text-white hover:bg-gray-800 shadow-md'
                }`}
            >
              {isWalletConnected ? (
                <>
                  <span>0x71C...8e29</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </>
              ) : 'Connect'}
            </button>

            {/* Dropdown Menu */}
            {isWalletConnected && showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => {
                    setIsWalletConnected(false);
                    setShowDropdown(false);
                    if (currentPage === Page.PORTFOLIO || currentPage === Page.SETTINGS) setCurrentPage(Page.LANDING);
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

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass rounded-full p-2 flex gap-1 shadow-2xl bg-white/90">
        <MobileNavButton active={currentPage === Page.LANDING} onClick={() => setCurrentPage(Page.LANDING)} icon={<Icons.Dashboard />} />
      </div>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto ${isChatPage || currentPage === Page.LANDING ? 'p-0' : 'container mx-auto px-6 py-12'}`}>
        {currentPage !== Page.PORTFOLIO && currentPage !== Page.MARKET && currentPage !== Page.SWAP && currentPage !== Page.CHAT && currentPage !== Page.LANDING && currentPage !== Page.SETTINGS && currentPage !== Page.TASKS && currentPage !== Page.TASK_DETAIL && (
          <div className="mb-12">
            <h1 className="font-serif text-5xl md:text-7xl mb-4 text-black">
              {currentPage === Page.DASHBOARD && "MoltCash Protocol"}
              {currentPage === Page.AGENT && "Agentic Stack."}
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl">
              {currentPage === Page.DASHBOARD && "The on-chain liquidity protocol backed by US Treasuries and powered by verified AI cash flows."}
              {currentPage === Page.AGENT && "Enabling machine-to-machine economy with the x402 protocol."}
            </p>
          </div>
        )}

        {currentPage === Page.DASHBOARD && <Dashboard />}
        {currentPage === Page.SWAP && <Swap />}
        {currentPage === Page.MARKET && <Market />}
        {currentPage === Page.AGENT && <AgentMode />}
        {currentPage === Page.PORTFOLIO && <Portfolio isWalletConnected={isWalletConnected} onConnect={connectWallet} onSettingsClick={() => setCurrentPage(Page.SETTINGS)} />}
        {currentPage === Page.SETTINGS && <Settings onBack={() => setCurrentPage(Page.PORTFOLIO)} />}
        {currentPage === Page.CHAT && <Chat />}
        {currentPage === Page.TASKS && (
          <Tasks
            onSelectTask={(id) => {
              setSelectedTaskId(id);
              setCurrentPage(Page.TASK_DETAIL);
            }}
          />
        )}
        {currentPage === Page.TASK_DETAIL && selectedTaskId !== null && (
          <TaskDetail
            taskId={selectedTaskId}
            onBack={() => setCurrentPage(Page.TASKS)}
          />
        )}
        {currentPage === Page.LANDING && <Landing />}
      </main>

      {/* Footer with Manual Trigger */}
      {currentPage !== Page.CHAT && (
        <footer className="py-12 border-t border-gray-100 text-center px-6">
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-300 text-[10px]  tracking-[0.4em] font-medium">
              Powered by Setu Infrastructure &bull; 2026 MoltCash Protocol
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`text-sm font-bold tracking-wide transition-all py-1 border-b-2 ${active ? 'text-black border-black' : 'text-gray-400 hover:text-black border-transparent'
      }`}
  >
    {label}
  </button>
);

const MobileNavButton: React.FC<{ active: boolean; icon: React.ReactNode; onClick: () => void }> = ({ active, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-full transition-all ${active ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
      }`}
  >
    {icon}
  </button>
);

export default App;
