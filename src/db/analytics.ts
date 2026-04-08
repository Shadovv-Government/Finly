// src/db/analytics.ts
// Аналитические запросы для графиков и дашбордов

import { db } from './db';
import { MS_PER_DAY, MS_PER_MONTH } from '../app/constants';

export interface CategoryAnalytics {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
  icon: string;
  color: string;
}

export interface SpendingTrendPoint {
  date: number;
  amount: number;
  label: string;
}

export interface BudgetProgress {
  categoryId: string;
  categoryName: string;
  spent: number;
  limit: number;
  percent: number;
  isOverBudget: boolean;
  icon: string;
  color: string;
}

export interface BalanceSummary {
  income: number;
  expenses: number;
  balance: number;
  periodStart: number;
  periodEnd: number;
}

export interface GoalProgress {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percent: number;
  remaining: number;
  icon: string;
  color: string;
  deadline?: number;
  monthlyNeeded?: number;
  isActive?: boolean;
}

// ==================== Balance ====================

export async function getBalanceByPeriod(start: number, end: number): Promise<BalanceSummary> {
  const transactions = await db.transactions
    .where('date')
    .between(start, end)
    .toArray();

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount * t.rate, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount * t.rate, 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    periodStart: start,
    periodEnd: end,
  };
}

export async function getCurrentBalance(): Promise<number> {
  const transactions = await db.transactions.toArray();

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount * t.rate, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount * t.rate, 0);

  return income - expenses;
}

/**
 * Возвращает общую сумму накоплений по всем активным целям
 */
export async function getTotalSavings(): Promise<number> {
  const goals = await db.goals.filter(g => g.isActive).toArray();
  return goals.reduce((sum, g) => sum + g.currentAmount, 0);
}

/**
 * Возвращает сводку по балансу с учётом накоплений
 */
export async function getBalanceWithSavings(): Promise<{
  totalBalance: number;      // общий баланс (доходы - расходы)
  freeBalance: number;       // свободные средства (без учёта накоплений)
  savingsAmount: number;     // сумма в накоплениях
  income: number;
  expenses: number;
}> {
  const transactions = await db.transactions.toArray();
  const goals = await db.goals.filter(g => g.isActive).toArray();

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount * t.rate, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount * t.rate, 0);

  const savingsAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalBalance = income - expenses;
  const freeBalance = totalBalance - savingsAmount;

  return {
    totalBalance,
    freeBalance,
    savingsAmount,
    income,
    expenses,
  };
}

// ==================== Expenses by Category ====================

export async function getExpensesByCategory(start: number, end: number): Promise<CategoryAnalytics[]> {
  const transactions = await db.transactions
    .where('date')
    .between(start, end)
    .filter(t => t.type === 'expense')
    .toArray();

  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  const byCategory = new Map<string, number>();

  transactions.forEach(t => {
    if (!t.categoryId) return; // пропускаем транзакции без категории
    const current = byCategory.get(t.categoryId) || 0;
    byCategory.set(t.categoryId, current + t.amount * t.rate);
  });

  const total = Array.from(byCategory.values()).reduce((sum, v) => sum + v, 0);

  const result: CategoryAnalytics[] = [];
  
  byCategory.forEach((amount, categoryId) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      result.push({
        categoryId,
        categoryName: category.name,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
        icon: category.icon,
        color: category.color,
      });
    }
  });

  return result.sort((a, b) => b.amount - a.amount);
}

export async function getIncomeByCategory(start: number, end: number): Promise<CategoryAnalytics[]> {
  const transactions = await db.transactions
    .where('date')
    .between(start, end)
    .filter(t => t.type === 'income')
    .toArray();

  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  const byCategory = new Map<string, number>();

  transactions.forEach(t => {
    if (!t.categoryId) return; // пропускаем транзакции без категории
    const current = byCategory.get(t.categoryId) || 0;
    byCategory.set(t.categoryId, current + t.amount * t.rate);
  });

  const total = Array.from(byCategory.values()).reduce((sum, v) => sum + v, 0);

  const result: CategoryAnalytics[] = [];
  
  byCategory.forEach((amount, categoryId) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      result.push({
        categoryId,
        categoryName: category.name,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
        icon: category.icon,
        color: category.color,
      });
    }
  });

  return result.sort((a, b) => b.amount - a.amount);
}

// ==================== Spending Trend ====================

export async function getSpendingTrend(days: number): Promise<SpendingTrendPoint[]> {
  const now = Date.now();
  const start = now - (days * MS_PER_DAY);

  const transactions = await db.transactions
    .where('date')
    .between(start, now)
    .filter(t => t.type === 'expense')
    .toArray();

  const byDay = new Map<number, number>();

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const dayStart = now - (i * MS_PER_DAY);
    const dayKey = new Date(dayStart).setHours(0, 0, 0, 0);
    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, 0);
    }
  }

  // Aggregate transactions by day
  transactions.forEach(t => {
    const dayKey = new Date(t.date).setHours(0, 0, 0, 0);
    const current = byDay.get(dayKey) || 0;
    byDay.set(dayKey, current + t.amount * t.rate);
  });

  const result: SpendingTrendPoint[] = [];
  
  byDay.forEach((amount, timestamp) => {
    const date = new Date(timestamp);
    result.push({
      date: timestamp,
      amount,
      label: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    });
  });

  return result.sort((a, b) => a.date - b.date);
}

