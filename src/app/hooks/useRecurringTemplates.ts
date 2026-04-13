import { useState, useEffect, useCallback } from 'react';
import { RecurringTemplate } from '../../db/types';
import {
  getRecurringTemplates,
  addRecurringTemplate as addRecurringDb,
  updateRecurringTemplate as updateRecurringDb,
  deleteRecurringTemplate as deleteRecurringDb,
} from '../../db/operations';
import { AppError, DatabaseError, logError, formatErrorForUser } from '../utils/errorHandler';

export function useRecurringTemplates() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRecurringTemplates();
      setTemplates(data);
      setError(null);
    } catch (err) {
      const appError = err instanceof AppError
        ? err
        : new DatabaseError('Не удалось загрузить шаблоны', err as Error);
      logError(appError, 'useRecurringTemplates.loadTemplates');
      setError(formatErrorForUser(appError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const add = useCallback(async (template: Omit<RecurringTemplate, 'id'>) => {
    try {
      const id = await addRecurringDb(template);
      await loadTemplates();
      return id;
    } catch (err) {
      const appError = err instanceof AppError
        ? err
        : new DatabaseError('Не удалось добавить шаблон', err as Error);
      logError(appError, 'useRecurringTemplates.add');
      throw appError;
    }
  }, [loadTemplates]);

  const update = useCallback(async (id: number, updates: Partial<RecurringTemplate>) => {
    try {
      await updateRecurringDb(id, updates);
      await loadTemplates();
    } catch (err) {
      const appError = err instanceof AppError
        ? err
        : new DatabaseError('Не удалось обновить шаблон', err as Error);
      logError(appError, 'useRecurringTemplates.update');
      throw appError;
    }
  }, [loadTemplates]);

  const remove = useCallback(async (id: number) => {
    try {
      await deleteRecurringDb(id);
      await loadTemplates();
    } catch (err) {
      const appError = err instanceof AppError
        ? err
        : new DatabaseError('Не удалось удалить шаблон', err as Error);
      logError(appError, 'useRecurringTemplates.remove');
      throw appError;
    }
  }, [loadTemplates]);

  const toggleActive = useCallback(async (id: number, isActive: boolean) => {
    try {
      await updateRecurringDb(id, { isActive });
      await loadTemplates();
    } catch (err) {
      const appError = err instanceof AppError
        ? err
        : new DatabaseError('Не удалось переключить шаблон', err as Error);
      logError(appError, 'useRecurringTemplates.toggleActive');
      throw appError;
    }
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    refresh: loadTemplates,
    add,
    update,
    remove,
    toggleActive,
  };
}
