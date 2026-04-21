import { useState, useEffect, useCallback } from 'react';
import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getCategoryMoMDelta,
  getMonthForecast,
  getSavingsRate,
  getAllBudgetsProgress,
  getGoalsProgress,
  getLargestTransactions,
  getAverageDailySpend,
  getRecurringUpcoming,
  findCategoryByName,
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
  isTyping: boolean;
  overview: OverviewData | null;
  insights: Insight[];
  chatHistory: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

interface Period {
  start: number;
  end: number;
  label: string;
}

function extractPeriod(q: string): Period {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  if (/сегодня|сегодняшн/.test(q)) {
    return { start: todayStart, end: now.getTime(), label: 'Сегодня' };
  }
  if (/вчера/.test(q)) {
    return { start: todayStart - MS_PER_DAY, end: todayStart - 1, label: 'Вчера' };
  }
  if (/прошл.*недел/.test(q)) {
    return { start: now.getTime() - 14 * MS_PER_DAY, end: now.getTime() - 7 * MS_PER_DAY, label: 'На прошлой неделе' };
  }
  if (/эта недел|за недел|последн.*недел|за 7/.test(q)) {
    return { start: now.getTime() - 7 * MS_PER_DAY, end: now.getTime(), label: 'За неделю' };
  }
  if (/3 месяц|три месяц|квартал/.test(q)) {
    return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime(), end: now.getTime(), label: 'За 3 месяца' };
  }
  if (/6 месяц|шесть месяц|полгод/.test(q)) {
    return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime(), end: now.getTime(), label: 'За 6 месяцев' };
  }
  if (/прошл.*месяц|в прошлом/.test(q)) {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      end: monthStart - 1,
      label: 'В прошлом месяце',
    };
  }
  return { start: monthStart, end: now.getTime(), label: 'В этом месяце' };
}

const HELP_TEXT = `Я могу ответить на вопросы о ваших финансах:

📊 Расходы
• «сколько потратил сегодня / за неделю / в прошлом месяце»
• «расходы на [категорию]» — например «расходы на еду»
• «самые крупные траты»
• «средние расходы в день»

💰 Доходы и баланс
• «мои доходы»
• «какой баланс»
• «норма сбережений»

🎯 Цели и бюджеты
• «мои цели» / «когда накоплю»
• «статус бюджетов»

📅 Платежи и прогноз
• «ближайшие платежи»
• «прогноз до конца месяца»
• «сравни с прошлым месяцем»`;

