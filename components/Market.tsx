
import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Icons, COLORS } from '../constants';
import { MarketAsset } from '../types';
import { BackendMarketItem, fetchMarkets } from '../api';

const MOCK_ASSETS: MarketAsset[] = [
  {
    id: '1',
    title: 'ComputeDAO - GPU Expansion Batch #4',
    subtitle: 'Scaling H100 clusters for generative AI rendering.',
    category: 'Compute',
    issuer: 'ComputeDAO LLC',
    issuerLogo: 'https://images.unsplash.com/photo-1599305096101-fe118399c63b?auto=format&fit=crop&q=80&w=100',
    faceValue: 100,
    askPrice: 97.00,
    apy: 15.5,
    durationDays: 60,
    creditScore: 820,
    status: 'Funded',
    targetAmount: 500000,
    raisedAmount: 500000,
    backersCount: 124,
    remainingCap: 0,
    coverageRatio: 1.5,
    verifiedSource: 'Stripe API',
    description: 'We are ComputeDAO, operating over 500 GPUs in Singapore. This funding batch will be used to prepay electricity and bandwidth expansion for our next month of generative AI rendering contracts.',
    useOfFunds: 'Prepaying electricity and bandwidth expansion for H100 clusters.',
    monthlyRevenue: [
      { month: 'Aug', amount: 700000 },
      { month: 'Sep', amount: 760000 },
      { month: 'Oct', amount: 850000 },
      { month: 'Nov', amount: 920000 },
      { month: 'Dec', amount: 1100000 },
      { month: 'Jan', amount: 1200000 }
    ],
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    title: 'Shopify Merchant Cluster X',
    subtitle: 'High-growth e-commerce receivables financing.',
    category: 'E-commerce',
    issuer: 'DropStream LLC',
    issuerLogo: 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&q=80&w=100',
    faceValue: 500,
    askPrice: 485.20,
    apy: 8.9,
    durationDays: 30,
    creditScore: 780,
    status: 'Fundraising',
    targetAmount: 200000,
    raisedAmount: 185000,
    backersCount: 89,
    remainingCap: 15000,
    coverageRatio: 1.8,
    verifiedSource: 'Shopify Partners',
    description: 'Financing future receivables for a top-tier collection of Shopify merchants. Proven track record with over $10M in processed volume.',
    useOfFunds: 'Inventory financing for seasonal peak demand.',
    monthlyRevenue: [
      { month: 'Aug', amount: 350000 },
      { month: 'Sep', amount: 410000 },
      { month: 'Oct', amount: 450000 },
      { month: 'Nov', amount: 620000 },
      { month: 'Dec', amount: 950000 },
      { month: 'Jan', amount: 500000 }
    ],
    coverImage: 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    title: 'Vercel Enterprise Flow',
    subtitle: 'Pre-paying annual SaaS subscriptions.',
    category: 'SaaS',
    issuer: 'CloudScale SaaS',
    issuerLogo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=100',
    faceValue: 1000,
    askPrice: 968.00,
    apy: 10.2,
    durationDays: 90,
    creditScore: 850,
    status: 'Fundraising',
    targetAmount: 1000000,
    raisedAmount: 420000,
    backersCount: 56,
    remainingCap: 580000,
    coverageRatio: 2.1,
    verifiedSource: 'QuickBooks Verified',
    description: 'CloudScale provides enterprise-grade Vercel integrations. We are raising to bridge the gap between monthly hosting costs and annual contract payments.',
    useOfFunds: 'Infrastructure scaling and developer headcount.',
    monthlyRevenue: [
      { month: 'Aug', amount: 280000 },
      { month: 'Sep', amount: 295000 },
      { month: 'Oct', amount: 300000 },
      { month: 'Nov', amount: 310000 },
      { month: 'Dec', amount: 325000 },
      { month: 'Jan', amount: 340000 }
    ],
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    title: 'ArtBot Creative Batch',
    subtitle: 'AI-generated art royalties advance.',
    category: 'SaaS',
    issuer: 'ArtBot AI Inc.',
    issuerLogo: 'https://images.unsplash.com/photo-1572044162444-ad60f128bde2?auto=format&fit=crop&q=80&w=100',
    faceValue: 100,
    askPrice: 95.00,
    apy: 12.4,
    durationDays: 45,
    creditScore: 710,
    status: 'Failed',
    targetAmount: 150000,
    raisedAmount: 45000,
    backersCount: 230,
    remainingCap: 105000,
    coverageRatio: 1.2,
    verifiedSource: 'API Oracle',
    description: 'ArtBot is a leading generative AI platform for digital artists. This batch secures future subscription revenue from our pro tier users.',
    useOfFunds: 'R&D for new diffusion models.',
    monthlyRevenue: [
      { month: 'Aug', amount: 110000 },
      { month: 'Sep', amount: 125000 },
      { month: 'Oct', amount: 150000 },
      { month: 'Nov', amount: 170000 },
      { month: 'Dec', amount: 190000 },
      { month: 'Jan', amount: 210000 }
    ],
    coverImage: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&q=80&w=800'
  }
];

