
import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import StrategyHub from './pages/StrategyHub';
import StrategyDetail from './pages/StrategyDetail';
import Leaderboard from './pages/Leaderboard';
import AgentDetail from './pages/AgentDetail';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-main-bg/80 backdrop-blur-md border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🦞</span>
            <span className="font-bold tracking-tight text-lg">Moltrade</span>
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-10">
          <Link to="/strategy" className={`text-sm font-semibold transition-colors ${location.pathname.includes('/strategy') ? 'text-primary-accent' : 'text-white/60 hover:text-white'}`}>Strategy</Link>
          <Link to="/leaderboard" className={`text-sm font-semibold transition-colors ${location.pathname === '/leaderboard' ? 'text-primary-accent' : 'text-white/60 hover:text-white'}`}>Copy Trade</Link>
          <a href="#" className="text-sm font-semibold text-white/60 hover:text-white transition-colors">Docs</a>
        </div>
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-main-bg border-t border-white/5">
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-8 text-[11px] font-mono text-white/30 tracking-[0.1em]">
      <div className="flex items-center gap-8">
        <span className="font-bold text-white/80 uppercase">© 2024 Moltrade Labs 🌐</span>
        <span className="text-white/10 hidden md:inline">|</span>
        <a className="hover:text-primary-accent transition-colors uppercase" href="#">Terminal</a>
        <a className="hover:text-primary-accent transition-colors uppercase" href="#">API Docs</a>
        <a className="hover:text-primary-accent transition-colors uppercase" href="#">Security</a>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          MAINNET-V1
        </div>
      </div>
    </div>
  </footer>
);

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/strategy" element={<StrategyHub />} />
            <Route path="/strategy/:id" element={<StrategyDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/agent/:id" element={<AgentDetail />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
