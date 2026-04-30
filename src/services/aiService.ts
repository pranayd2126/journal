import { GoogleGenAI, Type } from "@google/genai";
import { Trade, DailyChecklist } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    const prompt = `
      Analyze these trades and daily habits for a professional trader.
      Trades: ${JSON.stringify(tradesContext)}
      Daily Habits: ${JSON.stringify(checklistContext)}

      Provide a deep behavioral analysis. Identify if the trader was emotional, impulsive, or disciplined.
      Detect recurring mistakes like FOMO, revenge trading, or over-risking.
      Give specific, strict coaching advice as if you are a master trading coach.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING, description: "Detailed analysis text" },
              topMistakes: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of detected mistakes"
              },
              suggestions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Coaching suggestions"
              },
              disciplineScore: { type: Type.NUMBER, description: "0-100 score" }
            },
            required: ["content", "topMistakes", "suggestions", "disciplineScore"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      return null;
    }
  },

  async analyzeWeeklyPerformance(trades: Trade[]) {
    // Similar to daily but aggregates more data
    const prompt = `
      Perform a WEEKLY review for the following trades: ${JSON.stringify(trades.slice(0, 50))}
      Identify the top 3 weaknesses this week.
      Acknowledge what went right.
      Set 3 strict goals for next week.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              topMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["content", "topMistakes", "suggestions"]
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("AI Weekly Analysis Error:", error);
      return null;
    }
  }
};
