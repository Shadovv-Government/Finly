// Builds insight cards from analytics data

import {
  getCategoryMoMDelta,
  getMonthForecast,
  getAllBudgetsProgress,
  getSavingsRate,
  getGoalsProgress,
  getRecurringUpcoming,
} from '../../db/analytics';
import { fmt, MS_PER_DAY } from './nlpParser';

export interface Insight {
  id: string;
  type: 'warning' | 'alert' | 'tip' | 'positive';
  title: string;
  description: string;
}

export async function buildInsights(): Promise<Insight[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

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

  budgets.filter(b => b.isOverBudget).forEach(b => {
    result.push({ id: `budget-over-${b.categoryId}`, type: 'alert', title: `Бюджет «${b.categoryName}» превышен`, description: `Потрачено ${fmt(b.spent)} ₽ при лимите ${fmt(b.limit)} ₽ (${Math.round(b.percent)}%).` });
  });
  budgets.filter(b => !b.isOverBudget && b.percent >= 80).forEach(b => {
    result.push({ id: `budget-near-${b.categoryId}`, type: 'warning', title: `Бюджет «${b.categoryName}» почти исчерпан`, description: `Использовано ${Math.round(b.percent)}% — осталось ${fmt(b.limit - b.spent)} ₽.` });
  });

  upcoming.filter(r => r.daysUntil <= 1).forEach(r => {
    result.push({ id: `recurring-${r.nextDate}`, type: 'alert', title: `Платёж ${r.daysUntil <= 0 ? 'сегодня' : 'завтра'}`, description: `${r.label} — ${fmt(r.amount)} ₽` });
  });

  goals.filter(g => g.isActive && g.percent >= 100).forEach(g => {
    result.push({ id: `goal-done-${g.id}`, type: 'positive', title: `Цель «${g.name}» достигнута!`, description: `Накоплено ${fmt(g.currentAmount)} ₽ — поздравляем!` });
  });

  goals.filter(g => g.isActive && g.deadline && g.percent < 100).forEach(g => {
    const daysLeft = Math.ceil((g.deadline! - now.getTime()) / MS_PER_DAY);
    if (daysLeft > 0 && daysLeft <= 30) {
      result.push({ id: `goal-deadline-${g.id}`, type: 'warning', title: `Цель «${g.name}» — осталось ${daysLeft} дн.`, description: `Накоплено ${Math.round(g.percent)}% (${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} ₽).` });
    }
  });

  const totalExpenses = deltas.reduce((s, d) => s + d.thisMonth, 0);
  const bigCat = deltas.find(d => totalExpenses > 0 && d.thisMonth / totalExpenses > 0.5);
  if (bigCat) {
    result.push({ id: 'big-cat', type: 'warning', title: `«${bigCat.categoryName}» — ${Math.round(bigCat.thisMonth / totalExpenses * 100)}% расходов`, description: 'Одна категория занимает больше половины всех трат этого месяца.' });
  }

  const growing = deltas.find(d => d.deltaPercent > 20 && d.thisMonth > 500);
  if (growing) {
    result.push({ id: 'cat-growth', type: 'warning', title: `Рост расходов: ${growing.categoryName}`, description: `+${Math.round(growing.deltaPercent)}% к прошлому месяцу (+${fmt(growing.delta)} ₽).` });
  }

  if (forecast.daysPassed >= 5 && forecast.forecastTotal > forecast.spent * 1.3) {
    result.push({ id: 'forecast', type: 'tip', title: 'Прогноз расходов на месяц', description: `При текущем темпе вы потратите ~${fmt(forecast.forecastTotal)} ₽ до конца месяца (сейчас ${fmt(forecast.spent)} ₽).` });
  }

  if (lastSr.expenses > 0 && sr.expenses < lastSr.expenses * 0.9) {
    const saved = lastSr.expenses - sr.expenses;
    result.push({ id: 'less-spending', type: 'positive', title: 'Тратите меньше, чем в прошлом месяце', description: `Расходы снизились на ${fmt(saved)} ₽ (${Math.round((1 - sr.expenses / lastSr.expenses) * 100)}%).` });
  }

  if (sr.income > 0 && lastSr.income > 0) {
    const diff = sr.savingsRate - lastSr.savingsRate;
    if (diff > 5) {
      result.push({ id: 'savings-up', type: 'positive', title: 'Норма сбережений выросла', description: `Сохраняете ${Math.round(sr.savingsRate)}% дохода — на ${Math.round(diff)} п.п. больше, чем в прошлом месяце.` });
    } else if (diff < -5) {
      result.push({ id: 'savings-down', type: 'warning', title: 'Норма сбережений снизилась', description: `Сохраняете ${Math.round(sr.savingsRate)}% — на ${Math.round(Math.abs(diff))} п.п. меньше, чем в прошлом месяце.` });
    }
  }

  if (now.getDate() >= 3) {
    const todayCount = await import('../../db/db').then(({ db }) =>
      db.transactions.where('date').between(todayStart, now.getTime()).count()
    );
    if (todayCount === 0) {
      result.push({ id: 'no-spend-today', type: 'positive', title: 'Без трат сегодня', description: 'Вы ещё ничего не потратили сегодня — отличный результат!' });
    }
  }

  const topCat = [...deltas].sort((a, b) => b.thisMonth - a.thisMonth)[0];
  if (topCat && topCat.thisMonth > 1000) {
    result.push({ id: 'top-cat', type: 'tip', title: `Главная статья: ${topCat.categoryName}`, description: `${fmt(topCat.thisMonth)} ₽ в этом месяце${topCat.lastMonth > 0 ? ` (было ${fmt(topCat.lastMonth)} ₽)` : ''}.` });
  }

  return result.slice(0, 8);
}
