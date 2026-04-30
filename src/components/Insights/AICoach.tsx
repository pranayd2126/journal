import { useState, useEffect } from 'react';
import { Trade, AIInsight, DailyChecklist } from '../../types';
import { aiService } from '../../services/aiService';
import { dbService } from '../../services/dbService';
import { auth } from '../../lib/firebase';
import { BrainCircuit, Sparkles, MessageSquare, AlertCircle, Quote, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { where, orderBy } from 'firebase/firestore';

interface AICoachProps {
  trades: Trade[];
}

export default function AICoach({ trades }: AICoachProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    if (auth.currentUser) {
      const fetchInsights = async () => {
        const data = await dbService.getCollection<AIInsight>(`users/${auth.currentUser?.uid}/insights`, [
          orderBy('createdAt', 'desc')
        ]);
        setInsights(data);
      };
      fetchInsights();
    }
  }, []);

  const generateDailyAnalysis = async () => {
    if (!auth.currentUser || trades.length === 0) return;
    setLoading(true);
    
    // Filter trades for today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayTrades = trades.filter(t => t.entryTime.startsWith(todayStr));
    
    // Fetch today's checklist
    const checklists = await dbService.getCollection<DailyChecklist>(`users/${auth.currentUser.uid}/checklists`);
    const todayChecklist = checklists.find(c => c.date === todayStr) || null;
    
    const analysis = await aiService.analyzeDailyTrades(
      todayTrades.length > 0 ? todayTrades : trades.slice(0, 10), 
      todayChecklist
    );
    
    if (analysis) {
      const newInsight: any = {
        userId: auth.currentUser.uid,
        type: 'DAILY',
        period: todayStr,
        content: analysis.content,
        disciplineScore: analysis.disciplineScore,
        topMistakes: analysis.topMistakes,
        suggestions: analysis.suggestions,
      };
      
      const id = await dbService.addDocument(`users/${auth.currentUser.uid}/insights`, newInsight);
      setInsights([{ ...newInsight, id }, ...insights]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="p-8 bg-zinc-950 border border-zinc-900 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <BrainCircuit className="w-32 h-32" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <BrainCircuit className="w-10 h-10 text-blue-500" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">AI Trading Performance Coach</h2>
            <p className="text-zinc-500 text-sm max-w-md">
              I analyze your behavior, emotions, and trade data to identify mistakes you might be ignoring.
            </p>
          </div>
          <button 
            onClick={generateDailyAnalysis}
            disabled={loading}
            className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Analyze Session
          </button>
        </div>
      </div>

      <div className="space-y-6">
         <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-4">Insights History</h3>
         
         {insights.map((insight) => (
           <InsightCard key={insight.id} insight={insight} />
         ))}

         {insights.length === 0 && !loading && (
           <div className="text-center py-20 bg-zinc-950/50 rounded-3xl border border-dashed border-zinc-900">
             <MessageSquare className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
             <p className="text-zinc-500 font-medium italic">No insights generated yet. Click above to analyze your performance.</p>
           </div>
         )}
      </div>
    </div>
  );
}

interface InsightCardProps {
  insight: AIInsight;
  key?: any;
}

function InsightCard({ insight }: InsightCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 space-y-6"
    >
      <div className="flex items-center justify-between border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-zinc-900 text-[10px] font-bold text-zinc-400 rounded-full border border-zinc-800 tracking-wider">
            {insight.type === 'DAILY' ? 'DAILY SESSION FEEDBACK' : 'WEEKLY REVIEW'}
          </div>
          <span className="text-xs text-zinc-500 font-mono">{insight.period}</span>
        </div>
        {insight.disciplineScore !== undefined && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-zinc-500">DISCIPLINE SCORE</span>
            <span className={`text-xl font-bold font-mono ${insight.disciplineScore > 75 ? 'text-emerald-500' : 'text-red-500'}`}>
              {insight.disciplineScore}/100
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <Quote className="absolute -top-2 -left-2 w-8 h-8 text-zinc-900 -z-10" />
        <p className="text-zinc-300 leading-relaxed text-sm lg:text-base italic">
          {insight.content}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {insight.topMistakes && insight.topMistakes.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest">
              <AlertCircle className="w-4 h-4" />
              Patterns Detected
            </h4>
            <div className="flex flex-wrap gap-2">
              {insight.topMistakes.map(m => (
                <span key={m} className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded border border-red-500/20 uppercase tracking-wider">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {insight.suggestions && insight.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest">
              <CheckCircle2 className="w-4 h-4" />
              Action Items
            </h4>
            <ul className="space-y-1">
              {insight.suggestions.map(s => (
                <li key={s} className="text-xs text-zinc-400 flex gap-2">
                  <span className="text-emerald-500">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}
