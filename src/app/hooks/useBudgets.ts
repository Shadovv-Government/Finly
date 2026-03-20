import { useState, useEffect } from 'react';
import { Budget } from '../../db/types';
import { getBudgets } from '../../db/operations';

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await getBudgets();
      setBudgets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  return { budgets, loading, error, refresh: loadBudgets };
}
