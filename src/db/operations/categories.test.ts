/**
 * Тесты для операций с категориями в БД
 * Проверяют CRUD операции и фильтрацию по типу
 */

import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import { db } from '../db';
import { Category } from '../types';
import {
  addCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  getCategoriesByType,
  getExpenseCategories,
  getIncomeCategories,
} from './categories';
import { validateCategory } from '../validators';

// Мок для валидаторов
vi.mock('../validators', () => ({
  validateCategory: vi.fn(),
  assertValid: vi.fn((result, entityType) => {
    if (!result.isValid) {
      throw new Error(`${entityType} validation failed: ${result.errors.join('; ')}`);
    }
  }),
}));

describe('categories operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addCategory', () => {
    it('должен добавлять категорию с валидацией', async () => {
      const category = {
        id: 'cat-1',
        name: 'Продукты',
        type: 'expense' as const,
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      };

      (validateCategory as Mocked<any>).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.categories.add as Mocked<any>).mockResolvedValue('cat-1');

      const id = await addCategory(category);

      expect(validateCategory).toHaveBeenCalledWith(category);
      expect(db.categories.add).toHaveBeenCalledWith(category);
      expect(id).toBe('cat-1');
    });

    it('должен выбрасывать ошибку при невалидной категории', async () => {
      const category = {
        id: 'cat-1',
        name: '',
        type: 'expense' as const,
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      };

      (validateCategory as Mocked<any>).mockReturnValue({ 
        isValid: false, 
        errors: ['Name is required'], 
        warnings: [] 
      });

      await expect(addCategory(category)).rejects.toThrow('Category validation failed');
    });
  });

  describe('getCategory', () => {
    it('должен получать категорию по ID', async () => {
      const category = {
        id: 'cat-1',
        name: 'Продукты',
        type: 'expense' as const,
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      };

      (db.categories.get as Mocked<any>).mockResolvedValue(category);

      const result = await getCategory('cat-1');

      expect(db.categories.get).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(category);
    });

    it('должен возвращать undefined для несуществующей категории', async () => {
      (db.categories.get as Mocked<any>).mockResolvedValue(undefined);

      const result = await getCategory('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('updateCategory', () => {
    it('должен обновлять категорию с валидацией', async () => {
      const updates = { name: 'Обновлённые продукты' };

      (validateCategory as Mocked<any>).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.categories.update as Mocked<any>).mockResolvedValue();

      await updateCategory('cat-1', updates);

      expect(validateCategory).toHaveBeenCalledWith(updates, true);
      expect(db.categories.update).toHaveBeenCalledWith('cat-1', updates);
    });
  });

  describe('deleteCategory', () => {
    it('должен удалять категорию', async () => {
      (db.categories.delete as Mocked<any>).mockResolvedValue();

      await deleteCategory('cat-1');

      expect(db.categories.delete).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('getCategories', () => {
    it('должен получать все категории', async () => {
      const categories: Category[] = [
        {
          id: 'cat-1',
          name: 'Продукты',
          type: 'expense',
          icon: 'shopping-cart',
          color: '#FF5722',
          isSystem: true,
        },
        {
          id: 'cat-2',
          name: 'Зарплата',
          type: 'income',
          icon: 'wallet',
          color: '#4CAF50',
          isSystem: true,
        },
      ];

      (db.categories.toArray as Mocked<any>).mockResolvedValue(categories);

      const result = await getCategories();

      expect(db.categories.toArray).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });
  });

  describe('getCategoriesByType', () => {
    it('должен получать категории по типу expense', async () => {
      const categories: Category[] = [
        {
          id: 'cat-1',
          name: 'Продукты',
          type: 'expense',
          icon: 'shopping-cart',
          color: '#FF5722',
          isSystem: true,
        },
      ];

      const mockChain = {
        equals: vi.fn().mockResolvedValue(categories),
      };
      (db.categories.where as Mocked<any>).mockReturnValue(mockChain as any);

      const result = await getCategoriesByType('expense');

      expect(db.categories.where).toHaveBeenCalledWith('type');
      expect(mockChain.equals).toHaveBeenCalledWith('expense');
      expect(result).toEqual(categories);
    });

    it('должен получать категории по типу income', async () => {
      const categories: Category[] = [
        {
          id: 'cat-2',
          name: 'Зарплата',
          type: 'income',
          icon: 'wallet',
          color: '#4CAF50',
          isSystem: true,
        },
      ];

      const mockChain = {
        equals: vi.fn().mockResolvedValue(categories),
      };
      (db.categories.where as Mocked<any>).mockReturnValue(mockChain as any);

      const result = await getCategoriesByType('income');

      expect(db.categories.where).toHaveBeenCalledWith('type');
      expect(mockChain.equals).toHaveBeenCalledWith('income');
      expect(result).toEqual(categories);
    });
  });

  describe('getExpenseCategories', () => {
    it('должен получать только категории расходов', async () => {
      const categories: Category[] = [
        {
          id: 'cat-1',
          name: 'Продукты',
          type: 'expense',
          icon: 'shopping-cart',
          color: '#FF5722',
          isSystem: true,
        },
      ];

      const mockChain = {
        equals: vi.fn().mockResolvedValue(categories),
      };
      (db.categories.where as Mocked<any>).mockReturnValue(mockChain as any);

      const result = await getExpenseCategories();

      expect(db.categories.where).toHaveBeenCalledWith('type');
      expect(result).toEqual(categories);
    });
  });

  describe('getIncomeCategories', () => {
    it('должен получать только категории доходов', async () => {
      const categories: Category[] = [
        {
          id: 'cat-2',
          name: 'Зарплата',
          type: 'income',
          icon: 'wallet',
          color: '#4CAF50',
          isSystem: true,
        },
      ];

      const mockChain = {
        equals: vi.fn().mockResolvedValue(categories),
      };
      (db.categories.where as Mocked<any>).mockReturnValue(mockChain as any);

      const result = await getIncomeCategories();

      expect(db.categories.where).toHaveBeenCalledWith('type');
      expect(result).toEqual(categories);
    });
  });
});