function mapMarketItemToAsset(item: BackendMarketItem, idx: number): MarketAsset {
  const yes = Number(item.yes_price || 0);
  const discount = Math.max(0.01, Math.min(0.99, yes));
  const faceValue = 100;
  const askPrice = Number((faceValue * discount).toFixed(2));
  const targetAmount = Math.max(50000, Math.round(Number(item.liquidity || 0) || 50000));
  const raisedAmount = Math.max(
    0,
    Math.min(targetAmount, Math.round(Number(item.volume || 0) || targetAmount * 0.6))
  );
  const progress = targetAmount > 0 ? raisedAmount / targetAmount : 0;
  let status: MarketAsset['status'] = 'Fundraising';
  if (!item.active) status = 'Failed';
  else if (progress >= 1) status = 'Funded';
  else if (progress >= 0.85) status = 'Ending Soon';

  return {
    id: item.market_id,
    title: item.question,
    subtitle: item.slug,
    category:
      item.category?.toLowerCase().includes('crypto')
        ? 'Compute'
        : item.category?.toLowerCase().includes('sports')
          ? 'E-commerce'
          : 'SaaS',
    issuer: 'Polymarket',
    issuerLogo:
      'https://images.unsplash.com/photo-1599305096101-fe118399c63b?auto=format&fit=crop&q=80&w=100',
    faceValue,
    askPrice,
    apy: Number((8 + yes * 12).toFixed(1)),
    durationDays: 30 + ((idx % 3) + 1) * 15,
    creditScore: 700 + Math.round(yes * 200),
    status,
    targetAmount,
    raisedAmount,
    backersCount: Math.max(10, Math.round((Number(item.volume || 0) + 1) / 1000)),
    remainingCap: Math.max(0, targetAmount - raisedAmount),
    coverageRatio: Number((1.1 + yes).toFixed(2)),
    verifiedSource: 'Polymarket API',
    description: item.question,
    useOfFunds: 'Market position funding via Polymarket CLOB.',
    monthlyRevenue: [
      { month: 'Aug', amount: Math.max(50000, raisedAmount * 0.6) },
      { month: 'Sep', amount: Math.max(55000, raisedAmount * 0.7) },
      { month: 'Oct', amount: Math.max(60000, raisedAmount * 0.8) },
      { month: 'Nov', amount: Math.max(65000, raisedAmount * 0.9) },
      { month: 'Dec', amount: Math.max(70000, raisedAmount) },
      { month: 'Jan', amount: Math.max(75000, raisedAmount * 1.1) },
    ],
    coverImage:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
  };
}

