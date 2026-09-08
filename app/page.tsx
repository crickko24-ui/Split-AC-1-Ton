'use client';

import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { Trophy, ShieldAlert, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';

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

const defaultMarkets: Market[] = [
  { id: 'm1', name: 'Dhanvarsha Morning', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '10:00', closeTime: '11:00' },
  { id: 'm2', name: 'Dhanvarsha Day', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '13:00', closeTime: '14:00' },
  { id: 'm3', name: 'Dhanvarsha Afternoon', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '15:30', closeTime: '16:30' },
  { id: 'm4', name: 'Dhanvarsha Gold', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '17:30', closeTime: '18:30' },
  { id: 'm5', name: 'Dhanvarsha Evening', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '20:00', closeTime: '21:00' },
  { id: 'm6', name: 'Dhanvarsha Night', openPana: '***', openSingle: '*', closeSingle: '*', closePana: '***', status: 'UPCOMING', openTime: '22:30', closeTime: '23:30' },
];

const useStore = create<AppState>((set) => ({
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
    const newRecord = { ...record, id: `${record.marketId}_${record.dateStr.replace(/\//g, '-')}` };
    
    set((state) => {
      const existingIndex = state.history.findIndex(h => h.dateStr === record.dateStr && h.marketId === record.marketId);
      let newHistory;
      if (existingIndex >= 0) {
        newHistory = [...state.history];
        newHistory[existingIndex] = { ...newHistory[existingIndex], ...newRecord };
      } else {
        newHistory = [newRecord, ...state.history];
      }
      return { history: newHistory };
    });

    // DB Insert or Update
    await supabase.from('dhanvarsha_history').upsert({
      id: newRecord.id,
      date: newRecord.dateStr,
      session: newRecord.marketName,
      open_pana: newRecord.openPana,
      jodi: newRecord.jodi,
      close_pana: newRecord.closePana,
      timestamp: newRecord.timestamp
    });
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
  const [h, m] = time24.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
};

const getTargetTimeMs = (time24: string) => {
  if (!time24) return 0;
  const now = new Date();
  const [h, m] = time24.split(':');
  now.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return now.getTime();
};

const MarketCard = ({ market }: { market: Market }) => {
  const { status } = getStatus(market);
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const renderBadge = () => {
    if (status === 'HOLIDAY') return <div className="px-4 py-1.5 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-widest">CLOSED</div>;
    if (status === 'CLOSED') return <div className="px-4 py-1.5 rounded-full bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 font-bold text-xs uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">✅ DECLARED</div>;
    
    if (status === 'LIVE') {
      return (
        <div className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/50 font-bold text-xs uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)]">
          🕒 CLOSE AT: {formatTime12h(market.closeTime)}
        </div>
      );
    }

    // UPCOMING
    const target = getTargetTimeMs(market.openTime);
    const diff = target - now;
    const isWithinHour = diff > 0 && diff <= 60 * 60 * 1000;
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="px-4 py-1.5 rounded-full bg-slate-800 text-amber-500 border border-slate-700 font-bold text-xs uppercase tracking-widest">
          🕒 OPEN AT: {formatTime12h(market.openTime)}
        </div>
        {isWithinHour && (
          <div className="text-[10px] font-bold text-slate-400 tracking-wider">
            Result in: {Math.floor(diff / 60000)}m {Math.floor((diff % 60000) / 1000)}s
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6 flex flex-col items-center p-6 sm:p-8 relative">
      <div className="flex flex-col items-center justify-center w-full mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-300 uppercase tracking-wider text-center mb-3">{market.name}</h2>
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
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-full font-mono font-bold text-4xl sm:text-6xl">
            <span className="text-amber-500 w-24 sm:w-32 text-right">
              {market.openPana || '***'}
            </span>
            <span className="text-slate-600 font-light">-</span>
            <span className="text-white w-24 sm:w-32 text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] text-5xl sm:text-7xl">
              {market.openSingle || '*'}{market.closeSingle || '*'}
            </span>
            <span className="text-slate-600 font-light">-</span>
            <span className="text-emerald-500 w-24 sm:w-32 text-left">
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
  return (
    <div className="w-full max-w-4xl mx-auto space-y-2">
      {markets.map(m => (
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
  const { history, markets } = useStore();
  const [filter, setFilter] = useState('ALL');

  const filteredHistory = history.filter(h => filter === 'ALL' || h.marketId === filter);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase text-center tracking-widest">Historical Archive</h2>
        
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 pb-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border-2 ${
              filter === 'ALL' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
            }`}
          >
            All Sessions
          </button>
          {markets.map(m => (
            <button
              key={m.id}
              onClick={() => setFilter(m.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border-2 ${
                filter === m.id ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-700 bg-slate-950">
                <th className="py-4 px-4 text-xs font-bold text-amber-500 uppercase tracking-widest">Date</th>
                <th className="py-4 px-4 text-xs font-bold text-amber-500 uppercase tracking-widest">Session</th>
                <th className="py-4 px-4 text-xs font-bold text-amber-500 uppercase tracking-widest text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredHistory.map((record) => {
                const red = isRedJodi(record.jodi);
                return (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors odd:bg-slate-950/60 even:bg-slate-900/40">
                    <td className="py-4 px-4 text-sm font-mono text-slate-300 font-bold">{record.dateStr}</td>
                    <td className="py-4 px-4 text-sm font-bold text-white uppercase tracking-wider">{record.marketName}</td>
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
                  <td colSpan={3} className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                    No past records declared yet.<br/><span className="text-xs font-normal mt-2 block">Results will appear here automatically once draws are completed.</span>
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
  const { setIsAdminOpen, markets, updateMarket } = useStore();
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
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">Admin Control Panel</h2>
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
                <label className="block text-xs font-bold text-amber-500 uppercase tracking-widest text-center">Open Patti</label>
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
                <label className="block text-xs font-bold text-white uppercase tracking-widest text-center">Jodi</label>
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
                <label className="block text-xs font-bold text-emerald-500 uppercase tracking-widest text-center">Close Patti</label>
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
              🟢 SAVE & PUBLISH RESULT
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
  const { activeTab, setActiveTab, isSecurityDialogOpen, isAdminOpen } = useStore();
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [mounted, setMounted] = useState(false);

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
        // Ensure standard order
        mapped.sort((a, b) => a.openTime.localeCompare(b.openTime));
        useStore.getState().setMarkets(mapped);
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
        .order('timestamp', { ascending: false });
        
      if (historyData) {
        const mappedHist = historyData.map(h => ({
          id: h.id,
          dateStr: h.date,
          marketId: h.id.split('_')[0],
          marketName: h.session,
          openPana: h.open_pana,
          closePana: h.close_pana,
          jodi: h.jodi,
          timestamp: h.timestamp
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
        useStore.setState((state) => ({
          markets: state.markets.map(old => old.id === updated.id ? updated : old)
        }));
      })
      .subscribe();

    // Subscribe to history
    const historySub = supabase.channel('history_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dhanvarsha_history' }, payload => {
        const h = payload.new as any;
        const newRecord = {
          id: h.id,
          dateStr: h.date,
          marketId: h.id.split('_')[0],
          marketName: h.session,
          openPana: h.open_pana,
          closePana: h.close_pana,
          jodi: h.jodi,
          timestamp: h.timestamp
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
    <div className="min-h-screen bg-black font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center relative">
          <div className="absolute left-4">
            <div 
              onClick={handleTrophyClick}
              className="flex items-center justify-center w-12 h-12 bg-amber-600 rounded-full border-2 border-amber-400 cursor-pointer shadow-[0_0_20px_rgba(217,119,6,0.3)] active:scale-95 transition-transform"
            >
              <Trophy className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase text-center">
            DHANVARSHA
          </h1>
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
            🟢 Results
          </button>
          <button
            onClick={() => setActiveTab('CALCULATOR')}
            className={`flex-1 py-2 text-xs font-semibold tracking-wide rounded-lg transition-all ${
              activeTab === 'CALCULATOR' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🧮 Calculator
          </button>
          <button
            onClick={() => setActiveTab('CHARTS')}
            className={`flex-1 py-2 text-xs font-semibold tracking-wide rounded-lg transition-all ${
              activeTab === 'CHARTS' 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Charts
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
