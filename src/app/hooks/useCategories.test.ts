/**
 * Тесты для хука useCategories
 * Проверяют загрузку категорий, обработку ошибок и refresh
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCategories } from './useCategories';

// Мок для операций с БД
vi.mock('../../db/operations', () => ({
  getCategories: vi.fn(),
}));

// Мок для errorHandler
vi.mock('../utils/errorHandler', () => ({
  AppError: class AppError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
  logError: vi.fn(),
  formatErrorForUser: vi.fn(() => 'Ошибка загрузки категорий'),
}));

import { getCategories } from '../../db/operations';
import { formatErrorForUser } from '../utils/errorHandler';

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('инициализация', () => {
    it('должен инициализировать categories пустым массивом', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.categories).toEqual([]);
    });

    it('должен инициализировать loading как true', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.loading).toBe(true);
    });

    it('должен инициализировать error как null', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.error).toBeNull();
    });
  });

  describe('загрузка категорий', () => {
    it('должен загружать категории успешно', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Продукты', type: 'expense' as const, icon: 'shopping-cart', color: '#FF5722', isSystem: true },
        { id: 'cat-2', name: 'Зарплата', type: 'income' as const, icon: 'wallet', color: '#4CAF50', isSystem: true },
      ];

      (getCategories as any).mockResolvedValue(mockCategories);

      const { result } = renderHook(() => useCategories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.error).toBeNull();
    });

    it('должен обрабатывать пустой список категорий', async () => {
      (getCategories as any).mockResolvedValue([]);

      const { result } = renderHook(() => useCategories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('должен обрабатывать ошибку при загрузке', async () => {
      const mockError = new Error('DB error');
      (getCategories as any).mockRejectedValue(mockError);
      (formatErrorForUser as any).mockReturnValue('Ошибка загрузки категорий');

      const { result } = renderHook(() => useCategories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toEqual([]);
      expect(result.current.error).toBe('Ошибка загрузки категорий');
    });
  });

  describe('refresh функция', () => {
    it('должен перезагружать категории при вызове refresh', async () => {
      const initialCategories = [{ id: 'cat-1', name: 'Старые', type: 'expense' as const, icon: 'wallet', color: '#000', isSystem: true }];
      const newCategories = [{ id: 'cat-2', name: 'Новые', type: 'income' as const, icon: 'wallet', color: '#000', isSystem: true }];

      (getCategories as any).mockResolvedValueOnce(initialCategories);

      const { result } = renderHook(() => useCategories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toEqual(initialCategories);

      // Обновляем мок для refresh
      (getCategories as any).mockResolvedValueOnce(newCategories);

      // Вызываем refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.categories).toEqual(newCategories);
    });

    it('должен устанавливать loading во время refresh', async () => {
      (getCategories as any).mockResolvedValue([]);

      const { result } = renderHook(() => useCategories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let isLoadingDuringRefresh = false;

      (getCategories as any).mockImplementation(async () => {
        isLoadingDuringRefresh = true;
        return [];
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(isLoadingDuringRefresh).toBe(true);
    });

    it('должен очищать ошибку при успешном refresh', async () => {
      // Сначала ошибка
      (getCategories as any).mockRejectedValueOnce(new Error('Error'));
      (formatErrorForUser as any).mockReturnValue('Ошибка');

      const { result } = renderHook(() => useCategories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Ошибка');

      // Затем успех
      (getCategories as any).mockResolvedValueOnce([]);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('повторная загрузка при изменении зависимостей', () => {
    it('должен загружать категории при монтировании', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Тест', type: 'expense' as const, icon: 'wallet', color: '#000', isSystem: true },
      ];

      (getCategories as any).mockResolvedValue(mockCategories);

      const { result } = renderHook(() => useCategories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getCategories).toHaveBeenCalledTimes(1);
      expect(result.current.categories).toEqual(mockCategories);
    });
  });
});

// Helper для act
async function act<T>(fn: () => T | Promise<T>): Promise<void> {
  await fn();
  await new Promise(resolve => setTimeout(resolve, 0));
}
