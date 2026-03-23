/**
 * Тесты для операций с транзакциями в БД
 * Проверяют CRUD операции и валидацию
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByPeriod,
  getTransactionsByCategory,
  getAllTransactions,
} from './transactions';

// Мок для db
vi.mock('../db', () => ({
  db: {
    transactions: {
      add: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        between: vi.fn(() => ({
          reverse: vi.fn(() => ({
            sortBy: vi.fn(),
          })),
        })),
        equals: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
    },
  },
}));

// Мок для валидаторов
vi.mock('../validators', () => ({
  validateTransaction: vi.fn(),
  assertValid: vi.fn((result, entityType) => {
    if (!result.isValid) {
      throw new Error(`${entityType} validation failed: ${result.errors.join('; ')}`);
    }
  }),
}));

import { db } from '../db';
import { validateTransaction, assertValid } from '../validators';

describe('transactions operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addTransaction', () => {
    it('должен добавлять транзакцию с валидацией', async () => {
      const transaction = {
        amount: 1000,
        type: 'expense' as const,
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
      };

      (validateTransaction as vi.Mock).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.transactions.add as vi.Mock).mockResolvedValue(1);

      const id = await addTransaction(transaction);

      expect(validateTransaction).toHaveBeenCalledWith(transaction);
      expect(assertValid).toHaveBeenCalledWith(expect.anything(), 'Transaction');
      expect(db.transactions.add).toHaveBeenCalledWith({
        ...transaction,
        createdAt: expect.any(Number),
      });
      expect(id).toBe(1);
    });

    it('должен устанавливать createdAt', async () => {
      const transaction = {
        amount: 500,
        type: 'income' as const,
        categoryId: 'cat-2',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
      };

      (validateTransaction as vi.Mock).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.transactions.add as vi.Mock).mockResolvedValue(2);

      await addTransaction(transaction);

      const addedData = (db.transactions.add as vi.Mock).mock.calls[0][0];
      expect(addedData.createdAt).toBeGreaterThanOrEqual(Date.now() - 1000);
    });

    it('должен бросать ошибку при неудачной валидации', async () => {
      const transaction = {
        amount: -100,
        type: 'expense' as const,
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
      };

      (validateTransaction as vi.Mock).mockReturnValue({
        isValid: false,
        errors: ['Amount must be greater than 0'],
        warnings: [],
      });

      await expect(addTransaction(transaction)).rejects.toThrow();
    });
  });

  describe('getTransaction', () => {
    it('должен получать транзакцию по ID', async () => {
      const mockTransaction = {
        id: 1,
        amount: 1000,
        type: 'expense' as const,
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
        createdAt: Date.now(),
      };

      (db.transactions.get as vi.Mock).mockResolvedValue(mockTransaction);

      const result = await getTransaction(1);

      expect(db.transactions.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTransaction);
    });

    it('должен возвращать undefined если транзакция не найдена', async () => {
      (db.transactions.get as vi.Mock).mockResolvedValue(undefined);

      const result = await getTransaction(999);

      expect(result).toBeUndefined();
    });
  });

  describe('updateTransaction', () => {
    it('должен обновлять транзакцию с валидацией', async () => {
      const updates = { amount: 1500 };

      (validateTransaction as vi.Mock).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.transactions.update as vi.Mock).mockResolvedValue(1);

      await updateTransaction(1, updates);

      expect(validateTransaction).toHaveBeenCalledWith(updates, true);
      expect(assertValid).toHaveBeenCalledWith(expect.anything(), 'Transaction update');
      expect(db.transactions.update).toHaveBeenCalledWith(1, updates);
    });

    it('должен бросать ошибку при неудачной валидации', async () => {
      const updates = { amount: -100 };

      (validateTransaction as vi.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid amount'],
        warnings: [],
      });

      await expect(updateTransaction(1, updates)).rejects.toThrow();
    });
  });

  describe('deleteTransaction', () => {
    it('должен удалять транзакцию по ID', async () => {
      (db.transactions.delete as vi.Mock).mockResolvedValue(1);

      await deleteTransaction(1);

      expect(db.transactions.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getTransactionsByPeriod', () => {
    it('должен получать транзакции за период', async () => {
      const start = Date.now() - 86400000;
      const end = Date.now();
      const mockTransactions = [
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: start + 1000, currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];

      (db.transactions.where as vi.Mock).mockReturnValue({
        between: vi.fn(() => ({
          reverse: vi.fn(() => ({
            sortBy: vi.fn().mockResolvedValue(mockTransactions),
          })),
        })),
      });

      const result = await getTransactionsByPeriod(start, end);

      expect(db.transactions.where).toHaveBeenCalledWith('date');
      expect(result).toEqual(mockTransactions);
    });

    it('должен возвращать пустой массив если нет транзакций', async () => {
      const start = Date.now() - 86400000;
      const end = Date.now();

      (db.transactions.where as vi.Mock).mockReturnValue({
        between: vi.fn(() => ({
          reverse: vi.fn(() => ({
            sortBy: vi.fn().mockResolvedValue([]),
          })),
        })),
      });

      const result = await getTransactionsByPeriod(start, end);

      expect(result).toEqual([]);
    });
  });

  describe('getTransactionsByCategory', () => {
    it('должен получать транзакции по категории', async () => {
      const mockTransactions = [
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
      ];

      (db.transactions.where as vi.Mock).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(mockTransactions),
        })),
      });

      const result = await getTransactionsByCategory('cat-1');

      expect(db.transactions.where).toHaveBeenCalledWith('categoryId');
      expect(result).toEqual(mockTransactions);
    });
  });

  describe('getAllTransactions', () => {
    it('должен получать все транзакции отсортированные по дате', async () => {
      const mockTransactions = [
        { id: 2, amount: 2000, type: 'income' as const, categoryId: 'cat-2', date: Date.now(), currency: 'RUB', rate: 1, createdAt: Date.now() },
        { id: 1, amount: 1000, type: 'expense' as const, categoryId: 'cat-1', date: Date.now() - 1000, currency: 'RUB', rate: 1, createdAt: Date.now() - 1000 },
      ];

      (db.transactions.orderBy as vi.Mock).mockReturnValue({
        reverse: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(mockTransactions),
        })),
      });

      const result = await getAllTransactions();

      expect(db.transactions.orderBy).toHaveBeenCalledWith('date');
      expect(result).toEqual(mockTransactions);
    });

    it('должен возвращать пустой массив если нет транзакций', async () => {
      (db.transactions.orderBy as vi.Mock).mockReturnValue({
        reverse: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
        })),
      });

      const result = await getAllTransactions();

      expect(result).toEqual([]);
    });
  });
});
