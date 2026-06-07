// src/db/premium.ts
// Премиум аналитические запросы к IndexedDB
// Зависит от: analytics.ts, lib/healthScore.ts, lib/forecasting.ts

import { db } from './db';
import { MS_PER_DAY, MS_PER_MONTH } from '../app/constants';
import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getCategoryMoMDelta,
  getAnomalousTransactions,
  getRecurringUpcoming,
  getMonthForecast,
  getBalanceWithSavings,
} from './analytics';
import { calculateHealthScore, type HealthScoreInput } from '../lib/healthScore';

// ==================== Health Score Data ====================

export async function getHealthScoreData(): Promise<HealthScoreInput> {
  const now = Date.now();
  const sixMonthsAgo = now - 6 * MS_PER_MONTH;

  const transactions = await db.transactions.where('date').above(sixMonthsAgo).toArray();
  const incomeTx = transactions.filter(t => t.type === 'income');
  const expenseTx = transactions.filter(t => t.type === 'expense');

  // Group incomes by month for CV calculation
  const monthlyIncomeMap = new Map<string, number>();
  for (const t of incomeTx) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyIncomeMap.set(key, (monthlyIncomeMap.get(key) || 0) + t.amount * t.rate);
  }
  const monthlyIncomes = Array.from(monthlyIncomeMap.values());

  // Totals for 6 months
  const totalIncome = incomeTx.reduce((s, t) => s + t.amount * t.rate, 0);
  const totalExpenses = expenseTx.reduce((s, t) => s + t.amount * t.rate, 0);

  // Essential expenses
  const categories = await db.categories.toArray();
  const essentialCatIds = new Set(
    categories.filter(c => c.isEssential).map(c => c.id)
  );
  const essentialExpenses = expenseTx
    .filter(t => t.categoryId && essentialCatIds.has(t.categoryId))
    .reduce((s, t) => s + t.amount * t.rate, 0);

  // Free balance
  const balanceData = await getBalanceWithSavings();
  const freeBalance = balanceData.freeBalance;

  // Average monthly expenses
  const months = Math.max(1, Math.ceil((now - sixMonthsAgo) / MS_PER_MONTH));
  const avgMonthlyExpenses = totalExpenses / months;

  // Category expenses for HHI
  const catExpenseMap = new Map<string, number>();
  for (const t of expenseTx) {
    const cid = t.categoryId || 'other';
    catExpenseMap.set(cid, (catExpenseMap.get(cid) || 0) + t.amount * t.rate);
  }
  const categoryExpenses = Array.from(catExpenseMap.entries()).map(([categoryId, amount]) => ({
    categoryId,
    amount,
  }));

  // Debt expenses (categories with debt keywords in name)
  const DEBT_KEYWORDS = ['долг', 'кредит', 'ипотека', 'заём', 'заем', 'рассрочк'];
  const debtCatIds = new Set(
    categories.filter(c => DEBT_KEYWORDS.some(kw => c.name.toLowerCase().includes(kw))).map(c => c.id)
  );
  const debtExpenses = expenseTx
    .filter(t => t.categoryId && debtCatIds.has(t.categoryId))
    .reduce((s, t) => s + t.amount * t.rate, 0);

  return {
    totalIncome,
    totalExpenses,
    essentialExpenses,
    monthlyIncomes: monthlyIncomes.length >= 6
      ? monthlyIncomes
      : [...monthlyIncomes, ...Array(6 - monthlyIncomes.length).fill(0)],
    freeBalance,
    avgMonthlyExpenses,
    categoryExpenses,
    debtExpenses,
  };
}

// ==================== Forecast Data ====================

export async function getForecastData(days: number): Promise<{ date: number; amount: number }[]> {
  const now = Date.now();
  const start = now - days * MS_PER_DAY;
  const transactions = await db.transactions
    .where('date').between(start, now)
    .filter(t => t.type === 'expense')
    .toArray();

  const byDay = new Map<number, number>();
  for (const t of transactions) {
    const day = new Date(t.date).setHours(0, 0, 0, 0);
    byDay.set(day, (byDay.get(day) || 0) + t.amount * t.rate);
  }

  return Array.from(byDay.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date - b.date);
}

// ==================== YoY Comparison ====================

export interface YoYResult {
  thisMonth: number;
  lastYearMonth: number;
  delta: number;
  deltaPercent: number;
  byCategory: {
    categoryName: string;
    thisMonth: number;
    lastYearMonth: number;
    delta: number;
    deltaPercent: number;
  }[];
}

