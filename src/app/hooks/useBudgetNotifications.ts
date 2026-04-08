import { useCallback } from 'react';
import { getActiveBudgets } from '../../db/operations/budgets';
import { getExpensesByCategory } from '../../db/analytics';
import { getCategoriesByType } from '../../db/operations/categories';
import { addNotification, getAllNotifications } from '../../db/operations/notifications';
import {
  sendBudgetOverrunNotification,
  sendBudgetWarningNotification,
  hasPermission,
} from '../utils/notifications';
import { getPeriodRange } from './useAnalytics';

/**
 * Проверяет один бюджет и возвращает тип уведомления (или null).
 * Используется для дедупликации — не шлём повторное уведомление,
 * если за этот период уже было отправлено такое же.
 */
type BudgetAlertType = 'overrun' | 'warning' | null;

function getBudgetAlertType(spent: number, limit: number): BudgetAlertType {
  if (limit <= 0) return null;
  const ratio = spent / limit;
  if (ratio >= 1) return 'overrun';
  if (ratio >= 0.8) return 'warning';
  return null;
}

/**
 * Хук для отправки push-уведомлений о бюджетах.
 *
 * Проверяет все активные бюджеты за текущий месяц и отправляет push:
 *   — 100%+ : «Перерасход бюджета»
 *   — 80–100% : «Бюджет почти исчерпан»
 *
 * Использует прямые DB-операции (не другие хуки), чтобы избежать
 * проблем с async/загрузкой.
 */
export function useBudgetNotifications() {
  /**
   * Проверяет все активные бюджеты и отправляет push-уведомления.
   * Вызывается после добавления транзакции или вручную.
   */
  const checkBudgets = useCallback(async () => {
    if (!hasPermission()) return;

    const budgets = await getActiveBudgets();
    const { start, end } = getPeriodRange('month');
    const expenses = await getExpensesByCategory(start, end);
    const categories = await getCategoriesByType('expense');
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    for (const budget of budgets) {
      const spent = expenses.find(e => e.categoryId === budget.categoryId)?.amount ?? 0;
      const alertType = getBudgetAlertType(spent, budget.amount);
      if (!alertType) continue;

      const category = categoryMap.get(budget.categoryId);
      const categoryName = category?.name || 'Без категории';
      const percent = Math.round((spent / budget.amount) * 100);

      // Проверяем, нет ли уже такого уведомления в DB (дедупликация)
      const allNotifications = await getAllNotifications();
      const existingKey = alertType === 'overrun' ? 'budget-overrun' : 'budget-warning';
      const alreadySent = allNotifications.some(
        n =>
          n.type === existingKey &&
          n.data?.categoryId === budget.categoryId &&
          Date.now() - n.createdAt < 24 * 60 * 60 * 1000 // за последние 24 часа
      );
      if (alreadySent) continue;

      if (alertType === 'overrun') {
        sendBudgetOverrunNotification(categoryName, spent, budget.amount);
      } else {
        sendBudgetWarningNotification(categoryName, spent, budget.amount, percent);
      }

      // Сохраняем in-app уведомление
      await addNotification({
        type: existingKey,
        title:
          alertType === 'overrun'
            ? 'Бюджет превышен'
            : 'Бюджет почти исчерпан',
        subtitle:
          alertType === 'overrun'
            ? `${categoryName}: потрачено ${spent.toLocaleString('ru-RU')} ₽ из ${budget.amount.toLocaleString('ru-RU')} ₽`
            : `${categoryName}: использовано ${percent}% — осталось ${(budget.amount - spent).toLocaleString('ru-RU')} ₽`,
        icon: 'AlertTriangle',
        iconColor: alertType === 'overrun' ? 'text-red-500' : 'text-amber-500',
        iconBg:
          alertType === 'overrun'
            ? 'bg-red-100 dark:bg-red-900/30'
            : 'bg-amber-100 dark:bg-amber-900/30',
        data: { categoryId: budget.categoryId },
        read: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 дней
      });
    }
  }, []);

  return { checkBudgets };
}
