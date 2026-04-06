import { useState, useEffect, useCallback } from 'react';
import { Budget } from '../../db/types';
import { getBudgets, addBudget as addBudgetDb, updateBudget as updateBudgetDb, deleteBudget as deleteBudgetDb } from '../../db/operations';
import { AppError, DatabaseError, logError, formatErrorForUser } from '../utils/errorHandler';

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBudgets();
      setBudgets(data);
      setError(null);
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось загрузить бюджеты', err as Error);
      logError(appError, 'useBudgets.loadBudgets');
      setError(formatErrorForUser(appError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const add = useCallback(async (budget: Omit<Budget, 'id'>) => {
    try {
      const id = await addBudgetDb(budget);
      await loadBudgets();
      return id;
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось добавить бюджет', err as Error);
      logError(appError, 'useBudgets.add');
      throw appError;
    }
  }, [loadBudgets]);

  const update = useCallback(async (id: number, updates: Partial<Budget>) => {
    try {
      await updateBudgetDb(id, updates);
      await loadBudgets();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось обновить бюджет', err as Error);
      logError(appError, 'useBudgets.update');
      throw appError;
    }
  }, [loadBudgets]);

  const remove = useCallback(async (id: number) => {
    try {
      await deleteBudgetDb(id);
      await loadBudgets();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось удалить бюджет', err as Error);
      logError(appError, 'useBudgets.remove');
      throw appError;
    }
  }, [loadBudgets]);

  return { 
    budgets, 
    loading, 
    error, 
    refresh: loadBudgets,
    add,
    update,
    remove
  };
}
