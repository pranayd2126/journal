import { Trade, DailyChecklist } from "../types";

export const aiService = {
  async analyzeDailyTrades(trades: Trade[], checklist: DailyChecklist | null) {
    if (trades.length === 0) return null;

    const tradesContext = trades.map(t => ({
      symbol: t.symbol,
      pnl: t.pnl,
      setup: t.setupType,
      mistakes: t.mistakes,
      psychology: t.psychology,
      execution: t.executionQuality,
      context: t.marketContext,
      reason: t.tradeReason
    }));

    const checklistContext = checklist ? {
      disciplineScore: checklist.disciplineScore,
      habits: {
        followedRisk: checklist.followedRisk,
        noFOMO: checklist.noFOMO,
        plannedTrade: checklist.plannedTrade
      }
    } : 'No checklist provided';

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tradesContext, 
          checklistContext,
          isWeekly: false 
        })
      });

      if (!response.ok) throw new Error('AI Analysis failed');
      return await response.json();
    } catch (error) {
      console.error("AI Analysis Error:", error);
      return null;
    }
  },

  async analyzeWeeklyPerformance(trades: Trade[]) {
    const tradesContext = trades.slice(0, 50).map(t => ({
      symbol: t.symbol,
      pnl: t.pnl,
      setup: t.setupType,
      mistakes: t.mistakes
    }));

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tradesContext, 
          isWeekly: true 
        })
      });

      if (!response.ok) throw new Error('AI Weekly Analysis failed');
      return await response.json();
    } catch (error) {
      console.error("AI Weekly Analysis Error:", error);
      return null;
    }
  }
};
