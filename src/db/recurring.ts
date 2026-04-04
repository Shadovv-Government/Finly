// src/db/recurring.ts
// Обработка повторяющихся транзакций

import { db } from './db';
import { RecurringTemplate, RecurringInterval } from './types';
import { addTransaction } from './operations';
import { MS_PER_DAY } from '../app/constants';

export interface DueTemplate {
  template: RecurringTemplate;
  daysUntilDue: number;
  isOverdue: boolean;
}

// ==================== Interval Calculations ====================

/**
 * Вычисляет следующую дату для повторяющегося платежа
 */
export function getNextDate(currentDate: number, interval: RecurringInterval): number {
  const date = new Date(currentDate);

  switch (interval) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.getTime();
}

/**
 * Вычисляет количество дней до следующей даты
 */
export function getDaysUntilDue(nextDate: number): number {
  const now = Date.now();
  const diff = nextDate - now;
  return Math.ceil(diff / MS_PER_DAY);
}

// ==================== Due Templates ====================

/**
 * Возвращает все шаблоны, которые нужно обработать сегодня
 */
export async function getDueTemplates(): Promise<RecurringTemplate[]> {
  const templates = await db.recurringTemplates
    .filter(t => t.isActive)
    .toArray();

  const now = Date.now();
  const today = new Date(now).setHours(0, 0, 0, 0);
  const tomorrow = today + MS_PER_DAY;

  return templates.filter(t => t.nextDate <= tomorrow);
}

/**
 * Возвращает информацию о предстоящих платежах
 */
export async function getUpcomingPayments(daysAhead: number = 7): Promise<DueTemplate[]> {
  const templates = await db.recurringTemplates
    .filter(t => t.isActive)
    .toArray();

  const now = Date.now();
  const cutoff = now + (daysAhead * MS_PER_DAY);

  const result: DueTemplate[] = [];

  for (const template of templates) {
    if (template.nextDate <= cutoff) {
      const daysUntilDue = getDaysUntilDue(template.nextDate);
      result.push({
        template,
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
      });
    }
  }

  return result.sort((a, b) => a.template.nextDate - b.template.nextDate);
}

// ==================== Transaction Processing ====================

/**
 * Создаёт транзакцию из шаблона
 */
async function createTransactionFromTemplate(
  template: RecurringTemplate
): Promise<number> {
  const transactionId = await addTransaction({
    amount: template.amount,
    type: template.type,
    categoryId: template.categoryId,
    date: Date.now(),
    currency: 'RUB',
    rate: 1,
    comment: template.comment,
    templateId: template.id,
  });

  return transactionId;
}

/**
 * Обрабатывает все просроченные шаблоны
 * Создаёт транзакции и обновляет даты
 */
export async function processDueTemplates(): Promise<{
  processed: number;
  transactions: number[];
  errors: Array<{ templateId: number; error: string }>;
}> {
  const dueTemplates = await getDueTemplates();
  const result = {
    processed: 0,
    transactions: [] as number[],
    errors: [] as Array<{ templateId: number; error: string }>,
  };

  for (const template of dueTemplates) {
    try {
      // Create one transaction per missed period (backfill)
      let nextDate = template.nextDate;
      const now = Date.now();

      while (nextDate <= now) {
        const transactionId = await addTransaction({
          amount: template.amount,
          type: template.type,
          categoryId: template.categoryId,
          date: nextDate,
          currency: 'RUB',
          rate: 1,
          comment: template.comment,
          templateId: template.id,
        });
        result.transactions.push(transactionId);
        nextDate = getNextDate(nextDate, template.interval);
      }

      await db.recurringTemplates.update(template.id!, { nextDate });
      result.processed++;
    } catch (error) {
      result.errors.push({
        templateId: template.id!,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Принудительно создаёт транзакцию из шаблона (без обновления даты)
 */
export async function createManualTransactionFromTemplate(
  templateId: number
): Promise<number> {
  const template = await db.recurringTemplates.get(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  return createTransactionFromTemplate(template);
}

// ==================== Statistics ====================

export async function getRecurringStats(): Promise<{
  totalTemplates: number;
  activeTemplates: number;
  totalMonthlyAmount: number;
  byCategory: Array<{ categoryId: string; amount: number }>;
}> {
  const templates = await db.recurringTemplates.toArray();
  const activeTemplates = templates.filter(t => t.isActive);

  // Конвертируем все интервалы в месячную сумму
  const monthlyByCategory = new Map<string, number>();

  for (const template of activeTemplates) {
    let monthlyAmount = template.amount;

    switch (template.interval) {
      case 'daily':
        monthlyAmount *= 30;
        break;
      case 'weekly':
        monthlyAmount *= 4.33;
        break;
      case 'yearly':
        monthlyAmount /= 12;
        break;
      // monthly остаётся как есть
    }

    if (template.type === 'expense') {
      const current = monthlyByCategory.get(template.categoryId) || 0;
      monthlyByCategory.set(template.categoryId, current + monthlyAmount);
    }
  }

  const byCategory = Array.from(monthlyByCategory.entries()).map(
    ([categoryId, amount]) => ({ categoryId, amount })
  );

  const totalMonthlyAmount = byCategory.reduce((sum, c) => sum + c.amount, 0);

  return {
    totalTemplates: templates.length,
    activeTemplates: activeTemplates.length,
    totalMonthlyAmount,
    byCategory,
  };
}
