import { useState, useEffect, useCallback } from 'react';
import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getCategoryMoMDelta,
  getMonthForecast,
  getSavingsRate,
  getAllBudgetsProgress,
  getGoalsProgress,
} from '../../db/analytics';

export interface Insight {
  id: string;
  type: 'warning' | 'alert' | 'tip' | 'positive';
  title: string;
  description: string;
}

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
  overview: OverviewData | null;
  insights: Insight[];
  chatHistory: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
}

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

async function answerQuery(text: string): Promise<string> {
  const q = text.toLowerCase();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const lastMonthEnd = monthStart - 1;

  if (/расход|потрат|трат/.test(q)) {
    const byCat = await getExpensesByCategory(monthStart, now.getTime());
    if (/категор/.test(q)) {
      if (byCat.length === 0) return 'В этом месяце расходов по категориям пока нет.';
      const top = byCat.slice(0, 3).map(c => `${c.categoryName}: ${fmt(c.amount)} ₽`).join(', ');
      return `Топ расходов этого месяца: ${top}.`;
    }
    const total = byCat.reduce((s, c) => s + c.amount, 0);
    return `В этом месяце вы потратили ${fmt(total)} ₽ по ${byCat.length} категориям.`;
  }

  if (/доход/.test(q)) {
    const { income } = await getBalanceByPeriod(monthStart, now.getTime());
    return `Ваши доходы за этот месяц составили ${fmt(income)} ₽.`;
  }

  if (/баланс|остат/.test(q)) {
    const { balance, income, expenses } = await getBalanceByPeriod(monthStart, now.getTime());
    return `Баланс за текущий месяц: ${fmt(balance)} ₽ (доходы ${fmt(income)} ₽, расходы ${fmt(expenses)} ₽).`;
  }

  if (/бюджет/.test(q)) {
    const budgets = await getAllBudgetsProgress(monthStart, now.getTime());
    const over = budgets.filter(b => b.isOverBudget);
    if (over.length > 0) {
      return `Превышены бюджеты: ${over.map(b => b.categoryName).join(', ')}.`;
    }
    if (budgets.length === 0) return 'Бюджеты не настроены.';
    return `Все ${budgets.length} бюджетов в норме.`;
  }

  if (/цел|накопл|откладыва/.test(q)) {
    const goals = await getGoalsProgress();
    const active = goals.filter(g => g.isActive);
    if (active.length === 0) return 'Активных целей нет.';
    const g = active[0];
    return `Цель «${g.name}»: накоплено ${fmt(g.currentAmount)} ₽ из ${fmt(g.targetAmount)} ₽ (${Math.round(g.percent)}%).${g.monthlyNeeded ? ` Нужно откладывать ${fmt(g.monthlyNeeded)} ₽/мес.` : ''}`;
  }

  if (/прогноз|сколько потрачу|конец месяц/.test(q)) {
    const f = await getMonthForecast();
    return `Прогноз расходов до конца месяца: ${fmt(f.forecastTotal)} ₽ (уже потрачено ${fmt(f.spent)} ₽, дневной темп ${fmt(f.dailyRate)} ₽/день).`;
  }

  if (/сравн|прошл месяц|месяц назад/.test(q)) {
    const thisMonth = await getBalanceByPeriod(monthStart, now.getTime());
    const lastMonth = await getBalanceByPeriod(lastMonthStart, lastMonthEnd);
    const diff = thisMonth.expenses - lastMonth.expenses;
    const sign = diff >= 0 ? '+' : '';
    return `В этом месяце расходы ${sign}${fmt(diff)} ₽ относительно прошлого (${fmt(lastMonth.expenses)} ₽ → ${fmt(thisMonth.expenses)} ₽).`;
  }

  if (/экономи|норм|хорош/.test(q)) {
    const sr = await getSavingsRate(monthStart, now.getTime());
    if (sr.income === 0) return 'Нет данных по доходам.';
    return `Норма сбережений в этом месяце: ${Math.round(sr.savingsRate)}% (сохранено ${fmt(sr.saved)} ₽).`;
  }

  return 'Попробуйте спросить: «сколько потратил», «какой баланс», «прогноз расходов» или «сравни с прошлым месяцем».';
}

