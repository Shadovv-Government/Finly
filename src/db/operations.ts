// src/db/operations.ts
// CRUD операции для всех сущностей базы данных

import { db } from './db';
import {
  Transaction,
  Category,
  Budget,
  Goal,
  RecurringTemplate,
  AIPattern,
  TransactionType,
  PeriodType,
  User,
} from './types';
import { v4 as uuidv4 } from 'uuid';

// ==================== Transactions ====================

export async function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<number> {
  const id = await db.transactions.add({
    ...transaction,
    createdAt: Date.now(),
  });
  return id;
}

export async function getTransaction(id: number): Promise<Transaction | undefined> {
  return db.transactions.get(id);
}

export async function updateTransaction(id: number, updates: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, updates);
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id);
}

export async function getTransactionsByPeriod(start: number, end: number): Promise<Transaction[]> {
  return db.transactions
    .where('date')
    .between(start, end)
    .sortBy('date');
}

export async function getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
  return db.transactions.where('categoryId').equals(categoryId).toArray();
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray();
}

// ==================== Categories ====================

export async function addCategory(category: Category): Promise<string> {
  await db.categories.add(category);
  return category.id;
}

export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  await db.categories.update(id, updates);
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

export async function getCategories(): Promise<Category[]> {
  return db.categories.toArray();
}

export async function getCategoriesByType(type: TransactionType): Promise<Category[]> {
  return db.categories.where('type').equals(type).toArray();
}

export async function getExpenseCategories(): Promise<Category[]> {
  return getCategoriesByType('expense');
}

export async function getIncomeCategories(): Promise<Category[]> {
  return getCategoriesByType('income');
}

// ==================== Budgets ====================

export async function addBudget(budget: Omit<Budget, 'id'>): Promise<number> {
  const id = await db.budgets.add(budget);
  return id;
}

export async function getBudget(id: number): Promise<Budget | undefined> {
  return db.budgets.get(id);
}

export async function updateBudget(id: number, updates: Partial<Budget>): Promise<void> {
  await db.budgets.update(id, updates);
}

export async function deleteBudget(id: number): Promise<void> {
  await db.budgets.delete(id);
}

export async function getBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}

export async function getBudgetByCategory(categoryId: string, period: PeriodType): Promise<Budget | undefined> {
  return db.budgets
    .where('categoryId')
    .equals(categoryId)
    .and(b => b.period === period)
    .first();
}

export async function getActiveBudgets(): Promise<Budget[]> {
  const now = Date.now();
  return db.budgets.filter(b => b.startDate <= now).toArray();
}

// ==================== Goals ====================

export async function addGoal(goal: Omit<Goal, 'id'>): Promise<number> {
  const id = await db.goals.add(goal);
  return id;
}

export async function getGoal(id: number): Promise<Goal | undefined> {
  return db.goals.get(id);
}

export async function updateGoal(id: number, updates: Partial<Goal>): Promise<void> {
  await db.goals.update(id, updates);
}

export async function deleteGoal(id: number): Promise<void> {
  await db.goals.delete(id);
}

export async function getGoals(): Promise<Goal[]> {
  return db.goals.toArray();
}

export async function getActiveGoals(): Promise<Goal[]> {
  return db.goals.filter(g => g.isActive).toArray();
}

export async function updateGoalProgress(id: number, amount: number): Promise<void> {
  await db.goals.update(id, { currentAmount: amount });
}

export async function contributeToGoal(id: number, amount: number): Promise<void> {
  const goal = await getGoal(id);
  if (goal) {
    await updateGoalProgress(id, goal.currentAmount + amount);
  }
}

/**
 * Создает транзакцию расхода для пополнения цели и обновляет прогресс цели
 * @param goalId - ID цели
 * @param amount - Сумма пополнения
 * @param categoryId - ID категории расхода (по умолчанию категория "Цели")
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

  // Создаем транзакцию расхода
  await addTransaction({
    amount,
    type: 'expense',
    categoryId: targetCategoryId,
    date: Date.now(),
    comment: `Пополнение цели "${goal.name}"`,
    currency: 'RUB',
    rate: 1,
  });

  // Обновляем прогресс цели
  await updateGoalProgress(goalId, goal.currentAmount + amount);
}

// ==================== Recurring Templates ====================

export async function addRecurringTemplate(template: Omit<RecurringTemplate, 'id'>): Promise<number> {
  const id = await db.recurringTemplates.add(template);
  return id;
}

export async function getRecurringTemplate(id: number): Promise<RecurringTemplate | undefined> {
  return db.recurringTemplates.get(id);
}

export async function updateRecurringTemplate(id: number, updates: Partial<RecurringTemplate>): Promise<void> {
  await db.recurringTemplates.update(id, updates);
}

export async function deleteRecurringTemplate(id: number): Promise<void> {
  await db.recurringTemplates.delete(id);
}

export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  return db.recurringTemplates.toArray();
}

export async function getActiveRecurringTemplates(): Promise<RecurringTemplate[]> {
  return db.recurringTemplates.filter(t => t.isActive).toArray();
}

// ==================== Settings ====================

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const setting = await db.settings.get(key);
  return setting?.value;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getAllSettings(): Promise<Record<string, any>> {
  const settings = await db.settings.toArray();
  return settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, any>);
}

// ==================== AI Patterns ====================

export async function addAIPattern(pattern: Omit<AIPattern, 'id' | 'usageCount'>): Promise<number> {
  const id = await db.aiPatterns.add({
    ...pattern,
    usageCount: 0,
  });
  return id;
}

export async function getAIPattern(id: number): Promise<AIPattern | undefined> {
  return db.aiPatterns.get(id);
}

export async function updateAIPattern(id: number, updates: Partial<AIPattern>): Promise<void> {
  await db.aiPatterns.update(id, updates);
}

export async function deleteAIPattern(id: number): Promise<void> {
  await db.aiPatterns.delete(id);
}

export async function getAIPatterns(): Promise<AIPattern[]> {
  return db.aiPatterns.toArray();
}

// ==================== Users ====================

export async function createUser(name: string, deviceId?: string): Promise<string> {
  const id = uuidv4();
  await db.users.add({
    id,
    name,
    createdAt: Date.now(),
    deviceId,
  });
  return id;
}

export async function getCurrentUser(): Promise<User | undefined> {
  const users = await db.users.toArray();
  return users.length > 0 ? users[0] : undefined;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  await db.users.update(id, updates);
}

export async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
}

export async function hasUser(): Promise<boolean> {
  const users = await db.users.toArray();
  return users.length > 0;
}