async function answerQuery(text: string): Promise<string> {
  const q = text.toLowerCase();
  const period = extractPeriod(q);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  // Help
  if (/помощ|что.*умеешь|что.*спросить|help|справк|команд|возможност/.test(q)) {
    return HELP_TEXT;
  }

  // Recurring payments
  if (/ближайш.*платеж|регулярн|подписк|платеж/.test(q)) {
    const upcoming = await getRecurringUpcoming(30);
    if (upcoming.length === 0) return 'Ближайших регулярных платежей нет.';
    const list = upcoming.slice(0, 5).map(r => {
      const when = r.daysUntil <= 0 ? 'сегодня' : r.daysUntil === 1 ? 'завтра' : `через ${r.daysUntil} дн.`;
      return `• ${r.label} — ${fmt(r.amount)} ₽ (${when})`;
    }).join('\n');
    return `Ближайшие платежи:\n${list}`;
  }

  // Largest transactions
  if (/самы.*крупн|больш.*трат|дорог.*покупк|крупн.*трат|крупные/.test(q)) {
    const top = await getLargestTransactions(5, period.start, period.end);
    if (top.length === 0) return `${period.label} крупных расходов нет.`;
    const list = top.map(t => {
      const label = t.comment ? `${t.categoryName} (${t.comment})` : t.categoryName;
      return `• ${label} — ${fmt(t.amount)} ₽`;
    }).join('\n');
    return `Крупнейшие расходы ${period.label.toLowerCase()}:\n${list}`;
  }

  // Average daily
  if (/средн.*день|в среднем|дневн.*расход|средний.*расход|средн.*трат/.test(q)) {
    const avg = await getAverageDailySpend(period.start, period.end);
    return `Средние расходы в день ${period.label.toLowerCase()}: ${fmt(avg)} ₽/день.`;
  }

  // Goal ETA
  if (/когда.*накопл|когда.*достигн|сколько.*времени.*цел/.test(q)) {
    const goals = await getGoalsProgress();
    const active = goals.filter(g => g.isActive && g.percent < 100);
    if (active.length === 0) return 'Активных незавершённых целей нет.';
    const sr = await getSavingsRate(monthStart, now.getTime());
    if (sr.saved <= 0) return 'Не могу рассчитать — в этом месяце пока нет положительных накоплений.';
    const lines = active.slice(0, 3).map(g => {
      const months = Math.ceil(g.remaining / sr.saved);
      return `• «${g.name}»: осталось ${fmt(g.remaining)} ₽ → ~${months} мес.`;
    });
    return `При темпе ${fmt(sr.saved)} ₽/мес:\n${lines.join('\n')}`;
  }

  // Goals list
  if (/цел|накопл|откладыва/.test(q)) {
    const goals = await getGoalsProgress();
    const active = goals.filter(g => g.isActive);
    if (active.length === 0) return 'Активных целей нет.';
    const lines = active.map(g =>
      `• «${g.name}»: ${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} ₽ (${Math.round(g.percent)}%)`
    );
    return `Ваши цели:\n${lines.join('\n')}`;
  }

  // Budgets
  if (/бюджет/.test(q)) {
    const budgets = await getAllBudgetsProgress(monthStart, now.getTime());
    if (budgets.length === 0) return 'Бюджеты не настроены.';
    const lines: string[] = [];
    budgets.filter(b => b.isOverBudget).forEach(b =>
      lines.push(`• ❌ ${b.categoryName}: ${fmt(b.spent)} / ${fmt(b.limit)} ₽ (превышен)`)
    );
    budgets.filter(b => !b.isOverBudget && b.percent >= 80).forEach(b =>
      lines.push(`• ⚠️ ${b.categoryName}: ${fmt(b.spent)} / ${fmt(b.limit)} ₽ (${Math.round(b.percent)}%)`)
    );
    budgets.filter(b => !b.isOverBudget && b.percent < 80).forEach(b =>
      lines.push(`• ✅ ${b.categoryName}: ${fmt(b.spent)} / ${fmt(b.limit)} ₽ (${Math.round(b.percent)}%)`)
    );
    return `Бюджеты этого месяца:\n${lines.join('\n')}`;
  }

  // Forecast
  if (/прогноз|конец месяц|сколько потрачу/.test(q)) {
    const f = await getMonthForecast();
    return `Прогноз до конца месяца: ~${fmt(f.forecastTotal)} ₽\nУже потрачено: ${fmt(f.spent)} ₽\nОсталось дней: ${f.daysLeft}\nТемп: ${fmt(f.dailyRate)} ₽/день`;
  }

  // MoM comparison
  if (/сравн|расход.*прошл|прошл.*расход/.test(q)) {
    const thisM = await getBalanceByPeriod(monthStart, now.getTime());
    const lastM = await getBalanceByPeriod(lastMonthStart, monthStart - 1);
    const diff = thisM.expenses - lastM.expenses;
    const pct = lastM.expenses > 0 ? Math.round(diff / lastM.expenses * 100) : 0;
    const sign = diff >= 0 ? '+' : '';
    return `Расходы: ${fmt(lastM.expenses)} ₽ → ${fmt(thisM.expenses)} ₽\nИзменение: ${sign}${fmt(diff)} ₽ (${sign}${pct}%)`;
  }

  // Savings rate
  if (/экономи|норм.*сбережен|сбережен|сберег/.test(q)) {
    const sr = await getSavingsRate(period.start, period.end);
    if (sr.income === 0) return 'Нет данных по доходам за этот период.';
    return `Норма сбережений ${period.label.toLowerCase()}: ${Math.round(sr.savingsRate)}%\nДоходы: ${fmt(sr.income)} ₽\nРасходы: ${fmt(sr.expenses)} ₽\nСохранено: ${fmt(sr.saved)} ₽`;
  }

  // Balance
  if (/баланс|остат/.test(q)) {
    const { balance, income, expenses } = await getBalanceByPeriod(period.start, period.end);
    return `Баланс ${period.label.toLowerCase()}: ${fmt(balance)} ₽\nДоходы: ${fmt(income)} ₽\nРасходы: ${fmt(expenses)} ₽`;
  }

  // Income
  if (/доход|зарплат|получил/.test(q)) {
    const { income } = await getBalanceByPeriod(period.start, period.end);
    return `Доходы ${period.label.toLowerCase()}: ${fmt(income)} ₽`;
  }

  // Category-specific (by name match)
  const catMatch = await findCategoryByName(q);
  if (catMatch) {
    const expenses = await getExpensesByCategory(period.start, period.end);
    const cat = expenses.find(e => e.categoryId === catMatch.id);
    if (!cat) return `${period.label} расходов на «${catMatch.name}» нет.`;
    return `${period.label} «${catMatch.name}»: ${fmt(cat.amount)} ₽`;
  }

  // General expenses
  if (/расход|потрат|трат/.test(q)) {
    const byCat = await getExpensesByCategory(period.start, period.end);
    if (byCat.length === 0) return `${period.label} расходов нет.`;
    const total = byCat.reduce((s, c) => s + c.amount, 0);
    const top = byCat.slice(0, 3).map(c => `${c.categoryName}: ${fmt(c.amount)} ₽`).join(', ');
    return `Расходы ${period.label.toLowerCase()}: ${fmt(total)} ₽\nТоп: ${top}`;
  }

  return 'Не понял вопрос. Напишите «помощь» чтобы увидеть список всего, что я умею.';
}

