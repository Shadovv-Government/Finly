/**
 * Тесты для операций с транзакциями в БД
 * Проверяют CRUD операции и валидацию
 */

import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import { db } from '../db';
import { Transaction } from '../types';
import {
  addTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByPeriod,
  getTransactionsByCategory,
  getAllTransactions,
} from './transactions';
import { validateTransaction } from '../validators';

// Мок для валидаторов
vi.mock('../validators', () => ({
  validateTransaction: vi.fn(),
  assertValid: vi.fn((result, entityType) => {
    if (!result.isValid) {
      throw new Error(`${entityType} validation failed: ${result.errors.join('; ')}`);
    }
  }),
}));

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

      (validateTransaction as Mocked<any>).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.transactions.add as Mocked<any>).mockResolvedValue(1);

      const id = await addTransaction(transaction);

      expect(validateTransaction).toHaveBeenCalledWith(transaction);
      expect(db.transactions.add).toHaveBeenCalledWith({
        ...transaction,
        createdAt: expect.any(Number),
      });
      expect(id).toBe(1);
    });

    it('должен выбрасывать ошибку при невалидной транзакции', async () => {
      const transaction = {
        amount: -100,
        type: 'expense' as const,
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
      };

      (validateTransaction as Mocked<any>).mockReturnValue({ 
        isValid: false, 
        errors: ['Amount must be greater than 0'], 
        warnings: [] 
      });

      await expect(addTransaction(transaction)).rejects.toThrow('Transaction validation failed');
    });
  });

  describe('getTransaction', () => {
    it('должен получать транзакцию по ID', async () => {
      const transaction: Transaction = {
        id: 1,
        amount: 1000,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.now(),
        currency: 'RUB',
        rate: 1,
        createdAt: Date.now(),
      };

      (db.transactions.get as Mocked<any>).mockResolvedValue(transaction);

      const result = await getTransaction(1);

      expect(db.transactions.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(transaction);
    });

    it('должен возвращать undefined для несуществующей транзакции', async () => {
      (db.transactions.get as Mocked<any>).mockResolvedValue(undefined);

      const result = await getTransaction(999);

      expect(result).toBeUndefined();
    });
  });

  describe('updateTransaction', () => {
    it('должен обновлять транзакцию с валидацией', async () => {
      const updates = { amount: 1500 };

      (validateTransaction as Mocked<any>).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.transactions.update as Mocked<any>).mockResolvedValue();

      await updateTransaction(1, updates);

      expect(validateTransaction).toHaveBeenCalledWith(updates, true);
      expect(db.transactions.update).toHaveBeenCalledWith(1, updates);
    });
  });

  describe('deleteTransaction', () => {
    it('должен удалять транзакцию', async () => {
      (db.transactions.delete as Mocked<any>).mockResolvedValue();

      await deleteTransaction(1);

      expect(db.transactions.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getTransactionsByPeriod', () => {
    it('должен получать транзакции за период', async () => {
      const start = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const end = Date.now();
      const transactions: Transaction[] = [
        {
          id: 1,
          amount: 1000,
          type: 'expense',
          categoryId: 'cat-1',
          date: Date.now(),
          currency: 'RUB',
          rate: 1,
          createdAt: Date.now(),
        },
      ];

      const mockChain = {
        between: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue(transactions),
          }),
        }),
      };
      (db.transactions.where as Mocked<any>).mockReturnValue(mockChain as any);

      const result = await getTransactionsByPeriod(start, end);

      expect(db.transactions.where).toHaveBeenCalledWith('date');
      expect(mockChain.between).toHaveBeenCalledWith(start, end);
      expect(result).toEqual(transactions);
    });
  });

  describe('getTransactionsByCategory', () => {
    it('должен получать транзакции по категории', async () => {
      const transactions: Transaction[] = [
        {
          id: 1,
          amount: 1000,
          type: 'expense',
          categoryId: 'cat-1',
          date: Date.now(),
          currency: 'RUB',
          rate: 1,
          createdAt: Date.now(),
        },
      ];

      const mockChain = {
        equals: vi.fn().mockResolvedValue(transactions),
      };
      (db.transactions.where as Mocked<any>).mockReturnValue(mockChain as any);

      const result = await getTransactionsByCategory('cat-1');

      expect(db.transactions.where).toHaveBeenCalledWith('categoryId');
      expect(mockChain.equals).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(transactions);
    });
  });

  describe('getAllTransactions', () => {
    it('должен получать все транзакции', async () => {
      const transactions: Transaction[] = [
        {
          id: 1,
          amount: 1000,
          type: 'expense',
          categoryId: 'cat-1',
          date: Date.now(),
          currency: 'RUB',
          rate: 1,
          createdAt: Date.now(),
        },
      ];

      const mockChain = {
        orderBy: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(transactions),
          }),
        }),
      };
      (db.transactions.orderBy as Mocked<any>).mockReturnValue(mockChain as any);

      const result = await getAllTransactions();

      expect(db.transactions.orderBy).toHaveBeenCalledWith('date');
      expect(result).toEqual(transactions);
    });
  });
});
