// src/db/operations/recurring.ts
// CRUD операции для повторяющихся платежей

import { db } from '../db';
import { RecurringTemplate } from '../types';
import { validateRecurringTemplate, assertValid } from '../validators';

/**
 * Добавляет новый шаблон с валидацией
 */
export async function addRecurringTemplate(template: Omit<RecurringTemplate, 'id'>): Promise<number> {
  const validation = validateRecurringTemplate(template);
  assertValid(validation, 'RecurringTemplate');

  const id = await db.recurringTemplates.add(template);
  return id;
}

/**
 * Получает шаблон по ID
 */
export async function getRecurringTemplate(id: number): Promise<RecurringTemplate | undefined> {
  return db.recurringTemplates.get(id);
}

/**
 * Обновляет шаблон с валидацией
 */
export async function updateRecurringTemplate(id: number, updates: Partial<RecurringTemplate>): Promise<void> {
  const validation = validateRecurringTemplate(updates, true);
  assertValid(validation, 'RecurringTemplate update');

  await db.recurringTemplates.update(id, updates);
}

/**
 * Удаляет шаблон
 */
export async function deleteRecurringTemplate(id: number): Promise<void> {
  await db.recurringTemplates.delete(id);
}

/**
 * Получает все шаблоны
 */
export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  return db.recurringTemplates.toArray();
}

/**
 * Получает активные шаблоны
 */
export async function getActiveRecurringTemplates(): Promise<RecurringTemplate[]> {
  return db.recurringTemplates.filter(t => t.isActive).toArray();
}
