import { useState, useEffect, useCallback } from 'react';
import { Goal } from '../../db/types';
import {
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
} from '../../db/operations';
import { getCurrentBalance } from '../../db/analytics';
import { AppError, DatabaseError, logError, formatErrorForUser } from '../utils/errorHandler';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getGoals();
      setGoals(data);
      setError(null);
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось загрузить цели', err as Error);
      logError(appError, 'useGoals.loadGoals');
      setError(formatErrorForUser(appError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const createGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    try {
      const id = await addGoal(goal);
      await loadGoals();
      return id;
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось создать цель', err as Error);
      logError(appError, 'useGoals.createGoal');
      throw appError;
    }
  }, [loadGoals]);

  const editGoal = useCallback(async (id: number, updates: Partial<Goal>) => {
    try {
      await updateGoal(id, updates);
      await loadGoals();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось обновить цель', err as Error);
      logError(appError, 'useGoals.editGoal');
      throw appError;
    }
  }, [loadGoals]);

  const removeGoal = useCallback(async (id: number) => {
    try {
      await deleteGoal(id);
      await loadGoals();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось удалить цель', err as Error);
      logError(appError, 'useGoals.removeGoal');
      throw appError;
    }
  }, [loadGoals]);

  const addContribution = useCallback(async (id: number, amount: number) => {
    try {
      await contributeToGoal(id, amount);
      await loadGoals();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось пополнить цель', err as Error);
      logError(appError, 'useGoals.addContribution');
      throw appError;
    }
  }, [loadGoals]);

  const fetchBalance = useCallback(async () => {
    return getCurrentBalance();
  }, []);

  return {
    goals,
    activeGoals: goals.filter(g => g.isActive),
    loading,
    error,
    refresh: loadGoals,
    createGoal,
    editGoal,
    removeGoal,
    addContribution,
    fetchBalance,
  };
}