export async function getYoYComparison(): Promise<YoYResult> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthEnd = now.getTime();
  const lastYearMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1).getTime();
  const lastYearMonthEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const [thisData, lastYearData] = await Promise.all([
    getExpensesByCategory(thisMonthStart, thisMonthEnd),
    getExpensesByCategory(lastYearMonthStart, lastYearMonthEnd),
  ]);

  const thisTotal = thisData.reduce((s, c) => s + c.amount, 0);
  const lastTotal = lastYearData.reduce((s, c) => s + c.amount, 0);
  const delta = thisTotal - lastTotal;
  const deltaPercent = lastTotal > 0 ? (delta / lastTotal) * 100 : (thisTotal > 0 ? 100 : 0);

  const lastYearMap = new Map(lastYearData.map(c => [c.categoryName, c.amount]));
  const byCategory = thisData.map(c => {
    const lastAmt = lastYearMap.get(c.categoryName) || 0;
    const catDelta = c.amount - lastAmt;
    return {
      categoryName: c.categoryName,
      thisMonth: c.amount,
      lastYearMonth: lastAmt,
      delta: catDelta,
      deltaPercent: lastAmt > 0 ? (catDelta / lastAmt) * 100 : 100,
    };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { thisMonth: thisTotal, lastYearMonth: lastTotal, delta, deltaPercent, byCategory };
}

// ==================== Calendar Year Data ====================

export interface CalendarDay {
  date: number;
  amount: number;
}

export async function getCalendarYearData(year: number): Promise<CalendarDay[]> {
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();

  const transactions = await db.transactions
    .where('date').between(yearStart, yearEnd)
    .filter(t => t.type === 'expense')
    .toArray();

  const byDay = new Map<number, number>();
  for (const t of transactions) {
    const day = new Date(t.date).setHours(0, 0, 0, 0);
    byDay.set(day, (byDay.get(day) || 0) + t.amount * t.rate);
  }

  return Array.from(byDay.entries()).map(([date, amount]) => ({ date, amount }));
}

// ==================== Cash Flow Forecast ====================

export interface CashFlowPoint {
  date: number;
  projectedBalance: number;
  expectedIncome: number;
  expectedExpenses: number;
}

export async function getCashFlowForecast(months: number): Promise<CashFlowPoint[]> {
  const now = Date.now();
  const sixMonthsAgo = now - 6 * MS_PER_MONTH;

  const transactions = await db.transactions.where('date').above(sixMonthsAgo).toArray();
  const monthsWithData = Math.max(1, Math.ceil((now - sixMonthsAgo) / MS_PER_MONTH));
  const avgIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount * t.rate, 0) / monthsWithData;
  const avgExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount * t.rate, 0) / monthsWithData;

  const balanceData = await getBalanceWithSavings();
  let runningBalance = balanceData.totalBalance;

  const result: CashFlowPoint[] = [];
  for (let m = 1; m <= months; m++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + m);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();

    runningBalance += avgIncome - avgExpenses;

    result.push({
      date: monthStart,
      projectedBalance: Math.round(runningBalance * 100) / 100,
      expectedIncome: Math.round(avgIncome * 100) / 100,
      expectedExpenses: Math.round(avgExpenses * 100) / 100,
    });
  }

  return result;
}

// ==================== Growing Categories (Problem Detector helper) ====================

export interface GrowingCategory {
  categoryName: string;
  currentMonth: number;
  prevMonth: number;
  growthPercent: number;
  icon: string;
  color: string;
}

export async function getGrowingCategories(): Promise<GrowingCategory[]> {
  const momDeltas = await getCategoryMoMDelta();
  return momDeltas
    .filter(d => d.deltaPercent > 10 && d.thisMonth > 0)
    .map(d => ({
      categoryName: d.categoryName,
      currentMonth: d.thisMonth,
      prevMonth: d.lastMonth,
      growthPercent: d.deltaPercent,
      icon: d.icon,
      color: d.color,
    }))
    .sort((a, b) => b.growthPercent - a.growthPercent);
}

// ==================== Problem Detector ====================

export interface DetectedIssue {
  type: 'growing_category' | 'no_budget_overspend' | 'subscription_like' | 'low_savings';
  severity: 'warning' | 'danger';
  title: string;
  description: string;
  data?: Record<string, unknown>;
}

export async function getProblemDetectorIssues(): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  // Growing categories
  const growing = await getGrowingCategories();
  for (const g of growing.slice(0, 3)) {
    issues.push({
      type: 'growing_category',
      severity: g.growthPercent > 50 ? 'danger' : 'warning',
      title: `Растущая категория: ${g.categoryName}`,
      description: `Расходы на "${g.categoryName}" выросли на ${Math.round(g.growthPercent)}% по сравнению с прошлым месяцем (${Math.round(g.prevMonth)} → ${Math.round(g.currentMonth)} ₽)`,
      data: { categoryName: g.categoryName, growthPercent: g.growthPercent },
    });
  }

  // Low savings
  const sixMonthsAgo = Date.now() - 6 * MS_PER_MONTH;
  const summary = await getBalanceByPeriod(sixMonthsAgo, Date.now());
  const savingsRate = summary.income > 0 ? ((summary.income - summary.expenses) / summary.income) * 100 : 0;
  if (savingsRate < 5) {
    issues.push({
      type: 'low_savings',
      severity: 'danger',
      title: 'Критически низкая норма сбережений',
      description: `За последние 6 месяцев вы сохранили всего ${savingsRate.toFixed(1)}% дохода. Рекомендуется откладывать минимум 10-20%.`,
      data: { savingsRate },
    });
  }

  // No budgets
  const budgets = await db.budgets.filter(b => b.startDate > sixMonthsAgo).toArray();
  if (budgets.length === 0) {
    issues.push({
      type: 'no_budget_overspend',
      severity: 'warning',
      title: 'У вас нет активных бюджетов',
      description: 'Бюджеты помогают контролировать расходы по категориям. Создайте бюджет для ключевых категорий.',
    });
  }

  return issues;
}