async function buildInsights(): Promise<Insight[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const lastMonthEnd = monthStart - 1;

  const [deltas, forecast, budgets, sr, lastSr] = await Promise.all([
    getCategoryMoMDelta(),
    getMonthForecast(),
    getAllBudgetsProgress(monthStart, now.getTime()),
    getSavingsRate(monthStart, now.getTime()),
    getSavingsRate(lastMonthStart, lastMonthEnd),
  ]);

  const result: Insight[] = [];

  // Budget alerts
  const overBudget = budgets.filter(b => b.isOverBudget);
  for (const b of overBudget) {
    result.push({
      id: `budget-over-${b.categoryId}`,
      type: 'alert',
      title: `Бюджет «${b.categoryName}» превышен`,
      description: `Потрачено ${fmt(b.spent)} ₽ при лимите ${fmt(b.limit)} ₽ (${Math.round(b.percent)}%).`,
    });
  }

  const nearBudget = budgets.filter(b => !b.isOverBudget && b.percent >= 80);
  for (const b of nearBudget) {
    result.push({
      id: `budget-near-${b.categoryId}`,
      type: 'warning',
      title: `Бюджет «${b.categoryName}» почти исчерпан`,
      description: `Использовано ${Math.round(b.percent)}% — осталось ${fmt(b.limit - b.spent)} ₽.`,
    });
  }

  // Top growing category
  const growing = deltas.find(d => d.deltaPercent > 20 && d.thisMonth > 500);
  if (growing) {
    result.push({
      id: 'cat-growth',
      type: 'warning',
      title: `Рост расходов: ${growing.categoryName}`,
      description: `+${Math.round(growing.deltaPercent)}% по сравнению с прошлым месяцем (+${fmt(growing.delta)} ₽).`,
    });
  }

  // Month forecast
  if (forecast.daysPassed >= 5 && forecast.forecastTotal > forecast.spent * 1.5) {
    result.push({
      id: 'forecast',
      type: 'tip',
      title: 'Прогноз расходов на месяц',
      description: `При текущем темпе вы потратите ~${fmt(forecast.forecastTotal)} ₽ до конца месяца.`,
    });
  }

  // Savings rate change
  if (sr.income > 0 && lastSr.income > 0) {
    const diff = sr.savingsRate - lastSr.savingsRate;
    if (diff > 5) {
      result.push({
        id: 'savings-up',
        type: 'positive',
        title: 'Норма сбережений выросла',
        description: `В этом месяце вы сохраняете ${Math.round(sr.savingsRate)}% дохода — на ${Math.round(diff)} п.п. больше, чем в прошлом.`,
      });
    } else if (diff < -5) {
      result.push({
        id: 'savings-down',
        type: 'warning',
        title: 'Норма сбережений снизилась',
        description: `Сохраняете ${Math.round(sr.savingsRate)}% дохода — на ${Math.round(Math.abs(diff))} п.п. меньше, чем в прошлом месяце.`,
      });
    }
  }

  // Top-spending category tip
  const [top] = deltas;
  if (top && top.thisMonth > 1000) {
    result.push({
      id: 'top-cat',
      type: 'tip',
      title: `Главная статья расходов: ${top.categoryName}`,
      description: `${fmt(top.thisMonth)} ₽ в этом месяце.`,
    });
  }

  return result.slice(0, 5);
}

export function useAIInsights(): AIInsightsData {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
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
    const userMsg: ChatMessage = { role: 'user', message: text };
    setChatHistory(prev => [...prev, userMsg]);
    const reply = await answerQuery(text);
    setChatHistory(prev => [...prev, { role: 'assistant', message: reply }]);
  }, []);

  return { loading, overview, insights, chatHistory, sendMessage };
}