export async function getIncomeTrend(days: number): Promise<SpendingTrendPoint[]> {
  const now = Date.now();
  const start = now - (days * MS_PER_DAY);

  const transactions = await db.transactions
    .where('date')
    .between(start, now)
    .filter(t => t.type === 'income')
    .toArray();

  const byDay = new Map<number, number>();

  for (let i = 0; i < days; i++) {
    const dayStart = now - (i * MS_PER_DAY);
    const dayKey = new Date(dayStart).setHours(0, 0, 0, 0);
    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, 0);
    }
  }

  transactions.forEach(t => {
    const dayKey = new Date(t.date).setHours(0, 0, 0, 0);
    const current = byDay.get(dayKey) || 0;
    byDay.set(dayKey, current + t.amount * t.rate);
  });

  const result: SpendingTrendPoint[] = [];
  byDay.forEach((amount, timestamp) => {
    const date = new Date(timestamp);
    result.push({
      date: timestamp,
      amount,
      label: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    });
  });

  return result.sort((a, b) => a.date - b.date);
}

export async function getMonthlyTrend(months: number): Promise<SpendingTrendPoint[]> {
  const now = Date.now();
  const start = now - (months * 31 * MS_PER_DAY);

  const transactions = await db.transactions
    .where('date')
    .between(start, now)
    .filter(t => t.type === 'expense')
    .toArray();

  const byMonth = new Map<string, number>();
  
  // Initialize months
  for (let i = 0; i < months; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, 0);
    }
  }

  // Aggregate transactions by month
  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = byMonth.get(monthKey) || 0;
    byMonth.set(monthKey, current + t.amount * t.rate);
  });

  const result: SpendingTrendPoint[] = [];
  
  byMonth.forEach((amount, monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    result.push({
      date: date.getTime(),
      amount,
      label: date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
    });
  });

  return result.sort((a, b) => a.date - b.date);
}

// ==================== Budget Progress ====================

export async function getBudgetProgressForPeriod(
  categoryId: string,
  start: number,
  end: number
): Promise<BudgetProgress | null> {
  const budgets = await db.budgets
    .where('categoryId')
    .equals(categoryId)
    .toArray();

  const budget = budgets
    .filter(b => b.startDate <= start)
    .sort((a, b) => b.startDate - a.startDate)[0];
  if (!budget) return null;

  const expenses = await db.transactions
    .where('date')
    .between(start, end)
    .filter(t => t.type === 'expense' && t.categoryId === categoryId)
    .toArray();

  const spent = expenses.reduce((sum, t) => sum + t.amount * t.rate, 0);
  const percent = (spent / budget.amount) * 100;

  const category = await db.categories.get(categoryId);

  return {
    categoryId,
    categoryName: category?.name || 'Unknown',
    spent,
    limit: budget.amount,
    percent: Math.min(percent, 100),
    isOverBudget: spent > budget.amount,
    icon: category?.icon || '📊',
    color: category?.color || '#999',
  };
}

export async function getAllBudgetsProgress(start: number, end: number): Promise<BudgetProgress[]> {
  const budgets = await db.budgets.filter(b => b.startDate <= start).toArray();

  // Keep only the most recent budget per category
  const latestByCategoryId = new Map<string, typeof budgets[0]>();
  for (const b of budgets) {
    const existing = latestByCategoryId.get(b.categoryId);
    if (!existing || b.startDate > existing.startDate) {
      latestByCategoryId.set(b.categoryId, b);
    }
  }

  const result: BudgetProgress[] = [];
  for (const budget of latestByCategoryId.values()) {
    const progress = await getBudgetProgressForPeriod(budget.categoryId, start, end);
    if (progress) {
      result.push(progress);
    }
  }

  return result;
}

// ==================== Goals Progress ====================

export async function getGoalsProgress(): Promise<GoalProgress[]> {
  const goals = await db.goals.toArray();
  const result: GoalProgress[] = [];

  for (const goal of goals) {
    const percent = goal.targetAmount > 0 
      ? (goal.currentAmount / goal.targetAmount) * 100 
      : 0;
    
    const remaining = goal.targetAmount - goal.currentAmount;

    let monthlyNeeded: number | undefined;
    if (goal.deadline && goal.isActive) {
      const now = Date.now();
      const monthsLeft = Math.max(1, Math.ceil((goal.deadline - now) / MS_PER_MONTH));
      monthlyNeeded = remaining / monthsLeft;
    }

    result.push({
      id: goal.id!,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      percent: Math.min(percent, 100),
      remaining,
      icon: goal.icon,
      color: goal.color,
      deadline: goal.deadline,
      monthlyNeeded,
      isActive: goal.isActive,
    });
  }

  return result;
}

// ==================== Summary Stats ====================

export async function getSummaryStats(): Promise<{
  totalTransactions: number;
  totalCategories: number;
  totalGoals: number;
  totalBudgets: number;
  firstTransactionDate?: number;
  lastTransactionDate?: number;
}> {
  const [
    totalTransactions,
    totalCategories,
    totalGoals,
    totalBudgets,
  ] = await Promise.all([
    db.transactions.count(),
    db.categories.count(),
    db.goals.count(),
    db.budgets.count(),
  ]);

  const firstTransaction = await db.transactions.orderBy('date').first();
  const lastTransaction = await db.transactions.orderBy('date').reverse().first();

  return {
    totalTransactions,
    totalCategories,
    totalGoals,
    totalBudgets,
    firstTransactionDate: firstTransaction?.date,
    lastTransactionDate: lastTransaction?.date,
  };
}