// ==================== AI Context Builder ====================

export interface AIAnalyticsContext {
  period: { start: number; end: number };
  balance: { income: number; expenses: number; net: number };
  savingsRate: number;
  topExpenseCategories: { name: string; amount: number; percent: number }[];
  momChanges: { name: string; delta: number; deltaPercent: number }[];
  anomalies: { name: string; amount: number; ratio: number }[];
  healthScore: number;
  forecast: { dailyRate: number; projectedMonthEnd: number };
  upcomingRecurring: { label: string; amount: number; daysUntil: number }[];
}

export async function buildAIContext(): Promise<AIAnalyticsContext> {
  const now = Date.now();
  const weekAgo = now - 7 * MS_PER_DAY;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const [balance, expenses, momChanges, anomalies, upcoming, forecast, healthData] = await Promise.all([
    getBalanceByPeriod(weekAgo, now),
    getExpensesByCategory(monthStart, now),
    getCategoryMoMDelta(),
    getAnomalousTransactions(monthStart, now),
    getRecurringUpcoming(14),
    getMonthForecast(),
    getHealthScoreData(),
  ]);

  const totalExpenses = expenses.reduce((s, c) => s + c.amount, 0);
  const topExpenseCategories = expenses
    .slice(0, 5)
    .map(c => ({
      name: c.categoryName,
      amount: c.amount,
      percent: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
    }));

  const savingsRate = balance.income > 0 ? ((balance.income - balance.expenses) / balance.income) * 100 : 0;
  const healthResult = calculateHealthScore(healthData);

  return {
    period: { start: weekAgo, end: now },
    balance: { income: balance.income, expenses: balance.expenses, net: balance.balance },
    savingsRate: Math.round(savingsRate * 10) / 10,
    topExpenseCategories,
    momChanges: momChanges.slice(0, 5).map(m => ({
      name: m.categoryName,
      delta: m.delta,
      deltaPercent: m.deltaPercent,
    })),
    anomalies: anomalies.map(a => ({
      name: a.categoryName,
      amount: a.amount,
      ratio: a.ratio,
    })),
    healthScore: healthResult.score,
    forecast: {
      dailyRate: forecast.dailyRate,
      projectedMonthEnd: forecast.forecastTotal,
    },
    upcomingRecurring: upcoming.map(u => ({
      label: u.label,
      amount: u.amount,
      daysUntil: u.daysUntil,
    })),
  };
}

// ==================== Coffee Effect ====================

export interface CoffeeEffect {
  categoryName: string;
  dailyAvg: number;
  monthlyAvg: number;
  yearlyTotal: number;
  transactionCount: number;
}

export async function getCoffeeEffects(start: number, end: number): Promise<CoffeeEffect[]> {
  const transactions = await db.transactions
    .where('date').between(start, end)
    .filter(t => t.type === 'expense')
    .toArray();

  const categories = await db.categories.toArray();
  const catMap = new Map(categories.map(c => [c.id, c]));

  const byCat = new Map<string, { total: number; count: number; name: string }>();
  for (const t of transactions) {
    const key = t.categoryId ?? '__none__';
    const name = catMap.get(t.categoryId ?? '')?.name ?? 'Другое';
    const prev = byCat.get(key) ?? { total: 0, count: 0, name };
    byCat.set(key, { total: prev.total + t.amount * t.rate, count: prev.count + 1, name });
  }

  const periodDays = Math.max(1, (end - start) / MS_PER_DAY);
  // "Frequent" = at least one transaction every 3 days on average
  const frequentThreshold = periodDays / 3;

  return Array.from(byCat.values())
    .filter(v => v.count >= frequentThreshold && v.count >= 5)
    .map(v => ({
      categoryName: v.name,
      dailyAvg: v.total / periodDays,
      monthlyAvg: (v.total / periodDays) * 30,
      yearlyTotal: (v.total / periodDays) * 365,
      transactionCount: v.count,
    }))
    .sort((a, b) => b.yearlyTotal - a.yearlyTotal)
    .slice(0, 4);
}
