import { useState, useEffect, useCallback, useRef } from 'react';
import { getBalanceByPeriod, getExpensesByCategory, getSavingsRate } from '../../db/analytics';
import { MS_PER_DAY } from './nlpParser';
import { type Insight, buildInsights } from './insightsEngine';
import { type ChatCtx, answerQuery } from './chatContext';

export type { Insight };

export interface OverviewData {
  weekExpenses: number;
  weekIncome: number;
  weekBalance: number;
  savingsRate: number;
  topCategories: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
}

export interface AIInsightsData {
  loading: boolean;
  isTyping: boolean;
  overview: OverviewData | null;
  insights: Insight[];
  chatHistory: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
}

export function useAIInsights(): AIInsightsData {
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const ctxRef = useRef<ChatCtx>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const weekAgo = now.getTime() - 7 * MS_PER_DAY;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const [weekBalance, byCat, sr, insightList] = await Promise.all([
          getBalanceByPeriod(weekAgo, now.getTime()),
          getExpensesByCategory(monthStart, now.getTime()),
          getSavingsRate(monthStart, now.getTime()),
          buildInsights(),
        ]);

        if (cancelled) return;
        setOverview({
          weekExpenses: weekBalance.expenses,
          weekIncome: weekBalance.income,
          weekBalance: weekBalance.balance,
          savingsRate: Math.round(sr.savingsRate),
          topCategories: byCat.length,
        });
        setInsights(insightList);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    setChatHistory(prev => [...prev, { role: 'user', message: text }]);
    setIsTyping(true);
    try {
      const { answer, newCtx } = await answerQuery(text, ctxRef.current);
      ctxRef.current = newCtx;
      setChatHistory(prev => [...prev, { role: 'assistant', message: answer }]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  return { loading, isTyping, overview, insights, chatHistory, sendMessage };
}