async function buildInsights(): Promise<Insight[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  const [deltas, forecast, budgets, sr, lastSr, upcoming, goals] = await Promise.all([
    getCategoryMoMDelta(),
    getMonthForecast(),
    getAllBudgetsProgress(monthStart, now.getTime()),
    getSavingsRate(monthStart, now.getTime()),
    getSavingsRate(lastMonthStart, monthStart - 1),
    getRecurringUpcoming(3),
    getGoalsProgress(),
  ]);

  const result: Insight[] = [];

  // Budget alerts
  budgets.filter(b => b.isOverBudget).forEach(b => {
    result.push({
      id: `budget-over-${b.categoryId}`,
      type: 'alert',
      title: `Бюджет «${b.categoryName}» превышен`,
      description: `Потрачено ${fmt(b.spent)} ₽ при лимите ${fmt(b.limit)} ₽ (${Math.round(b.percent)}%).`,
    });
  });

  budgets.filter(b => !b.isOverBudget && b.percent >= 80).forEach(b => {
    result.push({
      id: `budget-near-${b.categoryId}`,
      type: 'warning',
      title: `Бюджет «${b.categoryName}» почти исчерпан`,
      description: `Использовано ${Math.round(b.percent)}% — осталось ${fmt(b.limit - b.spent)} ₽.`,
    });
  });

  // Upcoming recurring payments today/tomorrow
  upcoming.filter(r => r.daysUntil <= 1).forEach(r => {
    result.push({
      id: `recurring-${r.nextDate}`,
      type: 'alert',
      title: `Платёж ${r.daysUntil <= 0 ? 'сегодня' : 'завтра'}`,
      description: `${r.label} — ${fmt(r.amount)} ₽`,
    });
  });

  // Goal near deadline
  goals.filter(g => g.isActive && g.deadline && g.percent < 100).forEach(g => {
    const daysLeft = Math.ceil((g.deadline! - now.getTime()) / MS_PER_DAY);
    if (daysLeft > 0 && daysLeft <= 30) {
      result.push({
        id: `goal-deadline-${g.id}`,
        type: 'warning',
        title: `Цель «${g.name}» — осталось ${daysLeft} дн.`,
        description: `Накоплено ${Math.round(g.percent)}% (${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} ₽).`,
      });
    }
  });

  // Top growing category
  const growing = deltas.find(d => d.deltaPercent > 20 && d.thisMonth > 500);
  if (growing) {
    result.push({
      id: 'cat-growth',
      type: 'warning',
      title: `Рост расходов: ${growing.categoryName}`,
      description: `+${Math.round(growing.deltaPercent)}% к прошлому месяцу (+${fmt(growing.delta)} ₽).`,
    });
  }

  // Month forecast
  if (forecast.daysPassed >= 5 && forecast.forecastTotal > forecast.spent * 1.3) {
    result.push({
      id: 'forecast',
      type: 'tip',
      title: 'Прогноз расходов на месяц',
      description: `При текущем темпе вы потратите ~${fmt(forecast.forecastTotal)} ₽ до конца месяца (сейчас ${fmt(forecast.spent)} ₽).`,
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
        description: `Сохраняете ${Math.round(sr.savingsRate)}% дохода — на ${Math.round(diff)} п.п. больше, чем в прошлом месяце.`,
      });
    } else if (diff < -5) {
      result.push({
        id: 'savings-down',
        type: 'warning',
        title: 'Норма сбережений снизилась',
        description: `Сохраняете ${Math.round(sr.savingsRate)}% — на ${Math.round(Math.abs(diff))} п.п. меньше, чем в прошлом месяце.`,
      });
    }
  }

  // Top spending category
  const topCat = deltas.sort((a, b) => b.thisMonth - a.thisMonth)[0];
  if (topCat && topCat.thisMonth > 1000) {
    result.push({
      id: 'top-cat',
      type: 'tip',
      title: `Главная статья: ${topCat.categoryName}`,
      description: `${fmt(topCat.thisMonth)} ₽ в этом месяце${topCat.lastMonth > 0 ? ` (было ${fmt(topCat.lastMonth)} ₽)` : ''}.`,
    });
  }

  return result.slice(0, 8);
}

export function useAIInsights(): AIInsightsData {
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

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
      const reply = await answerQuery(text);
      setChatHistory(prev => [...prev, { role: 'assistant', message: reply }]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  return { loading, isTyping, overview, insights, chatHistory, sendMessage };
}
