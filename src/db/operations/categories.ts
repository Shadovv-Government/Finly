// src/db/operations/categories.ts
// CRUD операции для категорий

import { db } from '../db';
import { Category, TransactionType } from '../types';
import { validateCategory, assertValid } from '../validators';

/**
 * Добавляет новую категорию с валидацией
 */
export async function addCategory(category: Category): Promise<string> {
  const validation = validateCategory(category);
  assertValid(validation, 'Category');

  await db.categories.add(category);
  return category.id;
}

/**
 * Получает категорию по ID
 */
export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

/**
 * Обновляет категорию с валидацией
 */
export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const validation = validateCategory(updates, true);
  assertValid(validation, 'Category update');

  await db.categories.update(id, updates);
}

/**
 * Удаляет категорию
 */
export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

/**
 * Получает все категории
 */
export async function getCategories(): Promise<Category[]> {
  return db.categories.toArray();
}

/**
 * Получает категории по типу
 */
export async function getCategoriesByType(type: TransactionType): Promise<Category[]> {
  return db.categories.where('type').equals(type).toArray();
}

/**
 * Получает категории расходов
 */
export async function getExpenseCategories(): Promise<Category[]> {
  return getCategoriesByType('expense');
}

/**
 * Получает категории доходов
 */
export async function getIncomeCategories(): Promise<Category[]> {
  return getCategoriesByType('income');
}
