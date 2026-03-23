import { useState, useEffect, useCallback } from 'react';
import { Budget } from '../../db/types';
import { getBudgets } from '../../db/operations';
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

  return { budgets, loading, error, refresh: loadBudgets };
}
