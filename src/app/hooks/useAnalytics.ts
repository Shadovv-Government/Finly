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
  const now = Date.now();

  switch (period) {
    case 'day':
      return { start: now - MS_PER_DAY, end: now };
    case 'week':
      return { start: now - (7 * MS_PER_DAY), end: now };
    case 'month':
      return { start: now - (30 * MS_PER_DAY), end: now };
    case 'custom':
    default:
      return { start: now - (30 * MS_PER_DAY), end: now };
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
