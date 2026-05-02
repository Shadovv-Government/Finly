import { useEffect, useCallback } from 'react';
import {
  requestPermission,
  hasPermission,
  sendNotification,
  sendTransactionNotification,
  sendGoalAchievedNotification,
  sendBudgetOverrunNotification,
  sendGoalReminderNotification,
} from '../utils/notifications';
import {
  addNotification,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  clearReadNotifications,
  clearAllNotifications,
  clearExpiredNotifications,
} from '../../db/operations/notifications';

export function useNotifications() {
  // Запрос разрешения и очистка просроченных уведомлений при монтировании
  useEffect(() => {
    requestPermission();
    clearExpiredNotifications().catch(() => {});
  }, []);

  const notify = useCallback((title: string, body: string, icon?: string) => {
    sendNotification({ title, body, icon });
  }, []);

  const notifyTransaction = useCallback((
    type: 'income' | 'expense' | 'goal',
    amount: number,
    description: string
  ) => {
    sendTransactionNotification(type, amount, description);
  }, []);

  const notifyGoalAchieved = useCallback(async (goalName: string, goalId?: number) => {
    sendGoalAchievedNotification(goalName);
    await addNotification({
      type: 'goal-done',
      title: `Цель достигнута: ${goalName}`,
      subtitle: 'Поздравляем! Вы достигли своей цели',
      icon: 'CheckCircle2',
      iconColor: 'text-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      data: goalId ? { goalId } : undefined,
      read: false,
      createdAt: Date.now(),
    });
  }, []);

  const notifyBudgetOverrun = useCallback(async (
    categoryName: string,
    spent: number,
    limit: number,
    categoryId?: number,
  ) => {
    sendBudgetOverrunNotification(categoryName, spent, limit);
    await addNotification({
      type: 'budget-overrun',
      title: 'Бюджет превышен',
      subtitle: `${categoryName}: потрачено ${spent.toLocaleString('ru-RU')} ₽ из ${limit.toLocaleString('ru-RU')} ₽`,
      icon: 'AlertTriangle',
      iconColor: 'text-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      data: categoryId ? { categoryId } : undefined,
      read: false,
      createdAt: Date.now(),
    });
  }, []);

  const notifyGoalReminder = useCallback((
    goalName: string,
    monthlyAmount: number
  ) => {
    sendGoalReminderNotification(goalName, monthlyAmount);
  }, []);

  return {
    hasPermission: hasPermission(),
    notify,
    notifyTransaction,
    notifyGoalAchieved,
    notifyBudgetOverrun,
    notifyGoalReminder,
    // Persist operations
    getUnreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    deleteNotification,
    clearReadNotifications,
    clearAllNotifications,
  };
}
