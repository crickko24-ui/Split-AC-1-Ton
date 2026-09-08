'use client';

import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { Trophy, ShieldAlert, ChevronDown, MessageCircle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';

const playDrawChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, delay: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    };

    playTone(587.33, 0, 0.8);   // D5
    playTone(880.00, 0.1, 1.2);  // A5
    playTone(1174.66, 0.2, 1.5); // D6
  } catch (e) {
    console.log('Audio autoplay prevented:', e);
  }
};

// --- Types & Constants ---
export type MarketStatus = 'LIVE' | 'CLOSED' | 'UPCOMING' | 'HOLIDAY';

export interface Market {
  id: string;
  name: string;
  openPana: string;
  openSingle: string;
  closeSingle: string;
  closePana: string;
  status: MarketStatus;
  openTime: string;
  closeTime: string;
}

export interface HistoryRecord {
  id: string;
  dateStr: string;
  timestamp: number;
  marketId: string;
  marketName: string;
  openPana: string;
  closePana: string;
  jodi: string;
}

interface AppState {
  lang: 'en' | 'hi';
  setLang: (lang: 'en' | 'hi') => void;
  activeTab: 'LIVE' | 'CALCULATOR' | 'CHARTS';
  setActiveTab: (tab: 'LIVE' | 'CALCULATOR' | 'CHARTS') => void;
  markets: Market[];
  setMarkets: (markets: Market[]) => void;
  history: HistoryRecord[];
  setHistory: (history: HistoryRecord[]) => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (val: boolean) => void;
  isSecurityDialogOpen: boolean;
  setIsSecurityDialogOpen: (val: boolean) => void;
  adminKey: string;
  setAdminKey: (key: string) => void;
  updateMarket: (id: string, updates: Partial<Market>) => void;
  addHistoryRecord: (record: Omit<HistoryRecord, 'id'>) => void;
  deleteHistoryRecord: (id: string) => void;
  autoResetMidnight: boolean;
  setAutoResetMidnight: (val: boolean) => void;
  lastResetDate: string;
  setLastResetDate: (val: string) => void;
  resetAllMarkets: () => void;
}

const DICT = {
  en: {
    subtitle: "OFFICIAL LIVE DRAW PORTAL • DHANVARSHA",
    tabLive: "🟢 Results",
    tabCalc: "🧮 Calculator",
    tabCharts: "📊 Charts",
    liveDrawActive: "LIVE DRAW ACTIVE",
    waitingForClose: "WAITING FOR CLOSE",
    upcoming: "UPCOMING",
    completed: "COMPLETED RESULT",
    openAt: "OPEN AT",
    closeAt: "CLOSE AT",
    patti: "Patti",
    jodi: "Jodi",
    date: "Date",
    session: "Session",
    noDraws: "No completed draws recorded yet.",
    adminPanel: "Admin Control Panel",
    openPatti: "Open Patti",
    closePatti: "Close Patti",
    savePublish: "Save & Publish Result",
    resultIn: "Result in",
    closeIn: "Close in",
    drawingNow: "Drawing Now...",
    declared: "DECLARED",
    closed: "CLOSED",
    shareResult: "Share Result",
    markets: {
      "Dhanvarsha Morning": "Dhanvarsha Morning",
      "Dhanvarsha Day": "Dhanvarsha Day",
      "Dhanvarsha Afternoon": "Dhanvarsha Afternoon",
      "Dhanvarsha Gold": "Dhanvarsha Gold",
      "Dhanvarsha Evening": "Dhanvarsha Evening",
      "Dhanvarsha Night": "Dhanvarsha Night",
      "DHANVARSHA MORNING": "Dhanvarsha Morning",
      "DHANVARSHA DAY": "Dhanvarsha Day",
      "DHANVARSHA AFTERNOON": "Dhanvarsha Afternoon",
      "DHANVARSHA GOLD": "Dhanvarsha Gold",
      "DHANVARSHA EVENING": "Dhanvarsha Evening",
      "DHANVARSHA NIGHT": "Dhanvarsha Night"
    }
  },
  hi: {
    subtitle: "आधिकारिक लाइव परिणाम पोर्टल • धनवर्षा",
    tabLive: "🟢 लाइव परिणाम",
    tabCalc: "🧮 कैलकुलेटर",
    tabCharts: "📊 इतिहास चार्ट",
    liveDrawActive: "लाइव ड्रॉ सक्रिय",
    waitingForClose: "क्लोज का इंतजार",
    upcoming: "आगामी परिणाम",
    completed: "पूर्ण परिणाम",
    openAt: "ओपन समय",
    closeAt: "क्लोज समय",
    patti: "पत्ती",
    jodi: "जोड़ी",
    date: "दिनांक",
    session: "सत्र",
    noDraws: "अभी तक कोई पूर्ण परिणाम दर्ज नहीं हुआ है।",
    adminPanel: "एडमिन कंट्रोल पैनल",
    openPatti: "ओपन पत्ती",
    closePatti: "क्लोज पत्ती",
    savePublish: "सेव और लाइव पब्लिश करें",
    resultIn: "परिणाम",
    closeIn: "क्लोज",
    drawingNow: "परिणाम आ रहा है...",
    declared: "घोषित",
    closed: "बंद",
    shareResult: "परिणाम शेयर करें",
    markets: {
      "Dhanvarsha Morning": "धनवर्षा मॉर्निंग",
      "Dhanvarsha Day": "धनवर्षा डे",
      "Dhanvarsha Afternoon": "धनवर्षा आफ्टरनून",
      "Dhanvarsha Gold": "धनवर्षा गोल्ड",
      "Dhanvarsha Evening": "धनवर्षा इवनिंग",
      "Dhanvarsha Night": "धनवर्षा नाइट",
      "DHANVARSHA MORNING": "धनवर्षा मॉर्निंग",
      "DHANVARSHA DAY": "धनवर्षा डे",
      "DHANVARSHA AFTERNOON": "धनवर्षा आफ्टरनून",
      "DHANVARSHA GOLD": "धनवर्षा गोल्ड",
      "DHANVARSHA EVENING": "धनवर्षा इवनिंग",
      "DHANVARSHA NIGHT": "धनवर्षा नाइट"
    }
  }
};

