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
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  clearReadNotifications,
  clearAllNotifications,
} from '../../db/operations/notifications';

export function useNotifications() {
  // Запрос разрешения при монтировании
  useEffect(() => {
    requestPermission();
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

  const notifyGoalAchieved = useCallback((goalName: string) => {
    sendGoalAchievedNotification(goalName);
  }, []);

  const notifyBudgetOverrun = useCallback((
    categoryName: string,
    spent: number,
    limit: number
  ) => {
    sendBudgetOverrunNotification(categoryName, spent, limit);
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
