import { useState, useMemo, FormEvent } from 'react';
import { Trade, EmotionalState, UserSettings } from '../../types';
import { dbService } from '../../services/dbService';
import { auth } from '../../lib/firebase';
import { Plus, X, Check, Target, TrendingDown, TrendingUp, AlertCircle, AlertTriangle, BarChart3, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useRiskManager } from '../../hooks/useRiskManager';

interface TradeJournalProps {
  trades: Trade[];
  onTradeAdded: (trade: Trade) => void;
  onTradeUpdated: (trade: Trade) => void;
  onTradeDeleted: (tradeId: string) => void;
  settings: UserSettings;
}

const MISTAKES_OPTIONS = [
  'FOMO', 'Revenge trading', 'Over-risk', 'No confirmation', 
  'Early entry', 'Late exit', 'Early exit', 'Ignoring Stop Loss',
  'Emotional entry', 'No Plan', 'Overtrading', 'News trading'
];

const EMOTIONS_OPTIONS: EmotionalState[] = ['CALM', 'CONFIDENT', 'EXCITED', 'ANXIOUS', 'FEAR', 'ANGRY', 'REVENGE', 'TIRED', 'FOMO'];

export default function TradeJournal({ trades, onTradeAdded, onTradeUpdated, onTradeDeleted, settings }: TradeJournalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'symbol'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const risk = useRiskManager(trades, settings);

  const initialFormData = {
    symbol: '',
    side: 'LONG' as 'LONG' | 'SHORT',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    targetPrice: '',
    quantity: '',
    riskPercentage: '1',
    setupType: '',
    tradeReason: '',
    marketCondition: 'TRENDING' as any,
    confirmations: [] as string[],
    entryQuality: 'PERFECT' as any,
    exitQuality: 'PERFECT' as any,
    followedPlan: true,
    followedSL: true,
    respectedRR: true,
    psyBefore: 'CALM' as EmotionalState,
    psyDuring: 'CALM' as EmotionalState,
    psyAfter: 'CALM' as EmotionalState,
    boredomTrade: false,
    revengeTrade: false,
    pressureToWin: false,
    overallTrend: 'NEUTRAL' as any,
    volatility: 'MEDIUM' as any,
    newsEvent: false,
    mistakes: [] as string[]
  };

  const [formData, setFormData] = useState(initialFormData);

  const livePnl = useMemo(() => {
    const entry = parseFloat(formData.entryPrice);
    const exit = parseFloat(formData.exitPrice);
    const qty = parseFloat(formData.quantity);
    if (isNaN(entry) || isNaN(exit) || isNaN(qty)) return null;

    const rawPnl = formData.side === 'LONG' 
      ? (exit - entry) * qty 
      : (entry - exit) * qty;
    return Math.round(rawPnl * 100) / 100;
  }, [formData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || (risk.isLocked && !editingTradeId)) return;

    const tradeData: any = {
      userId: auth.currentUser.uid,
      symbol: formData.symbol.toUpperCase(),
      side: formData.side,
      entryPrice: parseFloat(formData.entryPrice),
      exitPrice: parseFloat(formData.exitPrice),
      stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
      targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : null,
      quantity: parseFloat(formData.quantity),
      pnl: livePnl || 0,
      riskPercentage: parseFloat(formData.riskPercentage),
      setupType: formData.setupType,
      tradeReason: formData.tradeReason,
      marketCondition: formData.marketCondition,
      confirmations: formData.confirmations,
      executionQuality: {
        entry: formData.entryQuality,
        exit: formData.exitQuality,
        followedSL: formData.followedSL,
        followedPlan: formData.followedPlan,
        respectedRR: formData.respectedRR
      },
      psychology: {
        before: formData.psyBefore,
        during: formData.psyDuring,
        after: formData.psyAfter,
        boredomTrade: formData.boredomTrade,
        revengeTrade: formData.revengeTrade,
        pressureToWin: formData.pressureToWin
      },
      marketContext: {
        overallTrend: formData.overallTrend,
        volatility: formData.volatility,
        newsEvent: formData.newsEvent
      },
      mistakes: formData.mistakes,
    };

    try {
      if (editingTradeId) {
        await dbService.updateDocument(`users/${auth.currentUser.uid}/trades`, editingTradeId, tradeData);
        onTradeUpdated({ ...tradeData, id: editingTradeId });
      } else {
        tradeData.entryTime = new Date().toISOString();
        tradeData.exitTime = new Date().toISOString();
        tradeData.createdAt = null; // serverTimestamp handled by dbService
        const id = await dbService.addDocument(`users/${auth.currentUser.uid}/trades`, tradeData);
        onTradeAdded({ ...tradeData, id });
      }
      setIsAdding(false);
      setEditingTradeId(null);
      setActiveStep(0);
      setFormData(initialFormData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditingTradeId(trade.id || null);
    setFormData({
      symbol: trade.symbol,
      side: trade.side,
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice.toString(),
      stopLoss: trade.stopLoss?.toString() || '',
      targetPrice: trade.targetPrice?.toString() || '',
      quantity: trade.quantity.toString(),
      riskPercentage: trade.riskPercentage?.toString() || '1',
      setupType: trade.setupType,
      tradeReason: trade.tradeReason || '',
      marketCondition: trade.marketCondition || 'TRENDING',
      confirmations: trade.confirmations || [],
      entryQuality: trade.executionQuality?.entry || 'PERFECT',
      exitQuality: trade.executionQuality?.exit || 'PERFECT',
      followedPlan: trade.executionQuality?.followedPlan ?? true,
      followedSL: trade.executionQuality?.followedSL ?? true,
      respectedRR: trade.executionQuality?.respectedRR ?? true,
      psyBefore: trade.psychology?.before || 'CALM',
      psyDuring: trade.psychology?.during || 'CALM',
      psyAfter: trade.psychology?.after || 'CALM',
      boredomTrade: trade.psychology?.boredomTrade ?? false,
      revengeTrade: trade.psychology?.revengeTrade ?? false,
      pressureToWin: trade.psychology?.pressureToWin ?? false,
      overallTrend: trade.marketContext?.overallTrend || 'NEUTRAL',
      volatility: trade.marketContext?.volatility || 'MEDIUM',
      newsEvent: trade.marketContext?.newsEvent ?? false,
      mistakes: trade.mistakes || []
    });
    setIsAdding(true);
    setActiveStep(0);
  };

  const handleDelete = async (tradeId: string) => {
    if (!auth.currentUser) return;
    if (confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
      try {
        await dbService.deleteDocument(`users/${auth.currentUser.uid}/trades`, tradeId);
        onTradeDeleted(tradeId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime();
      } else if (sortBy === 'pnl') {
        comparison = a.pnl - b.pnl;
      } else if (sortBy === 'symbol') {
        comparison = a.symbol.localeCompare(b.symbol);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [trades, sortBy, sortOrder]);

  const toggleSort = (field: 'date' | 'pnl' | 'symbol') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const steps = [
    { title: 'Basics & Data', icon: Target },
    { title: 'Execution Quality', icon: Check },
    { title: 'Psychology & Mistakes', icon: AlertTriangle },
    { title: 'Market Context', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      {isAdding ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 relative shadow-2xl">
          <button 
            onClick={() => {
              setIsAdding(false);
              setEditingTradeId(null);
              setFormData(initialFormData);
            }}
            className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white z-20"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest shrink-0">
              {editingTradeId ? 'Edit Trade' : 'Journal New Trade'}
            </h2>
            <div className="flex items-center gap-6 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3 shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    activeStep === i ? 'bg-blue-600 text-white' : (activeStep > i ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-900 text-zinc-500')
                  }`}>
                    {activeStep > i ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest hidden lg:block ${activeStep === i ? 'text-white' : 'text-zinc-600'}`}>
                    {s.title}
                  </span>
                  {i < steps.length - 1 && <div className="w-4 h-px bg-zinc-800" />}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {activeStep === 0 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Input label="Symbol" value={formData.symbol} onChange={v => setFormData({...formData, symbol: v})} placeholder="NIFTY, BTC" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Side</label>
                    <div className="flex bg-zinc-900 p-1 rounded-xl">
                      {['LONG', 'SHORT'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({...formData, side: s as any})}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            formData.side === s ? (s === 'LONG' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'text-zinc-500'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input label="Quantity" type="number" value={formData.quantity} onChange={v => setFormData({...formData, quantity: v})} />
                  <Input label="Risk %" type="number" value={formData.riskPercentage} onChange={v => setFormData({...formData, riskPercentage: v})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input label="Entry Price" type="number" value={formData.entryPrice} onChange={v => setFormData({...formData, entryPrice: v})} />
                  <Input label="Exit Price" type="number" value={formData.exitPrice} onChange={v => setFormData({...formData, exitPrice: v})} />
                  <Input label="Stop Loss" type="number" value={formData.stopLoss} onChange={v => setFormData({...formData, stopLoss: v})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Setup Type" value={formData.setupType} onChange={v => setFormData({...formData, setupType: v})} placeholder="Breakout, Pullback..." />
                  <Input label="Planned Target Price" type="number" value={formData.targetPrice} onChange={v => setFormData({...formData, targetPrice: v})} />
                </div>
                <textarea 
                  placeholder="Why did you take this trade? (Reasoning)"
                  value={formData.tradeReason}
                  onChange={e => setFormData({...formData, tradeReason: e.target.value})}
                  className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50"
                />
              </div>
            )}

            {activeStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <QualitySelector 
                    label="Entry Quality" 
                    value={formData.entryQuality} 
                    onChange={v => setFormData({...formData, entryQuality: v})} 
                    options={['EARLY', 'PERFECT', 'LATE']} 
                  />
                  <QualitySelector 
                    label="Exit Quality" 
                    value={formData.exitQuality} 
                    onChange={v => setFormData({...formData, exitQuality: v})} 
                    options={['EARLY', 'PERFECT', 'LATE']} 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <Checkbox label="Followed Stop Loss?" checked={formData.followedSL} onChange={v => setFormData({...formData, followedSL: v})} />
                  <Checkbox label="Followed Trade Plan?" checked={formData.followedPlan} onChange={v => setFormData({...formData, followedPlan: v})} />
                  <Checkbox label="Respected Risk-Reward?" checked={formData.respectedRR} onChange={v => setFormData({...formData, respectedRR: v})} />
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <EmotionSelector label="Before" value={formData.psyBefore} onChange={v => setFormData({...formData, psyBefore: v})} />
                  <EmotionSelector label="During" value={formData.psyDuring} onChange={v => setFormData({...formData, psyDuring: v})} />
                  <EmotionSelector label="After" value={formData.psyAfter} onChange={v => setFormData({...formData, psyAfter: v})} />
                </div>
                <div className="flex flex-wrap gap-4 py-2 border-y border-zinc-900">
                  <Checkbox label="Trade out of boredom?" checked={formData.boredomTrade} onChange={v => setFormData({...formData, boredomTrade: v})} />
                  <Checkbox label="Revenge trade?" checked={formData.revengeTrade} onChange={v => setFormData({...formData, revengeTrade: v})} />
                  <Checkbox label="Pressure to win?" checked={formData.pressureToWin} onChange={v => setFormData({...formData, pressureToWin: v})} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mistake Tagging</label>
                  <div className="flex flex-wrap gap-2">
                    {MISTAKES_OPTIONS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          mistakes: prev.mistakes.includes(m) ? prev.mistakes.filter(x => x !== m) : [...prev.mistakes, m]
                        }))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          formData.mistakes.includes(m) ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <QualitySelector 
                    label="Overall Market Trend" 
                    value={formData.overallTrend} 
                    onChange={v => setFormData({...formData, overallTrend: v})} 
                    options={['BULLISH', 'BEARISH', 'NEUTRAL']} 
                  />
                  <QualitySelector 
                    label="Market Condition" 
                    value={formData.marketCondition} 
                    onChange={v => setFormData({...formData, marketCondition: v})} 
                    options={['TRENDING', 'SIDEWAYS', 'VOLATILE']} 
                  />
                  <QualitySelector 
                    label="Volatility" 
                    value={formData.volatility} 
                    onChange={v => setFormData({...formData, volatility: v})} 
                    options={['LOW', 'MEDIUM', 'HIGH']} 
                  />
                </div>
                <div className="p-4 bg-zinc-900 rounded-2xl">
                  <Checkbox label="Was there a major news event present?" checked={formData.newsEvent} onChange={v => setFormData({...formData, newsEvent: v})} />
                </div>
                
                {livePnl !== null && (
                  <div className="flex flex-col items-center justify-center p-8 bg-black border border-zinc-800 rounded-3xl">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Final Trade Outcome</p>
                    <h4 className={`text-4xl font-mono font-bold ${livePnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {livePnl >= 0 ? '+' : ''}₹{livePnl.toLocaleString()}
                    </h4>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4">Calculated based on {formData.quantity} units</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-8 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setActiveStep(s => Math.max(0, s - 1))}
                disabled={activeStep === 0}
                className="px-6 py-2 text-zinc-500 font-bold hover:text-white disabled:opacity-0 transition-all"
              >
                Previous
              </button>
              
              {activeStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep(s => s + 1)}
                  className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={(risk.isLocked && !editingTradeId) || !formData.symbol}
                  className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 transition-all"
                >
                  {editingTradeId ? 'Update Trade' : 'Complete Pro Journal Entry'}
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Recent Trades</h3>
              <p className="text-xs text-zinc-500 font-mono mt-1">TOTAL_RECORDS: {trades.length}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <SortButton active={sortBy === 'date'} order={sortOrder} onClick={() => toggleSort('date')}>Date</SortButton>
                <SortButton active={sortBy === 'symbol'} order={sortOrder} onClick={() => toggleSort('symbol')}>Symbol</SortButton>
                <SortButton active={sortBy === 'pnl'} order={sortOrder} onClick={() => toggleSort('pnl')}>P&L</SortButton>
              </div>
              
              <button 
                onClick={() => {
                  setEditingTradeId(null);
                  setFormData(initialFormData);
                  setIsAdding(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
              >
                Manual Log
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {sortedTrades.map(trade => (
              <div key={trade.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-wrap md:flex-nowrap items-center justify-between gap-4 group hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className={`p-3 rounded-xl ${trade.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {trade.pnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white">{trade.symbol}</h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {trade.side}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {trade.quantity} units • {format(new Date(trade.entryTime), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>

                <div className="flex-1 hidden md:flex items-center gap-2 px-4">
                  {trade.mistakes.slice(0, 2).map(m => (
                    <span key={m} className="px-2 py-1 bg-zinc-900 text-zinc-500 text-[10px] font-bold rounded uppercase tracking-wider">{m}</span>
                  ))}
                  {trade.mistakes.length > 2 && <span className="text-[10px] text-zinc-500">+{trade.mistakes.length - 2}</span>}
                  {trade.setupType && (
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded uppercase tracking-wider">{trade.setupType}</span>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`font-mono font-bold text-lg ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                      {trade.executionQuality?.followedPlan !== false ? 'Disciplined' : 'Rule Breach'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(trade)}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                      title="Edit Trade"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => trade.id && handleDelete(trade.id)}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete Trade"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {trades.length === 0 && (
              <div className="py-20 text-center bg-zinc-950 border border-dashed border-zinc-900 rounded-2xl">
                <p className="text-zinc-500 text-sm">No trades logged yet. Start journaling your performance.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder = "" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-white focus:outline-none focus:border-blue-500/50 focus:bg-zinc-800 transition-all font-mono"
      />
    </div>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <button 
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
        checked ? 'bg-blue-600 border-blue-600' : 'bg-zinc-950 border-zinc-800 group-hover:border-zinc-700'
      }`}>
        {checked && <Check className="w-4 h-4 text-white" />}
      </div>
      <span className={`text-sm font-medium ${checked ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
    </button>
  );
}

function QualitySelector({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</label>
      <div className="flex bg-zinc-900 p-1 rounded-xl gap-1">
        {options.map((opt: string) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
              value === opt ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmotionSelector({ label, value, onChange }: any) {
  const emotions = ['CALM', 'CONFIDENT', 'FOMO', 'FEAR', 'REVENGE', 'ANXIOUS'] as const;
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label} Trade</label>
      <div className="grid grid-cols-2 gap-2">
        {emotions.map(e => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`py-2 px-3 text-[10px] font-bold rounded-xl border transition-all ${
              value === e ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortButton({ children, active, order, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
        active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-400'
      }`}
    >
      {children}
      {active && (order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
    </button>
  );
}