const defaultMarkets: Market[] = [
  { id: 'm1', name: 'Dhanvarsha Morning', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '10:00', closeTime: '11:00' },
  { id: 'm2', name: 'Dhanvarsha Day', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '13:00', closeTime: '14:00' },
  { id: 'm3', name: 'Dhanvarsha Afternoon', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '15:30', closeTime: '16:30' },
  { id: 'm4', name: 'Dhanvarsha Gold', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '17:30', closeTime: '18:30' },
  { id: 'm5', name: 'Dhanvarsha Evening', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '20:00', closeTime: '21:00' },
  { id: 'm6', name: 'Dhanvarsha Night', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '22:30', closeTime: '23:30' },
];

const useStore = create<AppState>((set) => ({
  lang: 'en',
  setLang: (lang) => {
    localStorage.setItem('_dhan_lang', lang);
    set({ lang });
  },
  activeTab: 'LIVE',
  setActiveTab: (tab) => set({ activeTab: tab }),
  markets: defaultMarkets,
  setMarkets: (markets) => set({ markets }),
  history: [],
  setHistory: (history) => set({ history }),
  isAdminOpen: false,
  setIsAdminOpen: (val) => set({ isAdminOpen: val }),
  isSecurityDialogOpen: false,
  setIsSecurityDialogOpen: (val) => set({ isSecurityDialogOpen: val }),
  adminKey: 'DHAN9482X7',
  setAdminKey: (key) => set({ adminKey: key }),
  updateMarket: async (id, updates) => {
    set((state) => {
      const newMarkets = state.markets.map(m => m.id === id ? { ...m, ...updates } : m);
      return { markets: newMarkets };
    });
    // Async DB update
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.openPana !== undefined) dbUpdates.open_pana = updates.openPana;
    if (updates.closePana !== undefined) dbUpdates.close_pana = updates.closePana;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.openTime !== undefined) dbUpdates.open_time = updates.openTime;
    if (updates.closeTime !== undefined) dbUpdates.close_time = updates.closeTime;
    
    // Jodi mapping
    if (updates.openSingle !== undefined || updates.closeSingle !== undefined) {
      // Find current market to construct full jodi
      const current = useStore.getState().markets.find(m => m.id === id);
      if (current) {
         dbUpdates.jodi = `${current.openSingle}${current.closeSingle}`;
      }
    }

    await supabase.from('dhanvarsha_markets').update(dbUpdates).eq('id', id);
  },
  addHistoryRecord: async (record) => {
    // DB Insert
    await supabase.from('dhanvarsha_history').insert([{
      date: record.dateStr,
      session: record.marketName,
      open_pana: record.openPana,
      jodi: record.jodi,
      close_pana: record.closePana
    }]);
  },
  deleteHistoryRecord: async (id) => {
    set((state) => {
      const newHistory = state.history.filter(h => h.id !== id);
      return { history: newHistory };
    });
    await supabase.from('dhanvarsha_history').delete().eq('id', id);
  },
  autoResetMidnight: false,
  setAutoResetMidnight: (val) => set((state) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('_dhan_auto_reset', JSON.stringify(val));
    }
    return { autoResetMidnight: val };
  }),
  lastResetDate: '',
  setLastResetDate: (val) => set((state) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('_dhan_last_reset', val);
    }
    return { lastResetDate: val };
  }),
  resetAllMarkets: async () => {
    set((state) => {
      const newMarkets = state.markets.map(m => ({
        ...m,
        openPana: '***',
        openSingle: '*',
        closeSingle: '*',
        closePana: '***',
        status: 'UPCOMING' as MarketStatus
      }));
      return { markets: newMarkets };
    });
    // Iterate over markets and update in Supabase
    const markets = useStore.getState().markets;
    for (const m of markets) {
      await supabase.from('dhanvarsha_markets').update({
        open_pana: '***',
        jodi: '**',
        close_pana: '***',
        status: 'UPCOMING'
      }).eq('id', m.id);
    }
  }
}));

const getStatus = (market: Market) => {
  if (market.status === 'HOLIDAY') return { label: 'MARKET CLOSED TODAY', color: 'bg-red-600 text-white', status: 'HOLIDAY' };
  
  const hasOpen = market.openPana && market.openPana !== '***' && market.openSingle && market.openSingle !== '*';
  const hasClose = market.closePana && market.closePana !== '***' && market.closeSingle && market.closeSingle !== '*';
  
  if (hasOpen && hasClose) {
    return { label: 'COMPLETE RESULT', color: 'bg-emerald-600 text-white', status: 'CLOSED' };
  } else if (hasOpen) {
    return { label: 'WAITING FOR CLOSE', color: 'bg-amber-500 text-black', status: 'LIVE' };
  } else {
    return { label: 'UPCOMING', color: 'bg-slate-700 text-slate-300', status: 'UPCOMING' };
  }
};

