import { useState, useEffect } from 'react';
import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getIncomeByCategory,
  getSpendingTrend,
  getCurrentBalance,
  CategoryAnalytics,
  SpendingTrendPoint,
  BalanceSummary,
} from '../../db/analytics';

export function useAnalytics() {
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryAnalytics[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryAnalytics[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<SpendingTrendPoint[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const now = Date.now();
      const monthMs = 30 * 24 * 60 * 60 * 1000;
      const start = now - monthMs;

      const [
        balanceData,
        expensesData,
        incomeData,
        trendData,
        currentBalanceData,
      ] = await Promise.all([
        getBalanceByPeriod(start, now),
        getExpensesByCategory(start, now),
        getIncomeByCategory(start, now),
        getSpendingTrend(30),
        getCurrentBalance(),
      ]);

      setBalance(balanceData);
      setExpensesByCategory(expensesData);
      setIncomeByCategory(incomeData);
      setSpendingTrend(trendData);
      setCurrentBalance(currentBalanceData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return {
    balance,
    expensesByCategory,
    incomeByCategory,
    spendingTrend,
    currentBalance,
    loading,
    error,
    refresh: loadAnalytics,
  };
}
