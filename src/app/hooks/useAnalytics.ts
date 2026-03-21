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

export function useAnalytics() {
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
      const now = Date.now();
      const monthMs = 30 * 24 * 60 * 60 * 1000;
      const start = now - monthMs;

      const [
        balanceData,
        expensesData,
        incomeData,
        trendData,
        currentBalanceData,
        balanceWithSavingsData,
      ] = await Promise.all([
        getBalanceByPeriod(start, now),
        getExpensesByCategory(start, now),
        getIncomeByCategory(start, now),
        getSpendingTrend(30),
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
  }, []);

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