const Market: React.FC = () => {
  const [assets, setAssets] = useState<MarketAsset[]>(MOCK_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [filter, setFilter] = useState<'All' | 'Fundraising' | 'Funded' | 'Failed'>('All');

  const filteredAssets = useMemo(() => {
    if (filter === 'All') return assets;
    return assets.filter(a => a.status === filter);
  }, [filter, assets]);

  useEffect(() => {
    let mounted = true;
    fetchMarkets(60)
      .then((rows) => {
        if (!mounted || !rows.length) return;
        setAssets(rows.map(mapMarketItemToAsset));
      })
      .catch(() => {
        // fallback to mock assets
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleOpenAsset = (e: Event) => {
      const customEvent = e as CustomEvent;
      const match = assets.find(a => a.title.includes(customEvent.detail));
      if (match) setSelectedAsset(match);
    };

    window.addEventListener('loka-open-asset', handleOpenAsset);
    return () => window.removeEventListener('loka-open-asset', handleOpenAsset);
  }, [assets]);

  if (selectedAsset) {
    return (
      <AssetDetail
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn pb-24">
      {/* 1. Header & Filters */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="font-serif text-5xl text-black italic">Cash Flow Market.</h2>
          <p className="text-gray-400 mt-2 font-medium">Invest in the future cash flow of verified businesses.</p>
        </div>
        <div className="flex bg-white glass p-1 rounded-full border border-gray-100 shadow-sm overflow-x-auto">
          {['All', 'Fundraising', 'Funded', 'Failed'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap ${filter === cat ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black hover:bg-gray-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 2. Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredAssets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onClick={() => setSelectedAsset(asset)}
          />
        ))}
      </div>
    </div>
  );
};

const AssetCard: React.FC<{ asset: MarketAsset; onClick: () => void }> = ({ asset, onClick }) => {
  const progress = Math.min(100, (asset.raisedAmount / asset.targetAmount) * 100);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-black/10 transition-all cursor-pointer group shadow-sm flex flex-col h-full"
    >
      {/* Header - Cover Image & Badges */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={asset.coverImage}
          alt={asset.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Top Badges */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white/95 backdrop-blur-lg px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide shadow-xl border border-white/40 text-black">
            {asset.status === 'Fundraising' ? '🔥 Fundraising' :
              asset.status === 'Funded' ? '✅ Funded' :
                asset.status === 'Failed' ? '🔒 Failed' :
                  asset.status}
          </div>
        </div>
      </div>

      {/* Body - Project Info */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Company Info */}
        <div className="flex items-center gap-2 mb-3">
          <img
            src={asset.issuerLogo}
            alt={asset.issuer}
            className="w-5 h-5 rounded-full object-cover border border-gray-100"
          />
          <span className="text-[9px] font-bold text-gray-400  tracking-widest truncate">{asset.issuer}</span>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-bold text-black group-hover:text-gray-600 transition-colors line-clamp-1">{asset.title}</h4>
          <p className="text-[10px] text-gray-400 font-medium mt-1 line-clamp-2 leading-relaxed">{asset.subtitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100/50">
            <p className="text-[7px] font-bold text-gray-400  tracking-widest mb-1">Target</p>
            <p className="text-[10px] font-bold text-black">${(asset.targetAmount / 1000).toFixed(0)}k</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100/50">
            <p className="text-[7px] font-bold text-gray-400  tracking-widest mb-1">APY</p>
            <p className="text-[10px] font-bold text-[#00E676]">{asset.apy}%</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100/50">
            <p className="text-[7px] font-bold text-gray-400  tracking-widest mb-1">Term</p>
            <p className="text-[10px] font-bold text-black">{asset.durationDays}d</p>
          </div>
        </div>

        {/* Footer - Progress */}
        <div className="mt-auto space-y-2.5">
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00E676] transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-black">${asset.raisedAmount.toLocaleString()} <span className="text-gray-400 font-medium tracking-wide">pledged</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 tracking-tighter">{progress.toFixed(0)}% <span className="text-gray-300">&bull;</span> {asset.backersCount} backers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssetDetail: React.FC<{ asset: MarketAsset; onClose: () => void }> = ({ asset, onClose }) => {
  const [purchaseQty, setPurchaseQty] = useState('');
  const [activeTab, setActiveTab] = useState<'STORY' | 'AGREEMENT' | 'FINANCIALS'>('STORY');
  const [txTab, setTxTab] = useState<'buy' | 'sell'>('buy');

  const progress = Math.min(100, (asset.raisedAmount / asset.targetAmount) * 100);
  const faceValueEquiv = parseFloat(purchaseQty) / (asset.askPrice / asset.faceValue) || 0;
  const netProfit = faceValueEquiv - parseFloat(purchaseQty) || 0;

  return (
    <div className="animate-fadeIn pb-24">
      <div className="flex flex-col lg:flex-row gap-12">

        {/* Left Content Area - High Fidelity Information */}
        <div className="flex-1 space-y-8">
          <header className="space-y-6">
            <nav className="flex items-center gap-2 text-[10px] font-bold  tracking-widest text-gray-400">
              <button onClick={onClose} className="hover:text-black transition-colors">Cash Flow</button>
              <span>/</span>
              <span className="text-gray-300">{asset.category}</span>
              <span>/</span>
              <span className="text-black">{asset.issuer}</span>
            </nav>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-black text-white rounded-full text-[9px] font-black  tracking-widest">Verified by Loka</span>
                <span className="text-[10px] font-bold text-gray-400  tracking-widest border-l border-gray-200 pl-4">{asset.verifiedSource} Verified</span>
              </div>
              <h2 className="font-serif text-4xl md:text-6xl italic text-black leading-tight max-w-2xl">{asset.title}</h2>
              <p className="text-lg text-gray-500 font-light max-w-2xl leading-relaxed">{asset.subtitle}</p>
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-100 gap-10">
            {[
              { id: 'STORY', label: 'Background' },
              { id: 'FINANCIALS', label: 'Financial Health' },
              { id: 'AGREEMENT', label: 'Rules' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-sm font-bold transition-all relative ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-black" />
                )}
              </button>
            ))}
          </div>

          <div className="py-2">
            {activeTab === 'STORY' && (
              <div className="space-y-12 animate-fadeIn">
                {/* 1. Issuer Profile */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <img src={asset.issuerLogo} className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shadow-sm" />
                      <div>
                        <h4 className="text-base font-black  tracking-widest text-black flex items-center gap-2">
                          {asset.issuer}
                          <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[7px] text-white italic shadow-sm">✓</div>
                        </h4>
                        <p className="text-[10px] text-gray-400 font-bold  tracking-tighter">Singapore (ACRA ID: 20230812X) • Founded 2023</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {[
                        { label: 'Twitter', icon: '🐦' },
                        { label: 'LinkedIn', icon: '🔗' },
                        { label: 'GitHub', icon: '💻' }
                      ].map(social => (
                        <div key={social.label} className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl text-[9px] font-black  tracking-widest flex items-center gap-2 text-gray-500 border border-gray-100/50 cursor-pointer">
                          <span>{social.icon}</span>
                          {social.label}
                          <span className="text-[#00E676] text-[8px]">✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 bg-black text-white rounded-3xl space-y-4 shadow-xl">
                    <p className="text-[9px] font-black  tracking-widest text-gray-500 flex justify-between">
                      Loka Credit History
                      <span className="text-[#00E676] italic">Verified Entity</span>
                    </p>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <p className="text-2xl font-serif italic text-white">$1.5M</p>
                        <p className="text-[9px] font-bold text-gray-500  tracking-tighter">Total Funding Raised</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-end gap-1">
                          <p className="text-2xl font-serif italic text-[#00E676]">100%</p>
                          <span className="text-[10px] text-[#00E676] mb-1">↑</span>
                        </div>
                        <p className="text-[9px] font-bold text-gray-500  tracking-tighter">On-time Repayment</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. The Pitch */}
                <section className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-base font-bold text-black">Business Narrative</h3>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                    <p className="text-lg text-gray-600 leading-relaxed font-light">{asset.description}</p>
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                      <h4 className="text-[11px] font-bold text-gray-400 mb-2">Primary Funding Objective</h4>
                      <p className="text-sm text-black font-medium leading-relaxed italic">"Purchasing 8 additional H100 GPUs and pre-paying data center rack fees in Tokyo to expand computing rental capacity."</p>
                    </div>
                  </div>
                  {/* Photo Gallery Mock */}
                  <div className="grid grid-cols-3 gap-6 h-56">
                    <div className="bg-gray-100 rounded-3xl overflow-hidden hover:opacity-90 transition-all border border-gray-100 shadow-sm group">
                      <img src="https://images.unsplash.com/photo-1558494949-ef010ca63122?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                    </div>
                    <div className="bg-gray-100 rounded-3xl overflow-hidden hover:opacity-90 transition-all border border-gray-100 shadow-sm group">
                      <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                    </div>
                    <div className="bg-gray-100 rounded-3xl overflow-hidden hover:opacity-90 transition-all border border-gray-100 shadow-sm group">
                      <img src="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                    </div>
                  </div>
                </section>

                {/* 3. The Team */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-base font-bold text-black">Leadership & Backing</h3>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { name: 'Alex Chen', role: 'Chief Executive Officer', extra: 'Ex-AWS Principal Architect', bio: '10+ years scaling global cloud infrastructure.' },
                      { name: 'Sarah Li', role: 'Chief Technology Officer', extra: 'Ex-Ethereum Foundation', bio: 'Expert in secure protocol & smart contract auditing.' }
                    ].map((member, i) => (
                      <div key={i} className="flex items-start gap-4 p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:border-black/10 transition-all">
                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-serif italic text-xl text-gray-400">
                          {member.name[0]}
                        </div>
                        <div>
                          <p className="text-[12px] font-black  text-black">{member.name}</p>
                          <p className="text-[10px] font-bold text-gray-400  tracking-tighter mb-1">{member.role}</p>
                          <p className="text-[9px] text-blue-500 font-bold  tracking-widest mb-2">{member.extra}</p>
                          <p className="text-[11px] text-gray-500 font-light leading-relaxed">{member.bio}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'AGREEMENT' && (
              <div className="space-y-12 animate-fadeIn">
                {/* 1. Fundraising Mechanics */}
                <section className="space-y-6">
                  <h3 className="text-base font-bold text-black">Campaign Rules & Mechanics</h3>
                  <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-8">
                    {/* Visual Timeline */}
                    <div className="relative pt-6 pb-2">
                      {/* Background Bar */}
                      <div className="absolute top-8 left-[16%] right-[16%] h-1 bg-gray-100 rounded-full" />
                      {/* Progress Bar */}
                      <div className="absolute top-8 left-[16%] h-1 bg-[#00E676] transition-all duration-1000 rounded-full" style={{ width: `${progress * 0.68}%` }} />

                      <div className="relative flex justify-between z-10 w-full">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center w-1/3 text-center space-y-3">
                          <div className="w-5 h-5 rounded-full bg-white border-4 border-gray-200 shadow-sm relative">
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] font-black  tracking-widest text-gray-400 whitespace-nowrap">Start</span>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black  tracking-widest text-black mb-1">Fundraising</h4>
                            <p className="text-[10px] text-gray-500 font-medium px-2 leading-relaxed">Freely deposit or withdraw USDC.</p>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center w-1/3 text-center space-y-3">
                          <div className="w-5 h-5 rounded-full bg-white border-4 border-black shadow-sm relative">
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] font-black  tracking-widest text-black whitespace-nowrap">${((asset.targetAmount * 0.5) / 1000).toFixed(0)}k</span>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black  tracking-widest text-black mb-1">Success Point</h4>
                            <p className="text-[10px] text-gray-500 font-medium px-2 leading-relaxed">Goal met. Campaign secures funding.</p>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center w-1/3 text-center space-y-3">
                          <div className="w-5 h-5 rounded-full bg-white border-4 border-gray-200 shadow-sm relative">
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] font-black  tracking-widest text-gray-400 whitespace-nowrap">${(asset.targetAmount / 1000).toFixed(0)}k</span>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black  tracking-widest text-black mb-1">Lock & Deploy</h4>
                            <p className="text-[10px] text-gray-500 font-medium px-2 leading-relaxed">Pool locked immediately. Yield begins.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                      <div className="flex gap-4 p-5 bg-green-50/50 rounded-2xl border border-green-100/50">
                        <div className="text-xl" style={{ marginTop: '2px' }}>💸</div>
                        <div>
                          <h4 className="text-[11px] font-black  tracking-widest text-black mb-1">If Campaign Succeeds</h4>
                          <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Funds are locked. Guaranteed payout rules execute to distribute principal and yield (e.g., monthly) direct to wallet.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-5 bg-red-50/40 rounded-2xl border border-red-100/50">
                        <div className="text-xl" style={{ marginTop: '2px' }}>↩️</div>
                        <div>
                          <h4 className="text-[11px] font-black  tracking-widest text-black mb-1">If Campaign Fails</h4>
                          <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Should the soft cap be missed before deadline, smart contracts auto-refund 100% of participants' capital safety.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Asset Structure Flow */}
                <section className="space-y-8">
                  <h3 className="text-base font-bold text-black">Fund Flow & Asset Structure</h3>
                  <div className="p-10 bg-gray-50 rounded-[32px] border border-gray-100 flex flex-wrap items-center justify-center gap-x-4 gap-y-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <div className="px-2 py-0.5 bg-white/80 backdrop-blur rounded text-[9px] font-bold text-gray-400 border border-gray-100">Immutable Smart Contract</div>
                    </div>
                    {[
                      'Investors', 'Loka SPV', 'Borrower', 'Purchase H100', 'Revenue Gen', 'Stripe Escrow', 'Auto-Repay'
                    ].map((step, i) => (
                      <React.Fragment key={i}>
                        <div className="relative group">
                          <div className={`px-4 py-3 rounded-2xl border shadow-sm transition-all duration-500 flex items-center justify-center min-w-[100px] ${i === 6 ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-100 group-hover:border-black'
                            }`}>
                            <p className="text-[9px] font-black  tracking-widest">{step}</p>
                          </div>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold text-gray-300 italic">Step 0{i + 1}</div>
                        </div>
                        {i < 6 && (
                          <div className="text-gray-300 font-light text-xl animate-pulse">→</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </section>

                {/* 3. Key Rights & Protections */}
                <section className="space-y-6">
                  <h3 className="text-base font-bold text-black">Key Rights & Protections</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        icon: '🥇',
                        title: 'Seniority',
                        badge: 'Senior Secured',
                        plainEnglish: 'In the event of liquidation, you are paid back first—before the company’s shareholders.'
                      },
                      {
                        icon: '🛡️',
                        title: 'Structure',
                        badge: 'Bankruptcy Remote',
                        plainEnglish: 'Assets are held in a secure, independent SPV. Even if the parent company fails, your investment remains out of reach for their creditors.'
                      },
                      {
                        icon: '🧱',
                        title: 'Collateral Ratio',
                        badge: '120%-150%',
                        plainEnglish: 'Every $100 lent is backed by up to $150 in expected revenue. Even if earnings drop by 30%, your principal remains secure.'
                      },
                      {
                        icon: '🤖',
                        title: 'Smart Escrow',
                        badge: 'Code Enforced',
                        plainEnglish: 'Revenue is intercepted by SDK and flows directly into on-chain contracts. It is tamper-proof and automatically distributed at maturity.'
                      }
                    ].map((item, i) => (
                      <div key={i} className="group relative bg-white border border-gray-100 p-6 rounded-[32px] hover:border-black transition-all duration-300 shadow-sm overflow-hidden h-48 flex flex-col justify-between">
                        {/* Normal State */}
                        <div className="space-y-3">
                          <div className="text-2xl">{item.icon}</div>
                          <div>
                            <p className="text-[11px] font-bold text-gray-400  tracking-tight">{item.title}</p>
                            <p className="text-sm font-black text-black leading-tight mt-1">{item.badge}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-50">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
                          <span className="text-[9px] font-bold text-gray-400  tracking-widest">Active Protection</span>
                        </div>

                        {/* Hover State - Explanation */}
                        <div className="absolute inset-0 bg-black/95 p-6 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 cursor-default">
                          <p className="text-[13px] text-white font-medium leading-relaxed italic text-center">
                            "{item.plainEnglish}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 3. Documentation */}
                <section className="space-y-6">
                  <h3 className="text-base font-bold text-black">Verifiable Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { name: 'Loan_Agreement_v1.pdf', type: 'Framework' },
                      { name: 'UCC-1_Filing_Evidence.pdf', type: 'Collateral' },
                      { name: 'Legal_Compliance_Opinion.pdf', type: 'Audit' },
                      { name: 'SPV_Org_Document.pdf', type: 'Structure' }
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl group cursor-pointer hover:border-black transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                            <Icons.Shield />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold block">{doc.name}</span>
                            <span className="text-[9px] font-medium text-gray-400">{doc.type} Document • 2.4MB</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-gray-400">Preview</span>
                          <span className="text-xl">📄</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'FINANCIALS' && (
              <div className="space-y-8 animate-fadeIn">
                {/* 1. Live Monitor */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-black">Stripe Connect API Monitor</h3>
                      <div className="bg-blue-50 text-blue-600 text-[9px] font-bold px-3 py-1 rounded-full italic">Read-Only Access</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                      <span className="text-[10px] font-bold text-[#00E676]">Oracle Online</span>
                    </div>
                  </div>

                  {/* High Level Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: '30d Gross Flow', value: `$1,245,600`, sub: 'Up 11.2% MoM', trend: 'up' },
                      { label: 'Coverage Ratio', value: '2.49x', sub: 'Calculated at Maturity', trend: 'safe' },
                      { label: 'MRR', value: '$42,000', sub: 'Enterprise Focus', trend: 'up' }
                    ].map((stat, i) => (
                      <div key={i} className="p-6 bg-white glass rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <p className="text-[10px] font-bold text-gray-400  tracking-widest mb-3">{stat.label}</p>
                        <p className="text-3xl font-serif italic text-black mb-1">{stat.value}</p>
                        <p className="text-[10px] font-bold text-[#00E676]  tracking-tighter flex items-center gap-1">
                          {stat.trend === 'up' && '▲'} {stat.sub}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Analysis Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Revenue History */}
                    <div className="p-6 bg-white glass rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-black">Revenue Timeline (6mo)</p>
                        <p className="text-[10px] font-bold text-gray-400">Verifiably Accurate</p>
                      </div>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={asset.monthlyRevenue}>
                            <CartesianGrid strokeDasharray="1 6" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#999' }}
                              dy={8}
                            />
                            <YAxis hide />
                            <Tooltip
                              cursor={{ fill: '#f9f9f9' }}
                              content={({ payload }) => payload?.[0] ? (
                                <div className="bg-black text-white p-3 rounded-2xl text-[10px] font-black shadow-2xl">
                                  ${payload[0].value?.toLocaleString()}
                                </div>
                              ) : null}
                            />
                            <Bar dataKey="amount" fill="#000" radius={[4, 4, 4, 4]} barSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Concentration Analysis */}
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                      <p className="text-sm font-bold text-black">Customer Concentration Analysis</p>
                      <div className="space-y-4">
                        {[
                          { label: 'Top 1 Customer', value: '15%', color: 'bg-black' },
                          { label: 'Top 5 Customers', value: '42%', color: 'bg-gray-400' },
                          { label: 'Long-Tail Borrowers', value: '43%', color: 'bg-gray-200' }
                        ].map((item, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-gray-400">{item.label}</span>
                              <span className="text-black">{item.value}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-gray-100/50">
                              <div className={`h-full ${item.color}`} style={{ width: item.value }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 italic leading-relaxed">Diversified customer base ensures that if a single client churns, the underlying asset revenue remains robust enough to cover interest payments.</p>
                    </div>
                  </div>
                </section>

                {/* 2. AI Risk Report */}
                <section className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-base font-bold text-black">Loka AI Risk scoring</h3>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  <div className="p-8 bg-purple-50 rounded-[40px] border-2 border-purple-100/50 relative overflow-hidden group">
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-200/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="relative z-10 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="p-2 bg-purple-600 rounded-lg w-fit text-white text-xs">Loka AI v2.4</div>
                          <p className="text-[10px] font-bold text-purple-400 mt-2">Analysis Engine: Predictive Default Model</p>
                        </div>
                        <div className="text-right">
                          <div className="text-5xl font-serif italic text-purple-600">AAA</div>
                          <p className="text-xs font-bold text-purple-400">98/100 Confidence</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-[11px] font-bold text-purple-900 border-b border-purple-100 pb-1">Key Strengths</p>
                          <ul className="space-y-2">
                            {[
                              'Market Fit: AI computing demand is in a phase of exponential growth.',
                              'Cash Flow Quality: Stripe lock-box account with mandatory repayment mechanism.',
                              'Strong Collateral: Physical GPU lien + Accounts receivable security interest.'
                            ].map((point, i) => (
                              <li key={i} className="flex items-center gap-3 text-[11px] text-purple-800 font-medium italic">
                                <span className="text-[#00E676] text-lg">✓</span> {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[11px] font-bold text-purple-900 border-b border-purple-100 pb-1">Risk Observations</p>
                          <ul className="space-y-2">
                            {[
                              'Geopolitics: Data center electricity rates in Tokyo impacted by energy price volatility.',
                              'Obsolescence: Risk of H100 computing power facing depreciation after 24 months.'
                            ].map((point, i) => (
                              <li key={i} className="flex items-center gap-3 text-[11px] text-purple-800 font-medium italic">
                                <span className="text-orange-400 text-lg">⚠️</span> {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidepanel - Pledge Mechanism */}
        <div className="w-full lg:w-[450px] shrink-0">
          <div className="bg-white glass p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl sticky top-24 space-y-6">
            {/* Funding Header */}
            <header className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-black  tracking-[0.3em] text-gray-400 mb-1">Campaign Progress</p>
                  <h3 className="text-3xl font-serif italic text-black leading-none">${asset.raisedAmount.toLocaleString()}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-gray-400  tracking-widest mb-0.5">Goal</p>
                  <p className="text-xs font-bold text-black">${(asset.targetAmount / 1000).toFixed(0)}k</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden shadow-inner border border-gray-100">
                  <div
                    className="h-full bg-black transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-black  tracking-widest">
                  <span className="text-black">{progress.toFixed(0)}% funded</span>
                  <span className={asset.status === 'Funded' ? "text-green-500" : asset.status === 'Failed' ? "text-red-500" : "text-orange-500"}>{asset.status === 'Funded' ? 'Successfully Funded' : asset.status === 'Failed' ? 'Campaign Failed' : '12 Days to go'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 py-3 border-y border-gray-50">
                <div className="flex -space-x-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" />
                  ))}
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-black text-[7px] text-white flex items-center justify-center font-bold">+{asset.backersCount}</div>
                </div>
                <p className="text-[8px] font-bold text-gray-400  tracking-tighter">Backers pledged</p>
              </div>
            </header>

            {/* Transaction Engine */}
            {asset.status === 'Funded' ? (
              <div className="space-y-4">
                <div className="p-6 bg-[#00E676]/5 border border-[#00E676]/20 rounded-2xl text-center space-y-2">
                  <p className="text-[#00E676] text-2xl mb-2">🎉</p>
                  <h4 className="text-[14px] font-bold text-black">Campaign Successful</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed font-medium">This asset has been fully funded and is now generating yield.</p>
                </div>
                {/* Show user's investment if this is the ComputeDAO asset */}
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-[9px] font-black  tracking-widest text-gray-400">Your Position</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-gray-500">Initial Investment</span>
                    <span className="text-[13px] font-black text-black">{asset.title.includes('ComputeDAO') ? '$5,000.00' : '$0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#00E676]/10 p-2.5 rounded-xl border border-[#00E676]/20">
                    <span className="text-[10px] font-bold text-[#00E676]">Current Earnings</span>
                    <span className="text-[11px] font-black text-[#00E676]">{asset.title.includes('ComputeDAO') ? '+$387.50' : '+$0.00'}</span>
                  </div>
                </div>
              </div>
            ) : asset.status === 'Failed' ? (
              <div className="space-y-4">
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl text-center space-y-2">
                  <h4 className="text-[14px] font-bold text-black">Funding Failed</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed font-medium">This campaign did not reach its soft cap target within the specified timeframe. All locked collateral is being returned.</p>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-[9px] font-black  tracking-widest text-gray-400">Your Position</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-gray-500">Initial Escrow</span>
                    <span className="text-[13px] font-black text-black">$0.00</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-200/50 p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500">Refund Status</span>
                    <span className="text-[11px] font-black text-gray-500">N/A</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex bg-gray-100 p-1 rounded-full mb-4">
                  <button
                    onClick={() => setTxTab('buy')}
                    className={`flex-1 py-2 text-[10px] font-bold  tracking-widest rounded-full transition-all ${txTab === 'buy' ? 'bg-black text-white shadow-sm' : 'text-gray-400 hover:text-black'
                      }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setTxTab('sell')}
                    className={`flex-1 py-2 text-[10px] font-bold  tracking-widest rounded-full transition-all ${txTab === 'sell' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-black'
                      }`}
                  >
                    Withdraw
                  </button>
                </div>

                <div className="p-6 bg-gray-50 rounded-2xl border-2 border-transparent focus-within:border-black transition-all shadow-inner relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[8px] font-black  tracking-widest text-gray-400">{txTab === 'buy' ? 'Deposit to Escrow' : 'Withdraw from Escrow'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-serif italic text-gray-300">USDC</span>
                      <input
                        type="number"
                        value={purchaseQty}
                        onChange={(e) => setPurchaseQty(e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent text-3xl font-serif italic text-black w-full outline-none"
                      />
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-black/3 rounded-full -mr-10 -mt-10 group-focus-within:scale-150 transition-transform duration-700" />
                </div>

                {txTab === 'sell' && (
                  <div className="px-2 space-y-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-gray-400  tracking-widest">Available Balance</span>
                      <span className="font-black text-black text-[11px]">$0.00 USDC</span>
                    </div>
                    <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl flex gap-3 items-start">
                      <span className="text-orange-500 text-sm leading-none mt-0.5">⚠️</span>
                      <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                        Funds cannot be withdrawn once the campaign successfully reaches its target and closes.
                      </p>
                    </div>
                  </div>
                )}

                <button className="w-full py-4 bg-black text-white rounded-full font-black text-[10px] tracking-[0.3em] hover:bg-gray-800 transition-all shadow-lg active:scale-95">
                  Confirm
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

export default Market;
