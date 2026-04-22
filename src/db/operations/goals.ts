// src/db/operations/goals.ts
// CRUD операции для целей

import { db } from '../db';
import { Goal } from '../types';
import { validateGoal, assertValid } from '../validators';
import { getCategories, addCategory, updateCategory } from './categories';

/**
 * Добавляет новую цель с валидацией
 */
export async function addGoal(goal: Omit<Goal, 'id'>): Promise<number> {
  const validation = validateGoal(goal);
  assertValid(validation, 'Goal');

  const id = await db.goals.add(goal);
  return id;
}

/**
 * Получает цель по ID
 */
export async function getGoal(id: number): Promise<Goal | undefined> {
  return db.goals.get(id);
}

/**
 * Обновляет цель с валидацией
 */
export async function updateGoal(id: number, updates: Partial<Goal>): Promise<void> {
  const validation = validateGoal(updates, true);
  assertValid(validation, 'Goal update');

  await db.goals.update(id, updates);
}

/**
 * Удаляет цель
 */
export async function deleteGoal(id: number): Promise<void> {
  await db.goals.delete(id);
}

/**
 * Получает все цели
 */
export async function getGoals(): Promise<Goal[]> {
  return db.goals.toArray();
}

/**
 * Получает активные цели
 */
export async function getActiveGoals(): Promise<Goal[]> {
  return db.goals.filter(g => g.isActive).toArray();
}

/**
 * Обновляет прогресс цели
 */
export async function updateGoalProgress(id: number, amount: number): Promise<void> {
  await db.goals.update(id, { currentAmount: amount });
}

/**
 * Пополняет цель на указанную сумму
 */
export async function contributeToGoal(id: number, amount: number): Promise<void> {
  await db.transaction('rw', db.goals, async () => {
    const goal = await db.goals.get(id);
    if (goal) {
      await db.goals.update(id, { currentAmount: goal.currentAmount + amount });
    }
  });
}

/**
 * Создает транзакцию расхода для пополнения цели и обновляет прогресс цели
 */
export async function createGoalContribution(
  goalId: number,
  amount: number,
  categoryId?: string
): Promise<void> {
  const goal = await getGoal(goalId);
  if (!goal) {
    throw new Error('Цель не найдена');
  }

  // Находим или создаем категорию "Цели" если не передана
  let targetCategoryId = categoryId;
  if (!targetCategoryId) {
    const categories = await getCategories();
    let goalsCategory = categories.find(c => c.name === 'Цели' && c.type === 'expense');

    if (!goalsCategory) {
      // Создаем категорию "Цели" если её нет
      const newCategory = {
        id: uuidv4(),
        name: 'Цели',
        type: 'expense' as const,
        icon: 'Target',
        color: goal.color,
        isSystem: false,
      };
      await addCategory(newCategory);
      targetCategoryId = newCategory.id;
    } else {
      // Обновляем цвет категории на цвет цели
      if (goalsCategory.color !== goal.color) {
        await updateCategory(goalsCategory.id, { color: goal.color });
      }
      targetCategoryId = goalsCategory.id;
    }
  }

  // Создаем транзакцию расхода и обновляем прогресс атомарно
  await db.transaction('rw', db.transactions, db.goals, async () => {
    const goalForUpdate = await db.goals.get(goalId);
    if (!goalForUpdate) {
      throw new Error('Цель не найдена');
    }

    await db.transactions.add({
      amount,
      type: 'expense',
      categoryId: targetCategoryId!,
      date: Date.now(),
      comment: `Пополнение цели "${goal.name}"`,
      currency: 'RUB',
      rate: 1,
      createdAt: Date.now(),
    });
    await db.goals.update(goalId, { currentAmount: goalForUpdate.currentAmount + amount });
  });
}

function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes].map((b, i) =>
    [4, 6, 8, 10].includes(i)
      ? '-' + b.toString(16).padStart(2, '0')
      : b.toString(16).padStart(2, '0')
  ).join('');
}
