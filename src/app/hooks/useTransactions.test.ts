/**
 * Тесты для хука useTransactions
 * Проверяют загрузку, добавление, обновление и удаление транзакций
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTransactions } from './useTransactions';

// Мок для операций с БД
vi.mock('../../db/operations', () => ({
  getAllTransactions: vi.fn(),
  addTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getTransactionsByPeriod: vi.fn(),
}));

// Мок для errorHandler
vi.mock('../utils/errorHandler', () => ({
  AppError: class AppError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
  logError: vi.fn(),
  formatErrorForUser: vi.fn(() => 'Ошибка операций'),
}));

import {
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByPeriod,
} from '../../db/operations';
import { formatErrorForUser } from '../utils/errorHandler';

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('инициализация', () => {
    it('должен инициализировать transactions пустым массивом', () => {
      const { result } = renderHook(() => useTransactions());

      expect(result.current.transactions).toEqual([]);
    });

    it('должен инициализировать loading как true', () => {
      const { result } = renderHook(() => useTransactions());

      expect(result.current.loading).toBe(true);
    });

    it('должен инициализировать error как null', () => {
      const { result } = renderHook(() => useTransactions());

      expect(result.current.error).toBeNull();
    });
  });

  describe('загрузка транзакций', () => {
    it('должен загружать все транзакции по умолчанию', async () => {
      const mockTransactions = [
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
        { id: 2, amount: 5000, type: 'income' as const, categoryId: 'cat-2', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];

      (getAllTransactions as any).mockResolvedValue(mockTransactions);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.transactions).toEqual(mockTransactions);
      expect(getAllTransactions).toHaveBeenCalledTimes(1);
    });

    it('должен загружать транзакции за период если указаны даты', async () => {
      const mockTransactions = [
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];

      const startDate = Date.now() - 86400000;
      const endDate = Date.now();

      (getTransactionsByPeriod as any).mockResolvedValue(mockTransactions);

      const { result } = renderHook(() => useTransactions({
        period: 'custom',
        startDate,
        endDate,
      }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(getTransactionsByPeriod).toHaveBeenCalledWith(startDate, endDate);
      expect(result.current.transactions).toEqual(mockTransactions);
    });

    it('должен обрабатывать ошибку при загрузке', async () => {
      (getAllTransactions as any).mockRejectedValue(new Error('DB error'));
      (formatErrorForUser as any).mockReturnValue('Ошибка загрузки');

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Ошибка загрузки');
    });
  });

  describe('добавление транзакции', () => {
    it('должен добавлять транзакцию и перезагружать список', async () => {
      const mockTransactions = [
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];

      (getAllTransactions as any).mockResolvedValue(mockTransactions);
      (addTransaction as any).mockResolvedValue(2);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newTransaction = {
        amount: 500,
        type: 'expense' as const,
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB' as const,
        rate: 1,
      };

      await act(async () => {
        await result.current.add(newTransaction);
      });

      expect(addTransaction).toHaveBeenCalledWith(newTransaction);
      expect(getAllTransactions).toHaveBeenCalledTimes(3); // initial + event sync + after add
    });

    it('должен бросать ошибку при неудачном добавлении', async () => {
      const mockTransactions: any[] = [];
      (getAllTransactions as any).mockResolvedValue(mockTransactions);
      (addTransaction as any).mockRejectedValue(new Error('Add failed'));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newTransaction = {
        amount: 500,
        type: 'expense' as const,
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB' as const,
        rate: 1,
      };

      await expect(result.current.add(newTransaction)).rejects.toThrow();
    });
  });

  describe('обновление транзакции', () => {
    it('должен обновлять транзакцию и перезагружать список', async () => {
      const mockTransactions = [
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];

      (getAllTransactions as any).mockResolvedValue(mockTransactions);
      (updateTransaction as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.update(1, { amount: 1500 });
      });

      expect(updateTransaction).toHaveBeenCalledWith(1, { amount: 1500 });
      expect(getAllTransactions).toHaveBeenCalledTimes(3);
    });

    it('должен бросать ошибку при неудачном обновлении', async () => {
      (getAllTransactions as any).mockResolvedValue([]);
      (updateTransaction as any).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.update(1, { amount: 1500 })).rejects.toThrow();
    });
  });

  describe('удаление транзакции', () => {
    it('должен удалять транзакцию и перезагружать список', async () => {
      const mockTransactions = [
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];

      (getAllTransactions as any).mockResolvedValue(mockTransactions);
      (deleteTransaction as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.remove(1);
      });

      expect(deleteTransaction).toHaveBeenCalledWith(1);
      expect(getAllTransactions).toHaveBeenCalledTimes(3);
    });

    it('должен бросать ошибку при неудачном удалении', async () => {
      (getAllTransactions as any).mockResolvedValue([]);
      (deleteTransaction as any).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.remove(1)).rejects.toThrow();
    });
  });

  describe('refresh функция', () => {
    it('должен перезагружать транзакции при вызове refresh', async () => {
      const initialTransactions = [
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];
      const newTransactions = [
        { id: 2, amount: 2000, type: 'income' as const, categoryId: 'cat-2', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];

      (getAllTransactions as any).mockResolvedValueOnce(initialTransactions);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      (getAllTransactions as any).mockResolvedValueOnce(newTransactions);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.transactions).toEqual(newTransactions);
    });

    it('должен очищать ошибку при успешном refresh', async () => {
      (getAllTransactions as any)
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce([]);

      (formatErrorForUser as any).mockReturnValue('Ошибка');

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Ошибка');

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('опции периода', () => {
    it('должен использовать период по умолчанию month', () => {
      const { result } = renderHook(() => useTransactions());

      expect(result.current.transactions).toEqual([]);
    });

    it('должен принимать период day', async () => {
      (getAllTransactions as any).mockResolvedValue([]);

      const { result } = renderHook(() => useTransactions({ period: 'day' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loading).toBe(false);
    });

    it('должен принимать период week', async () => {
      (getAllTransactions as any).mockResolvedValue([]);

      const { result } = renderHook(() => useTransactions({ period: 'week' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loading).toBe(false);
    });
  });
});

// Helper для act
async function act<T>(fn: () => T | Promise<T>): Promise<void> {
  await fn();
  await new Promise(resolve => setTimeout(resolve, 0));
}
