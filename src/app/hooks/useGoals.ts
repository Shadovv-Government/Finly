import { useState, useEffect, useCallback } from 'react';
import { Goal } from '../../db/types';
import {
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
} from '../../db/operations';

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
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const createGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    const id = await addGoal(goal);
    await loadGoals();
    return id;
  }, [loadGoals]);

  const editGoal = useCallback(async (id: number, updates: Partial<Goal>) => {
    await updateGoal(id, updates);
    await loadGoals();
  }, [loadGoals]);

  const removeGoal = useCallback(async (id: number) => {
    await deleteGoal(id);
    await loadGoals();
  }, [loadGoals]);

  const addContribution = useCallback(async (id: number, amount: number) => {
    await contributeToGoal(id, amount);
    await loadGoals();
  }, [loadGoals]);

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
  };
}
