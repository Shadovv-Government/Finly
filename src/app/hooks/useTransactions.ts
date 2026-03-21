import { useState, useEffect } from 'react';
import { Transaction } from '../../db/types';
import { getAllTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionsByPeriod } from '../../db/operations';

export interface UseTransactionsOptions {
  period?: 'day' | 'week' | 'month' | 'custom';
  startDate?: number;
  endDate?: number;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { period = 'month', startDate, endDate } = options;

  const loadTransactions = async () => {
    try {
      setLoading(true);
      let data: Transaction[];

      if (startDate && endDate) {
        data = await getTransactionsByPeriod(startDate, endDate);
      } else {
        data = await getAllTransactions();
      }

      setTransactions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [period, startDate, endDate]);

  const add = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const id = await addTransaction(transaction);
    await loadTransactions();
    return id;
  };

  const update = async (id: number, updates: Partial<Transaction>) => {
    await updateTransaction(id, updates);
    await loadTransactions();
  };

  const remove = async (id: number) => {
    await deleteTransaction(id);
    await loadTransactions();
  };

  return { transactions, loading, error, add, update, remove, refresh: loadTransactions };
}
