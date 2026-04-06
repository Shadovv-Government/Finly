import { useState, useEffect } from 'react';
import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getIncomeByCategory,
  getSpendingTrend,
  getIncomeTrend,
  getCurrentBalance,
  getBalanceWithSavings,
  CategoryAnalytics,
  SpendingTrendPoint,
  BalanceSummary,
} from '../../db/analytics';
import { MS_PER_DAY } from '../constants';

export type PeriodType = 'day' | 'week' | 'month' | 'custom';

export interface PeriodRange {
  start: number;
  end: number;
}

export function getPeriodRange(period: PeriodType): PeriodRange {
  const now = new Date();

  switch (period) {
    case 'day': {
      // Начало и конец текущего дня
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      return { start: startOfDay, end: endOfDay };
    }
    case 'week': {
      // Начало текущей недели (понедельник) и конец недели (воскресенье)
      const dayOfWeek = now.getDay(); // 0 = воскресенье, 1 = понедельник
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday, 0, 0, 0, 0).getTime();
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday + 7, 0, 0, 0, 0).getTime();
      return { start: startOfWeek, end: endOfWeek };
    }
    case 'month': {
      // Начало и конец текущего календарного месяца
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
      return { start: startOfMonth, end: endOfMonth };
    }
    case 'custom':
    default:
      return { start: now.getTime() - (30 * MS_PER_DAY), end: now.getTime() };
  }
}

export function getPeriodDays(period: PeriodType): number {
  switch (period) {
    case 'day': return 1;
    case 'week': return 7;
    case 'month': return 30;
    case 'custom': default: return 30;
  }
}

export interface UseAnalyticsOptions {
  period?: PeriodType;
  startDate?: number;
  endDate?: number;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { period = 'month', startDate, endDate } = options;
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryAnalytics[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryAnalytics[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<SpendingTrendPoint[]>([]);
  const [incomeTrend, setIncomeTrend] = useState<SpendingTrendPoint[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [savingsAmount, setSavingsAmount] = useState<number>(0);
  const [freeBalance, setFreeBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const range = startDate && endDate
        ? { start: startDate, end: endDate }
        : getPeriodRange(period);

      const trendDays = period === 'day' ? 7 : period === 'week' ? 7 : 30;
      const [
        balanceData,
        expensesData,
        incomeData,
        trendData,
        incomeTrendData,
        currentBalanceData,
        balanceWithSavingsData,
      ] = await Promise.all([
        getBalanceByPeriod(range.start, range.end),
        getExpensesByCategory(range.start, range.end),
        getIncomeByCategory(range.start, range.end),
        getSpendingTrend(trendDays),
        getIncomeTrend(trendDays),
        getCurrentBalance(),
        getBalanceWithSavings(),
      ]);

      setBalance(balanceData);
      setExpensesByCategory(expensesData);
      setIncomeByCategory(incomeData);
      setSpendingTrend(trendData);
      setIncomeTrend(incomeTrendData);
      setCurrentBalance(currentBalanceData);
      setSavingsAmount(balanceWithSavingsData.savingsAmount);
      setFreeBalance(balanceWithSavingsData.freeBalance);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period, startDate, endDate]);

  return {
    balance,
    expensesByCategory,
    incomeByCategory,
    spendingTrend,
    incomeTrend,
    currentBalance,
    savingsAmount,
    freeBalance,
    loading,
    error,
    refresh: loadAnalytics,
  };
}
