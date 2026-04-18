import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../../db/types';
import { getAllTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionsByPeriod } from '../../db/operations';
import { AppError, DatabaseError, logError, formatErrorForUser } from '../utils/errorHandler';
import { emitTransactionsChanged, subscribeToTransactionsChanged } from '../utils/dataEvents';

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

  const loadTransactions = useCallback(async () => {
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
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось загрузить транзакции', err as Error);
      logError(appError, 'useTransactions.loadTransactions');
      setError(formatErrorForUser(appError));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadTransactions();
  }, [period, startDate, endDate, loadTransactions]);

  useEffect(() => {
    return subscribeToTransactionsChanged(() => {
      loadTransactions();
    });
  }, [loadTransactions]);

  const add = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const id = await addTransaction(transaction);
      emitTransactionsChanged();
      await loadTransactions();
      return id;
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось добавить транзакцию', err as Error);
      logError(appError, 'useTransactions.add');
      throw appError;
    }
  }, [loadTransactions]);

  const update = useCallback(async (id: number, updates: Partial<Transaction>) => {
    try {
      await updateTransaction(id, updates);
      emitTransactionsChanged();
      await loadTransactions();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось обновить транзакцию', err as Error);
      logError(appError, 'useTransactions.update');
      throw appError;
    }
  }, [loadTransactions]);

  const remove = useCallback(async (id: number) => {
    try {
      await deleteTransaction(id);
      emitTransactionsChanged();
      await loadTransactions();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось удалить транзакцию', err as Error);
      logError(appError, 'useTransactions.remove');
      throw appError;
    }
  }, [loadTransactions]);

  return { transactions, loading, error, add, update, remove, refresh: loadTransactions };
}
