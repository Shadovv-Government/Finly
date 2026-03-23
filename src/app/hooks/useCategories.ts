import { useState, useEffect, useCallback } from 'react';
import { Category } from '../../db/types';
import { getCategories } from '../../db/operations';
import { AppError, DatabaseError, logError, formatErrorForUser } from '../utils/errorHandler';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось загрузить категории', err as Error);
      logError(appError, 'useCategories.loadCategories');
      setError(formatErrorForUser(appError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return { categories, loading, error, refresh: loadCategories };
}