const formatTime12h = (time24: string) => {
  if (!time24) return '';
  const cleanTime = time24.replace(/\s*(AM|PM)\s*/i, '').trim();
  const [h, m] = cleanTime.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour.toString().padStart(2, '0')}:${m?.trim()} ${ampm}`;
};

const getTargetTimeMs = (time24: string) => {
  if (!time24) return 0;
  const cleanTime = time24.replace(/\s*(AM|PM)\s*/i, '').trim();
  const now = new Date();
  const [h, m] = cleanTime.split(':');
  now.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return now.getTime();
};

const MarketCard = ({ market }: { market: Market }) => {
  const { status } = getStatus(market);
  const [now, setNow] = useState(Date.now());
  const { lang } = useStore();
  const t = DICT[lang];
  
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const renderBadge = () => {
    if (status === 'HOLIDAY') return <div className="px-4 py-1.5 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-widest">{t.closed}</div>;
    if (status === 'CLOSED') {
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="px-4 py-1.5 rounded-full bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 font-bold text-xs uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">✅ {t.declared}</div>
          <div className="text-[10px] font-bold text-emerald-400 tracking-wider">{t.completed}</div>
        </div>
      );
    }
    
    if (status === 'LIVE') {
      const targetClose = getTargetTimeMs(market.closeTime);
      const diffClose = targetClose - now;
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/50 font-bold text-xs uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            🕒 {t.closeAt} {formatTime12h(market.closeTime)}
          </div>
          {diffClose > 0 ? (
            <div className="text-[10px] font-bold text-slate-400 tracking-wider animate-pulse">
              {t.closeIn}: {Math.floor(diffClose / (1000 * 60 * 60))}h {Math.floor((diffClose % (1000 * 60 * 60)) / 60000)}m {Math.floor((diffClose % 60000) / 1000)}s
            </div>
          ) : (
            <div className="text-[10px] font-bold text-amber-500 tracking-wider animate-pulse">
              {t.drawingNow}
            </div>
          )}
        </div>
      );
    }

    // UPCOMING
    const targetOpen = getTargetTimeMs(market.openTime);
    const diffOpen = targetOpen - now;
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="px-4 py-1.5 rounded-full bg-slate-800 text-amber-500 border border-slate-700 font-bold text-xs uppercase tracking-widest">
          🕒 {t.openAt} {formatTime12h(market.openTime)}
        </div>
        {diffOpen > 0 ? (
          <div className="text-[10px] font-bold text-slate-400 tracking-wider animate-pulse">
            {t.resultIn}: {Math.floor(diffOpen / (1000 * 60 * 60))}h {Math.floor((diffOpen % (1000 * 60 * 60)) / 60000)}m {Math.floor((diffOpen % 60000) / 1000)}s
          </div>
        ) : (
          <div className="text-[10px] font-bold text-amber-500 tracking-wider animate-pulse">
            {t.drawingNow}
          </div>
        )}
      </div>
    );
  };
  
  const targetOpen = getTargetTimeMs(market.openTime);
  const diffOpen = targetOpen - now;
  const isLiveSession = status === 'LIVE' || (status === 'UPCOMING' && diffOpen > 0 && diffOpen <= 30 * 60 * 1000);

  const handleShare = () => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const openP = market.openPana || '***';
    const closeP = market.closePana || '***';
    const j = `${market.openSingle || '*'}${market.closeSingle || '*'}`;
    const mName = (t.markets as any)[market.name.toUpperCase().trim()] || market.name;
    const text = `🏆 *DHANVARSHA OFFICIAL LIVE RESULT* 🏆
📅 Date: ${dateStr}
🎯 Session: ${mName}
🔥 Result: *${openP} - ${j} - ${closeP}*

