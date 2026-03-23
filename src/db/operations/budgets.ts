// src/db/operations/budgets.ts
// CRUD операции для бюджетов

import { db } from '../db';
import { Budget, PeriodType } from '../types';
import { validateBudget, assertValid } from '../validators';

/**
 * Добавляет новый бюджет с валидацией
 */
export async function addBudget(budget: Omit<Budget, 'id'>): Promise<number> {
  const validation = validateBudget(budget);
  assertValid(validation, 'Budget');

  const id = await db.budgets.add(budget);
  return id;
}

/**
 * Получает бюджет по ID
 */
export async function getBudget(id: number): Promise<Budget | undefined> {
  return db.budgets.get(id);
}

/**
 * Обновляет бюджет с валидацией
 */
export async function updateBudget(id: number, updates: Partial<Budget>): Promise<void> {
  const validation = validateBudget(updates, true);
  assertValid(validation, 'Budget update');

  await db.budgets.update(id, updates);
}

/**
 * Удаляет бюджет
 */
export async function deleteBudget(id: number): Promise<void> {
  await db.budgets.delete(id);
}

/**
 * Получает все бюджеты
 */
export async function getBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}

/**
 * Получает бюджет по категории и периоду
 */
export async function getBudgetByCategory(
  categoryId: string,
  period: PeriodType
): Promise<Budget | undefined> {
  return db.budgets
    .where('categoryId')
    .equals(categoryId)
    .and(b => b.period === period)
    .first();
}

/**
 * Получает активные бюджеты
 */
export async function getActiveBudgets(): Promise<Budget[]> {
  const now = Date.now();
  return db.budgets.filter(b => b.startDate <= now).toArray();
}
