import { useState, useEffect, useCallback } from 'react';
import { Category } from '../../db/types';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../db/operations';
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

  const add = useCallback(async (category: Omit<Category, 'id' | 'isSystem'>) => {
    try {
      const id = crypto.randomUUID();
      await addCategory({ ...category, id, isSystem: false });
      await loadCategories();
      return id;
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось добавить категорию', err as Error);
      logError(appError, 'useCategories.add');
      throw appError;
    }
  }, [loadCategories]);

  const update = useCallback(async (id: string, updates: Partial<Category>) => {
    try {
      await updateCategory(id, updates);
      await loadCategories();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось обновить категорию', err as Error);
      logError(appError, 'useCategories.update');
      throw appError;
    }
  }, [loadCategories]);

  const remove = useCallback(async (id: string) => {
    try {
      const category = categories.find(c => c.id === id);
      if (category?.isSystem) {
        throw new AppError('Нельзя удалить системную категорию');
      }
      await deleteCategory(id);
      await loadCategories();
    } catch (err) {
      const appError = err instanceof AppError ? err : new DatabaseError('Не удалось удалить категорию', err as Error);
      logError(appError, 'useCategories.remove');
      throw appError;
    }
  }, [loadCategories, categories]);

  return { 
    categories, 
    loading, 
    error, 
    add, 
    update, 
    remove, 
    refresh: loadCategories 
  };
}
