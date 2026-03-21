import { useState, useEffect } from 'react';
import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getIncomeByCategory,
  getSpendingTrend,
  getCurrentBalance,
  getBalanceWithSavings,
  CategoryAnalytics,
  SpendingTrendPoint,
  BalanceSummary,
} from '../../db/analytics';

export type PeriodType = 'day' | 'week' | 'month' | 'custom';

export interface PeriodRange {
  start: number;
  end: number;
}

export function getPeriodRange(period: PeriodType): PeriodRange {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  switch (period) {
    case 'day':
      return { start: now - dayMs, end: now };
    case 'week':
      return { start: now - (7 * dayMs), end: now };
    case 'month':
      return { start: now - (30 * dayMs), end: now };
    case 'custom':
    default:
      return { start: now - (30 * dayMs), end: now };
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

export function useAnalytics(period: PeriodType = 'month') {
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryAnalytics[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryAnalytics[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<SpendingTrendPoint[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [savingsAmount, setSavingsAmount] = useState<number>(0);
  const [freeBalance, setFreeBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { start, end } = getPeriodRange(period);

      const [
        balanceData,
        expensesData,
        incomeData,
        trendData,
        currentBalanceData,
        balanceWithSavingsData,
      ] = await Promise.all([
        getBalanceByPeriod(start, end),
        getExpensesByCategory(start, end),
        getIncomeByCategory(start, end),
        getSpendingTrend(period === 'day' ? 7 : 30),
        getCurrentBalance(),
        getBalanceWithSavings(),
      ]);

      setBalance(balanceData);
      setExpensesByCategory(expensesData);
      setIncomeByCategory(incomeData);
      setSpendingTrend(trendData);
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
  }, [period]);

  return {
    balance,
    expensesByCategory,
    incomeByCategory,
    spendingTrend,
    currentBalance,
    savingsAmount,
    freeBalance,
    loading,
    error,
    refresh: loadAnalytics,
  };
}
