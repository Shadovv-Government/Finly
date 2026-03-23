/**
 * Тесты для операций с категориями в БД
 * Проверяют CRUD операции и фильтрацию по типу
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Мок для db
vi.mock('../db', () => ({
  db: {
    categories: {
      add: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
    },
  },
}));

// Мок для валидаторов
vi.mock('../validators', () => ({
  validateCategory: vi.fn(),
  assertValid: vi.fn((result, entityType) => {
    if (!result.isValid) {
      throw new Error(`${entityType} validation failed: ${result.errors.join('; ')}`);
    }
  }),
}));

import { db } from '../db';
import { validateCategory, assertValid } from '../validators';

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

      (validateCategory as vi.Mock).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.categories.add as vi.Mock).mockResolvedValue('cat-1');

      const id = await addCategory(category);

      expect(validateCategory).toHaveBeenCalledWith(category);
      expect(assertValid).toHaveBeenCalledWith(expect.anything(), 'Category');
      expect(db.categories.add).toHaveBeenCalledWith(category);
      expect(id).toBe('cat-1');
    });

    it('должен бросать ошибку при неудачной валидации', async () => {
      const category = {
        id: 'cat-1',
        name: '',
        type: 'expense' as const,
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      };

      (validateCategory as vi.Mock).mockReturnValue({
        isValid: false,
        errors: ['Category name is required'],
        warnings: [],
      });

      await expect(addCategory(category)).rejects.toThrow();
    });
  });

  describe('getCategory', () => {
    it('должен получать категорию по ID', async () => {
      const mockCategory = {
        id: 'cat-1',
        name: 'Продукты',
        type: 'expense' as const,
        icon: 'shopping-cart',
        color: '#FF5722',
        isSystem: true,
      };

      (db.categories.get as vi.Mock).mockResolvedValue(mockCategory);

      const result = await getCategory('cat-1');

      expect(db.categories.get).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(mockCategory);
    });

    it('должен возвращать undefined если категория не найдена', async () => {
      (db.categories.get as vi.Mock).mockResolvedValue(undefined);

      const result = await getCategory('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('updateCategory', () => {
    it('должен обновлять категорию с валидацией', async () => {
      const updates = { name: 'Новое название' };

      (validateCategory as vi.Mock).mockReturnValue({ isValid: true, errors: [], warnings: [] });
      (db.categories.update as vi.Mock).mockResolvedValue(1);

      await updateCategory('cat-1', updates);

      expect(validateCategory).toHaveBeenCalledWith(updates, true);
      expect(assertValid).toHaveBeenCalledWith(expect.anything(), 'Category update');
      expect(db.categories.update).toHaveBeenCalledWith('cat-1', updates);
    });

    it('должен бросать ошибку при неудачной валидации', async () => {
      const updates = { name: '' };

      (validateCategory as vi.Mock).mockReturnValue({
        isValid: false,
        errors: ['Name cannot be empty'],
        warnings: [],
      });

      await expect(updateCategory('cat-1', updates)).rejects.toThrow();
    });
  });

  describe('deleteCategory', () => {
    it('должен удалять категорию по ID', async () => {
      (db.categories.delete as vi.Mock).mockResolvedValue(1);

      await deleteCategory('cat-1');

      expect(db.categories.delete).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('getCategories', () => {
    it('должен получать все категории', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Продукты', type: 'expense' as const, icon: 'shopping-cart', color: '#FF5722', isSystem: true },
        { id: 'cat-2', name: 'Зарплата', type: 'income' as const, icon: 'wallet', color: '#4CAF50', isSystem: true },
      ];

      (db.categories.toArray as vi.Mock).mockResolvedValue(mockCategories);

      const result = await getCategories();

      expect(db.categories.toArray).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });

    it('должен возвращать пустой массив если нет категорий', async () => {
      (db.categories.toArray as vi.Mock).mockResolvedValue([]);

      const result = await getCategories();

      expect(result).toEqual([]);
    });
  });

  describe('getCategoriesByType', () => {
    it('должен получать категории расходов', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Продукты', type: 'expense' as const, icon: 'shopping-cart', color: '#FF5722', isSystem: true },
        { id: 'cat-3', name: 'Транспорт', type: 'expense' as const, icon: 'car', color: '#2196F3', isSystem: true },
      ];

      (db.categories.where as vi.Mock).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(mockCategories),
        })),
      });

      const result = await getCategoriesByType('expense');

      expect(db.categories.where).toHaveBeenCalledWith('type');
      expect(result).toEqual(mockCategories);
    });

    it('должен получать категории доходов', async () => {
      const mockCategories = [
        { id: 'cat-2', name: 'Зарплата', type: 'income' as const, icon: 'wallet', color: '#4CAF50', isSystem: true },
      ];

      (db.categories.where as vi.Mock).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(mockCategories),
        })),
      });

      const result = await getCategoriesByType('income');

      expect(db.categories.where).toHaveBeenCalledWith('type');
      expect(result).toEqual(mockCategories);
    });

    it('должен возвращать пустой массив если нет категорий типа', async () => {
      (db.categories.where as vi.Mock).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
        })),
      });

      const result = await getCategoriesByType('expense');

      expect(result).toEqual([]);
    });
  });

  describe('getExpenseCategories', () => {
    it('должен получать категории расходов', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Продукты', type: 'expense' as const, icon: 'shopping-cart', color: '#FF5722', isSystem: true },
      ];

      // Мок для getCategoriesByType
      vi.mocked(db.categories.where).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(mockCategories),
        })),
      });

      const result = await getExpenseCategories();

      expect(result).toEqual(mockCategories);
    });
  });

  describe('getIncomeCategories', () => {
    it('должен получать категории доходов', async () => {
      const mockCategories = [
        { id: 'cat-2', name: 'Зарплата', type: 'income' as const, icon: 'wallet', color: '#4CAF50', isSystem: true },
      ];

      vi.mocked(db.categories.where).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(mockCategories),
        })),
      });

      const result = await getIncomeCategories();

      expect(result).toEqual(mockCategories);
    });
  });
});