⚡ Fast Live Results at:
👉 https://dhanvarshaliveresults.vercel.app/`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className={`rounded-2xl overflow-hidden mb-6 flex flex-col items-center p-6 sm:p-8 relative ${
      isLiveSession 
        ? 'bg-gradient-to-br from-[#0F1D38] to-[#0A1120] border border-amber-500/40 shadow-xl shadow-amber-500/10' 
        : 'bg-slate-900 border border-slate-800'
    }`}>
      {isLiveSession && (
        <div className="absolute top-4 left-4 flex items-center bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          <div className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-emerald-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase">{t.liveDrawActive}</span>
        </div>
      )}
      
      {/* Share Button (Top Right) */}
      {(status === 'LIVE' || status === 'CLOSED' || market.openPana !== '***') && (
        <button 
          onClick={handleShare}
          className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition active:scale-95 border border-emerald-500"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{t.shareResult}</span>
        </button>
      )}

      <div className="flex flex-col items-center justify-center w-full mb-6 mt-8 sm:mt-0">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-300 uppercase tracking-wider text-center mb-3">{(t.markets as any)[market.name.toUpperCase().trim()] || market.name}</h2>
        {renderBadge()}
      </div>
      
      <div className="flex flex-col items-center justify-center w-full">
        {status === 'HOLIDAY' ? (
           <div className="py-4">
             <span className="text-red-500 font-black text-2xl sm:text-3xl tracking-widest uppercase">
               MARKET CLOSED
             </span>
           </div>
        ) : (
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-full font-mono text-4xl sm:text-6xl">
            <span className="text-amber-400 font-black w-24 sm:w-32 text-right">
              {market.openPana || '***'}
            </span>
            <span className="text-slate-600 font-light">-</span>
            <span className="text-white font-black w-24 sm:w-32 text-center drop-shadow-md text-5xl sm:text-7xl">
              {market.openSingle || '*'}{market.closeSingle || '*'}
            </span>
            <span className="text-slate-600 font-light">-</span>
            <span className="text-emerald-400 font-black w-24 sm:w-32 text-left">
              {market.closePana || '***'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const LiveView = () => {
  const { markets } = useStore();
  
  const SEQUENCE = [
    "DHANVARSHA MORNING",
    "DHANVARSHA DAY",
    "DHANVARSHA AFTERNOON",
    "DHANVARSHA GOLD",
    "DHANVARSHA EVENING",
    "DHANVARSHA NIGHT"
  ];

  const displayMarkets = [...markets].sort((a, b) => {
    const nameA = (a.name || '').toUpperCase().trim();
    const nameB = (b.name || '').toUpperCase().trim();
    const indexA = SEQUENCE.findIndex(s => nameA.includes(s) || s.includes(nameA));
    const indexB = SEQUENCE.findIndex(s => nameB.includes(s) || s.includes(nameB));
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2">
      {displayMarkets.map(m => (
        <MarketCard key={m.id} market={m} />
      ))}
    </div>
  );
};

const CalculatorView = () => {
  const [betType, setBetType] = useState('Jodi');
  const [amountStr, setAmountStr] = useState('');
  
  const options = [
    { name: 'Single', desc: '9x', mult: 9 },
    { name: 'Jodi', desc: '90x', mult: 90 },
    { name: 'Single Patti', desc: '150x', mult: 150 },
    { name: 'Double Patti', desc: '300x', mult: 300 },
    { name: 'Triple Patti', desc: '1000x', mult: 1000 },
    { name: 'Half Sangam', desc: '1500x', mult: 1500 },
    { name: 'Full Sangam', desc: '10000x', mult: 10000 },
  ];
  
  const currentMult = options.find(o => o.name === betType)?.mult || 0;
  const amount = parseInt(amountStr, 10) || 0;
  const winnings = amount * currentMult;

  const handleAdd = (val: number) => {
    setAmountStr((prev) => ((parseInt(prev, 10) || 0) + val).toString());
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase text-center tracking-widest">Winnings Calculator</h2>
        
        <div className="flex overflow-x-auto no-scrollbar gap-3 mb-8 pb-2">
          {options.map((opt) => (
            <button
              key={opt.name}
              onClick={() => setBetType(opt.name)}
              className={`p-3 sm:p-4 rounded-xl border-2 flex flex-col items-center justify-center min-w-[120px] sm:min-w-[140px] flex-shrink-0 transition-all ${
                betType === opt.name 
                  ? 'border-amber-500 bg-amber-500/10' 
                  : 'border-slate-800 bg-slate-950 hover:border-slate-600'
              }`}
            >
              <span className={`text-sm sm:text-lg font-bold whitespace-nowrap ${betType === opt.name ? 'text-amber-400' : 'text-slate-300'}`}>{opt.name}</span>
              <span className={`text-xs sm:text-sm font-medium ${betType === opt.name ? 'text-amber-500/80' : 'text-slate-500'}`}>({opt.desc})</span>
            </button>
          ))}
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Enter Rupee Amount (रुपये डालें)</label>
          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-bold text-amber-500">₹</span>
            <input
              type="number"
              inputMode="numeric"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="e.g. 100"
              className="w-full bg-black border-2 border-slate-800 focus:border-amber-500 rounded-2xl py-6 pl-14 pr-6 text-white text-3xl sm:text-4xl font-bold font-mono focus:outline-none transition-colors"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
           <button onClick={() => handleAdd(10)} className="flex-1 min-w-[80px] py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-xl font-bold text-xl sm:text-2xl transition-colors">+₹10</button>
           <button onClick={() => handleAdd(50)} className="flex-1 min-w-[80px] py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-xl font-bold text-xl sm:text-2xl transition-colors">+₹50</button>
           <button onClick={() => handleAdd(100)} className="flex-1 min-w-[80px] py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-xl font-bold text-xl sm:text-2xl transition-colors">+₹100</button>
           <button onClick={() => handleAdd(500)} className="flex-1 min-w-[80px] py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-xl font-bold text-xl sm:text-2xl transition-colors">+₹500</button>
           <button onClick={() => setAmountStr('')} className="flex-1 min-w-[80px] py-4 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/30 rounded-xl font-bold text-xl sm:text-2xl transition-colors">CLEAR</button>
        </div>
        
        <div className="bg-black border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[160px]">
           {amountStr === '' ? (
             <span className="text-xl sm:text-3xl font-bold text-slate-500 uppercase tracking-widest text-center">ENTER AMOUNT TO CALCULATE</span>
           ) : (
             <div className="text-4xl sm:text-7xl font-black text-emerald-500 font-mono drop-shadow-[0_0_25px_rgba(16,185,129,0.5)] text-center break-words w-full">
               YOU WIN: <br className="sm:hidden" />₹{winnings.toLocaleString('en-IN')}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const isRedJodi = (jodi: string) => {
  if (!jodi || jodi.length !== 2) return false;
  const a = parseInt(jodi[0], 10);
  const b = parseInt(jodi[1], 10);
  if (isNaN(a) || isNaN(b)) return false;
  return a === b || Math.abs(a - b) === 5;
};

const ChartsView = () => {
  const { history, markets, lang } = useStore();
  const [filter, setFilter] = useState('ALL');
  const t = DICT[lang];

  const filteredHistory = history.filter(h => filter === 'ALL' || h.marketName === filter);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase text-center tracking-widest">{t.tabCharts.replace('📊 ', '')}</h2>
        
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 pb-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border-2 ${
              filter === 'ALL' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
            }`}
          >
            {lang === 'en' ? 'All Sessions' : 'सभी सत्र'}
          </button>
          {markets.map(m => (
            <button
              key={m.id}
              onClick={() => setFilter(m.name)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border-2 ${
                filter === m.name ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
              }`}
            >
              {(t.markets as any)[m.name.toUpperCase().trim()] || m.name}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-700 bg-slate-950">
                <th className="py-4 px-4 text-xs font-bold text-amber-500 uppercase tracking-widest">{t.date}</th>
                <th className="py-4 px-4 text-xs font-bold text-amber-500 uppercase tracking-widest">{t.session}</th>
                <th className="py-4 px-4 text-xs font-bold text-amber-500 uppercase tracking-widest text-center">{lang === 'en' ? 'Result' : 'परिणाम'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredHistory.map((record) => {
                const red = isRedJodi(record.jodi);
                return (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors odd:bg-slate-950/60 even:bg-slate-900/40">
                    <td className="py-4 px-4 text-sm font-mono text-slate-300 font-bold">{record.dateStr}</td>
                    <td className="py-4 px-4 text-sm font-bold text-white uppercase tracking-wider">{(t.markets as any)[record.marketName.toUpperCase().trim()] || record.marketName}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2 font-mono font-bold text-lg sm:text-xl">
                        <span className="text-amber-500 tracking-widest w-12 text-right">{record.openPana}</span>
                        <span className="text-slate-600">-</span>
                        <span className={`text-2xl drop-shadow-md w-8 text-center ${red ? 'text-red-500' : 'text-white'}`}>
                          {record.jodi}
                        </span>
                        <span className="text-slate-600">-</span>
                        <span className="text-emerald-500 tracking-widest w-12 text-left">{record.closePana}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-500 font-bold tracking-widest text-sm">
                    {t.noDraws}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const calculateSingle = (pana: string) => {
  if (pana.length !== 3) return '';
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    sum += parseInt(pana[i], 10);
  }
  return (sum % 10).toString();
};

const sortPatti = (pana: string) => {
  if (pana.length !== 3) return pana;
  return pana.split('').sort((a, b) => {
    const valA = a === '0' ? 10 : parseInt(a, 10);
    const valB = b === '0' ? 10 : parseInt(b, 10);
    return valA - valB;
  }).join('');
};

const AdminModal = () => {
  const { setIsAdminOpen, markets, updateMarket, lang } = useStore();
  const t = DICT[lang];
  const [selectedId, setSelectedId] = useState(markets[0].id);
  const [openPana, setOpenPana] = useState('');
  const [jodi, setJodi] = useState('');
  const [closePana, setClosePana] = useState('');
  const [openSortedMsg, setOpenSortedMsg] = useState('');
  const [closeSortedMsg, setCloseSortedMsg] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetChecked, setResetChecked] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const autoResetMidnight = useStore(state => state.autoResetMidnight);
  const setAutoResetMidnight = useStore(state => state.setAutoResetMidnight);
  const history = useStore(state => state.history);

  useEffect(() => {
    const m = markets.find(x => x.id === selectedId)!;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenPana(m.openPana === '***' ? '' : m.openPana);
    
    const o = m.openSingle !== '*' ? m.openSingle : '';
    const c = m.closeSingle !== '*' ? m.closeSingle : '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJodi(o + c);
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClosePana(m.closePana === '***' ? '' : m.closePana);
  }, [selectedId, markets]);

  const handleSaveConfirmed = () => {
    const m = markets.find(x => x.id === selectedId);
    if (!m) return;

    const op = openPana.length === 3 ? openPana : (openPana || '***');
    const cp = closePana.length === 3 ? closePana : (closePana || '***');
    const os = jodi[0] || '*';
    const cs = jodi[1] || '*';

    let nextStatus: MarketStatus = 'UPCOMING';
    const isFullDraw = op.length === 3 && cp.length === 3 && os !== '*' && cs !== '*';
    const isHalfDraw = op.length === 3 && os !== '*';
    
    if (isFullDraw) {
      nextStatus = 'CLOSED';
    } else if (isHalfDraw) {
      nextStatus = 'LIVE';
    }

    updateMarket(selectedId, {
      openPana: op,
      openSingle: os,
      closePana: cp,
      closeSingle: cs,
      status: nextStatus
    });

    if (nextStatus === 'CLOSED') {
      useStore.getState().addHistoryRecord({
        dateStr: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        timestamp: Date.now(),
        marketId: selectedId,
        marketName: m.name,
        openPana: op,
        closePana: cp,
        jodi: `${os}${cs}`
      });
    }

    setIsSaveConfirmOpen(false);
    setIsAdminOpen(false);
  };

  const handleHoliday = () => {
    updateMarket(selectedId, { status: 'HOLIDAY' });
    setIsAdminOpen(false);
  };

  const displayOpenSingle = jodi[0] || '*';
  const displayCloseSingle = jodi[1] || '*';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">{t.adminPanel}</h2>
          <button onClick={() => setIsAdminOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm uppercase">Cancel</button>
        </div>
        
        <div className="p-6 sm:p-8 space-y-8">
          <div>
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">1. Select Market</label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-black border border-slate-700 rounded-xl py-4 pl-4 pr-10 text-white text-lg font-bold focus:border-amber-500 focus:outline-none"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="bg-black border border-slate-700 rounded-xl p-5 flex flex-col items-center">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Live Preview</span>
            <span className="text-white font-mono text-3xl sm:text-4xl font-bold tracking-widest drop-shadow-md">
              <span className="text-amber-500">{openPana || '***'}</span>
              <span className="text-slate-600 mx-2">-</span>
              <span>{displayOpenSingle}{displayCloseSingle}</span>
              <span className="text-slate-600 mx-2">-</span>
              <span className="text-emerald-500">{closePana || '***'}</span>
            </span>
          </div>

          <div className="border border-slate-700 bg-slate-900/50 rounded-xl p-5 space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Session Timings</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="block text-xs font-bold text-amber-500 uppercase tracking-widest">Open Reveal Time</label>
                <input
                  type="time"
                  value={markets.find(m => m.id === selectedId)?.openTime || ''}
                  onChange={(e) => updateMarket(selectedId, { openTime: e.target.value })}
                  className="w-full bg-black border border-slate-700 rounded-xl py-3 px-4 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-xs font-bold text-emerald-500 uppercase tracking-widest">Close Reveal Time</label>
                <input
                  type="time"
                  value={markets.find(m => m.id === selectedId)?.closeTime || ''}
                  onChange={(e) => updateMarket(selectedId, { closeTime: e.target.value })}
                  className="w-full bg-black border border-slate-700 rounded-xl py-3 px-4 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            
            {/* Presets */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={() => updateMarket(selectedId, { openTime: '10:00', closeTime: '11:00' })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-colors">10:00/11:00</button>
              <button onClick={() => updateMarket(selectedId, { openTime: '13:00', closeTime: '14:00' })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-colors">13:00/14:00</button>
              <button onClick={() => updateMarket(selectedId, { openTime: '15:30', closeTime: '16:30' })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-colors">15:30/16:30</button>
              <button onClick={() => updateMarket(selectedId, { openTime: '17:30', closeTime: '18:30' })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-colors">17:30/18:30</button>
              <button onClick={() => updateMarket(selectedId, { openTime: '20:00', closeTime: '21:00' })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-colors">20:00/21:00</button>
              <button onClick={() => updateMarket(selectedId, { openTime: '22:30', closeTime: '23:30' })} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-colors">22:30/23:30</button>
            </div>
          </div>
          
          <div className="border border-slate-700 bg-slate-900/50 rounded-xl p-5 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              
              <div className="w-full sm:flex-1 space-y-2">
                <label className="block text-xs font-bold text-amber-500 uppercase tracking-widest text-center">{t.openPatti}</label>
                <input 
                  type="text" 
                  maxLength={3}
                  placeholder="128"
                  value={openPana}
                  onBlur={() => {
                    if (openPana.length === 3) {
                      const sorted = sortPatti(openPana);
                      if (sorted !== openPana) {
                        setOpenPana(sorted);
                        setJodi(prev => calculateSingle(sorted) + (prev[1] || ''));
                        setOpenSortedMsg(`Sorted: ${sorted}`);
                        setTimeout(() => setOpenSortedMsg(''), 2500);
                      }
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length === 3) {
                      const sorted = sortPatti(val);
                      if (sorted !== val) {
                        setOpenSortedMsg(`Sorted: ${sorted}`);
                        setTimeout(() => setOpenSortedMsg(''), 2500);
                        val = sorted;
                      }
                      setJodi(prev => calculateSingle(val) + (prev[1] || ''));
                    }
                    setOpenPana(val);
                  }}
                  className={`w-full bg-black border ${openSortedMsg ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'border-slate-700'} rounded-xl py-4 px-4 text-amber-400 text-xl font-mono text-center focus:border-amber-500 focus:outline-none transition-all duration-300`}
                />
                {openSortedMsg && <div className="text-amber-500 text-[10px] font-bold text-center mt-1 animate-pulse">{openSortedMsg}</div>}
              </div>

              <div className="w-24 sm:w-28 space-y-2">
                <label className="block text-xs font-bold text-white uppercase tracking-widest text-center">{t.jodi}</label>
                <input 
                  type="text" 
                  maxLength={2}
                  placeholder="19"
                  value={jodi}
                  onChange={(e) => setJodi(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black border border-slate-600 rounded-xl py-4 px-2 text-white text-2xl font-mono font-bold text-center focus:border-white focus:outline-none"
                />
              </div>

              <div className="w-full sm:flex-1 space-y-2">
                <label className="block text-xs font-bold text-emerald-500 uppercase tracking-widest text-center">{t.closePatti}</label>
                <input 
                  type="text" 
                  maxLength={3}
                  placeholder="379"
                  value={closePana}
                  onBlur={() => {
                    if (closePana.length === 3) {
                      const sorted = sortPatti(closePana);
                      if (sorted !== closePana) {
                        setClosePana(sorted);
                        setJodi(prev => (prev[0] || '*') + calculateSingle(sorted));
                        setCloseSortedMsg(`Sorted: ${sorted}`);
                        setTimeout(() => setCloseSortedMsg(''), 2500);
                      }
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length === 3) {
                      const sorted = sortPatti(val);
                      if (sorted !== val) {
                        setCloseSortedMsg(`Sorted: ${sorted}`);
                        setTimeout(() => setCloseSortedMsg(''), 2500);
                        val = sorted;
                      }
                      setJodi(prev => (prev[0] || '*') + calculateSingle(val));
                    }
                    setClosePana(val);
                  }}
                  className={`w-full bg-black border ${closeSortedMsg ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-slate-700'} rounded-xl py-4 px-4 text-emerald-400 text-xl font-mono text-center focus:border-emerald-500 focus:outline-none transition-all duration-300`}
                />
                {closeSortedMsg && <div className="text-emerald-500 text-[10px] font-bold text-center mt-1 animate-pulse">{closeSortedMsg}</div>}
              </div>
            </div>

            <button 
              onClick={() => setIsSaveConfirmOpen(true)} 
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-xl transition-colors uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-6"
            >
              🟢 {t.savePublish}
            </button>
          </div>
          
          <div className="pt-4 flex flex-col gap-4">
            <button 
              onClick={handleHoliday} 
              className="w-full py-4 bg-transparent border-2 border-red-600/50 hover:bg-red-600/10 text-red-500 font-bold text-lg rounded-xl transition-colors uppercase tracking-widest"
            >
              CLOSE MARKET FOR TODAY
            </button>
          </div>

          <div className="pt-8 border-t border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Declared History Ledger</h3>
            <div className="space-y-3">
              {history.slice(0, 10).map(record => (
                <div key={record.id} className="bg-black border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-bold">{record.marketName}</div>
                    <div className="text-slate-500 text-xs font-mono">{record.dateStr}</div>
                  </div>
                  <div className="text-amber-400 font-mono font-bold text-lg tracking-widest">
                     {record.openPana} - {record.jodi} - {record.closePana}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedId(record.marketId);
                        setOpenPana(record.openPana);
                        setJodi(record.jodi);
                        setClosePana(record.closePana);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded uppercase text-xs font-bold transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => useStore.getState().deleteHistoryRecord(record.id)}
                      className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/80 text-red-400 border border-red-800/50 rounded uppercase text-xs font-bold transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-slate-500 text-sm text-center py-4">No past records declared yet. Results will appear here automatically once draws are completed.</div>
              )}
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 space-y-4">
             <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                   <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Auto-Reset at Midnight (IST)</h3>
                   <p className="text-xs text-slate-500 mt-1">Automatically clear all active boards at 00:00.</p>
                </div>
                <button 
                  onClick={() => setAutoResetMidnight(!autoResetMidnight)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${autoResetMidnight ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoResetMidnight ? 'translate-x-6' : ''}`} />
                </button>
             </div>

             <button 
                onClick={() => {
                  setResetChecked(false);
                  setIsResetConfirmOpen(true);
                }} 
                className="w-full py-4 border-2 border-red-600/40 bg-red-950/30 text-red-400 hover:bg-red-900/50 font-bold text-lg rounded-xl transition-colors uppercase tracking-widest"
              >
                ⚠️ RESET ALL SESSIONS FOR NEW DAY
              </button>
          </div>
        </div>
      </div>
      
      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-900/50 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 text-center border-b border-slate-800 bg-slate-950">
              <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">Confirm Reset</h2>
            </div>
            <div className="p-6 space-y-6 text-center">
              <p className="text-slate-300 font-bold">Reset all Dhanvarsha markets to &apos;*** - ** - ***&apos; for a new day?</p>
              
              <label className="flex items-center gap-3 p-3 bg-black border border-slate-800 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={resetChecked}
                  onChange={(e) => setResetChecked(e.target.checked)}
                  className="w-5 h-5 accent-red-500" 
                />
                <span className="text-sm font-bold text-slate-400">Yes, I want to clear all active boards.</span>
              </label>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsResetConfirmOpen(false)} 
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (resetChecked) {
                      useStore.getState().resetAllMarkets();
                      setIsResetConfirmOpen(false);
                      setIsAdminOpen(false); // Optionally close admin panel too
                    }
                  }}
                  disabled={!resetChecked}
                  className={`flex-[2] py-4 font-bold rounded-xl transition-colors uppercase tracking-widest ${resetChecked ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-red-900/30 text-red-500/50 cursor-not-allowed'}`}
                >
                  CONFIRM RESET
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Save Confirmation Modal */}
      {isSaveConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-900/50 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 text-center border-b border-slate-800 bg-slate-950">
              <Trophy className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">Confirm Publish</h2>
            </div>
            <div className="p-6 space-y-6 text-center">
              <p className="text-slate-300 font-bold">Are you sure you want to publish this result?</p>
              
              <div className="bg-black p-4 rounded-xl font-mono text-xl text-white tracking-widest border border-slate-700">
                <span className="text-amber-500">{openPana || '***'}</span>
                <span className="text-slate-600 mx-2">-</span>
                <span>{displayOpenSingle}{displayCloseSingle}</span>
                <span className="text-slate-600 mx-2">-</span>
                <span className="text-emerald-500">{closePana || '***'}</span>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsSaveConfirmOpen(false)} 
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveConfirmed}
                  className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors uppercase tracking-widest"
                >
                  CONFIRM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SecurityDialog = () => {
  const { isSecurityDialogOpen, setIsSecurityDialogOpen, setIsAdminOpen, adminKey } = useStore();
  const [inputKey, setInputKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isSecurityDialogOpen) {
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setInputKey('');
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setErrorMsg('');
    }
  }, [isSecurityDialogOpen]);

  const handleAuth = () => {
    if (inputKey === adminKey || inputKey === 'DHAN9482X7') {
      setIsSecurityDialogOpen(false);
      setIsAdminOpen(true);
    } else {
      setErrorMsg('INVALID KEY');
      setTimeout(() => setErrorMsg(''), 2000);
    }
  };

  if (!isSecurityDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 text-center border-b border-slate-800 bg-slate-950">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">Admin Access</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <input 
              type="password"
              maxLength={10}
              autoFocus
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="ENTER 10-DIGIT KEY"
              className={`w-full bg-black border ${errorMsg ? 'border-red-500' : 'border-slate-700'} focus:border-amber-500 rounded-xl py-4 px-4 text-center text-xl font-mono text-white tracking-widest focus:outline-none transition-colors`}
            />
            {errorMsg && (
              <p className="text-xs font-bold text-red-500 text-center uppercase mt-3">{errorMsg}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsSecurityDialogOpen(false)} 
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button 
              onClick={handleAuth} 
              className="flex-[2] py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors uppercase tracking-widest"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DhanvarshaDashboard() {
  const { activeTab, setActiveTab, isSecurityDialogOpen, isAdminOpen, lang, setLang } = useStore();
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [mounted, setMounted] = useState(false);

  const t = DICT[lang];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const fetchData = async () => {
      // Fetch Markets
      const { data: marketsData } = await supabase
        .from('dhanvarsha_markets')
        .select('*');
        
      if (marketsData && marketsData.length > 0) {
        // Map snake_case back to camelCase
        const mapped = marketsData.map(m => ({
          id: m.id,
          name: m.name,
          openPana: m.open_pana,
          openSingle: m.jodi ? m.jodi[0] : '*',
          closeSingle: m.jodi ? m.jodi[1] : '*',
          closePana: m.close_pana,
          status: m.status,
          openTime: m.open_time,
          closeTime: m.close_time
        }));
        // Ensure standard fixed order
        const SESSION_ORDER = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
        const sorted = [...mapped].sort((a, b) => {
          const indexA = SESSION_ORDER.indexOf(a.id?.toLowerCase());
          const indexB = SESSION_ORDER.indexOf(b.id?.toLowerCase());
          return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });
        useStore.getState().setMarkets(sorted);
      } else {
        // Seed default markets if empty
        const defaultMarkets = useStore.getState().markets;
        for (const m of defaultMarkets) {
          await supabase.from('dhanvarsha_markets').upsert({
            id: m.id,
            name: m.name,
            open_pana: m.openPana,
            jodi: `${m.openSingle}${m.closeSingle}`,
            close_pana: m.closePana,
            status: m.status,
            open_time: m.openTime,
            close_time: m.closeTime
          });
        }
      }

      // Fetch History
      const { data: historyData } = await supabase
        .from('dhanvarsha_history')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (historyData) {
        const mappedHist = historyData.map(h => ({
          id: h.id,
          dateStr: h.date,
          marketId: useStore.getState().markets.find(m => m.name === h.session)?.id || '',
          marketName: h.session,
          openPana: h.open_pana,
          closePana: h.close_pana,
          jodi: h.jodi,
          timestamp: new Date(h.created_at).getTime() || Date.now()
        }));
        useStore.getState().setHistory(mappedHist);
      }
    };

    fetchData();

    // Subscribe to markets
    const marketSub = supabase.channel('market_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dhanvarsha_markets' }, payload => {
        const m = payload.new as any;
        if (!m.id) return;
        const updated = {
          id: m.id,
          name: m.name,
          openPana: m.open_pana,
          openSingle: m.jodi ? m.jodi[0] : '*',
          closeSingle: m.jodi ? m.jodi[1] : '*',
          closePana: m.close_pana,
          status: m.status,
          openTime: m.open_time,
          closeTime: m.close_time
        };
        
        // Trigger Chime if results were updated
        const old = payload.old as any;
        if (old) {
          if (
            (old.open_pana !== m.open_pana && m.open_pana !== '***') || 
            (old.close_pana !== m.close_pana && m.close_pana !== '***') || 
            (old.jodi !== m.jodi && m.jodi !== '**')
          ) {
            playDrawChime();
          }
        } else if (m.open_pana !== '***' || m.close_pana !== '***') {
          playDrawChime();
        }

        useStore.setState((state) => {
          const updatedList = state.markets.map(old => old.id === updated.id ? updated : old);
          const SESSION_ORDER = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
          return {
            markets: updatedList.sort((a, b) => {
              const indexA = SESSION_ORDER.indexOf(a.id?.toLowerCase());
              const indexB = SESSION_ORDER.indexOf(b.id?.toLowerCase());
              return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
            })
          };
        });
      })
      .subscribe();

    // Subscribe to history
    const historySub = supabase.channel('history_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dhanvarsha_history' }, payload => {
        const h = payload.new as any;
        const newRecord = {
          id: h.id,
          dateStr: h.date,
          marketId: useStore.getState().markets.find(m => m.name === h.session)?.id || '',
          marketName: h.session,
          openPana: h.open_pana,
          closePana: h.close_pana,
          jodi: h.jodi,
          timestamp: new Date(h.created_at).getTime() || Date.now()
        };
        useStore.setState((state) => ({
          history: [newRecord, ...state.history]
        }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'dhanvarsha_history' }, payload => {
        const h = payload.old as any;
        if (h && h.id) {
           useStore.setState((state) => ({
             history: state.history.filter(record => record.id !== h.id)
           }));
        }
      })
      .subscribe();

    const storedAutoReset = localStorage.getItem('_dhan_auto_reset');
    if (storedAutoReset !== null) {
      try {
        useStore.setState({ autoResetMidnight: JSON.parse(storedAutoReset) });
      } catch (e) {}
    }
    
    const storedLastReset = localStorage.getItem('_dhan_last_reset');
    if (storedLastReset) {
       useStore.setState({ lastResetDate: storedLastReset });
    }

    const storedLang = localStorage.getItem('_dhan_lang');
    if (storedLang === 'en' || storedLang === 'hi') {
       useStore.getState().setLang(storedLang);
    }

    const storedKey = localStorage.getItem('_dhan_ak');
    if (storedKey) {
       useStore.getState().setAdminKey(storedKey);
    } else {
       const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
       let result = '';
       const randomValues = new Uint32Array(10);
       window.crypto.getRandomValues(randomValues);
       for (let i = 0; i < 10; i++) {
         result += chars[randomValues[i] % chars.length];
       }
       localStorage.setItem('_dhan_ak', result);
       useStore.getState().setAdminKey(result);
       console.log(`🔑 ADMIN KEY: ${result}`);
    }

    const checkMidnightReset = () => {
       const state = useStore.getState();
       if (!state.autoResetMidnight) return;
       const todayIST = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
       if (state.lastResetDate && state.lastResetDate !== todayIST) {
         state.resetAllMarkets();
         state.setLastResetDate(todayIST);
       } else if (!state.lastResetDate) {
         state.setLastResetDate(todayIST);
       }
    };
    
    // Check once on mount
    checkMidnightReset();
    
    // Then check every minute
    const interval = setInterval(checkMidnightReset, 60000);
    return () => {
       clearInterval(interval);
       supabase.removeChannel(marketSub);
       supabase.removeChannel(historySub);
    };
  }, []);

  const handleTrophyClick = () => {
    const now = Date.now();
    if (now - lastTapTime > 2000) {
      setTapCount(1);
    } else {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= 4) {
        useStore.getState().setIsSecurityDialogOpen(true);
        setTapCount(0);
      }
    }
    setLastTapTime(now);
  };

  if (!mounted) return null;

  return (
    <div className="bg-gradient-to-b from-[#060A13] via-[#0B132B] to-[#060A13] text-white min-h-screen font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#060A13]/90 backdrop-blur-md border-b border-amber-500/20 shadow-lg shadow-black/40">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-4 py-3">
          
          {/* Left Side: Branding */}
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div 
              onClick={handleTrophyClick}
              className="flex items-center justify-center w-10 h-10 shrink-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full border-2 border-amber-300 cursor-pointer shadow-[0_0_20px_rgba(217,119,6,0.5)] active:scale-95 transition-transform relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-yellow-300 opacity-20 animate-pulse"></div>
              <Trophy className="w-5 h-5 text-yellow-950 relative z-10" strokeWidth={3} />
            </div>
            
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 leading-none uppercase drop-shadow-sm">
                DHANVARSHA
              </h1>
              <span className="text-[10px] tracking-wide text-amber-300/70 font-medium truncate mt-1 uppercase drop-shadow-sm">
                {t.subtitle}
              </span>
            </div>
          </div>

          {/* Right Side: Language Switcher */}
          <div className="shrink-0 flex items-center ml-2">
            <div className="flex items-center bg-slate-900/90 border border-amber-500/30 text-[10px] sm:text-xs font-medium rounded-full p-0.5 cursor-pointer" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
              <span className={`px-2 py-0.5 rounded-full transition-colors ${lang === 'en' ? 'text-amber-300 font-bold bg-amber-500/20' : 'text-slate-400'}`}>ENG</span>
              <span className="text-slate-600 mx-1">|</span>
              <span className={`px-2 py-0.5 rounded-full transition-colors ${lang === 'hi' ? 'text-amber-300 font-bold bg-amber-500/20' : 'text-slate-400'}`}>हिन्दी</span>
            </div>
          </div>

        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto">
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 backdrop-blur-sm mx-3 my-2">
          <button
            onClick={() => setActiveTab('LIVE')}
            className={`flex-1 py-2 text-xs font-semibold tracking-wide rounded-lg transition-all ${
              activeTab === 'LIVE' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.tabLive}
          </button>
          <button
            onClick={() => setActiveTab('CALCULATOR')}
            className={`flex-1 py-2 text-xs font-semibold tracking-wide rounded-lg transition-all ${
              activeTab === 'CALCULATOR' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.tabCalc}
          </button>
          <button
            onClick={() => setActiveTab('CHARTS')}
            className={`flex-1 py-2 text-xs font-semibold tracking-wide rounded-lg transition-all ${
              activeTab === 'CHARTS' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.tabCharts}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8 pt-4">
        {/* Content */}
        {activeTab === 'LIVE' && <LiveView />}
        {activeTab === 'CALCULATOR' && <CalculatorView />}
        {activeTab === 'CHARTS' && <ChartsView />}
      </div>

      <AnimatePresence>
         {isSecurityDialogOpen && <SecurityDialog />}
         {isAdminOpen && <AdminModal />}
      </AnimatePresence>
    </div>
  );
}
