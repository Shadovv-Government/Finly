// src/app/hooks/useNotificationPanel.ts
// Хук для генерации и управления уведомлениями панели уведомлений

import { useMemo, useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Target, Bell, Clock, TrendingUp, Copy, Calendar } from 'lucide-react';
import { useBudgets } from './useBudgets';
import { useGoals } from './useGoals';
import { useAnalytics, getPeriodRange } from './useAnalytics';
import { useTransactions } from './useTransactions';
import {
  getAllNotifications,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  clearReadNotifications,
} from '../../db/operations/notifications';
import { getUpcomingPayments } from '../../db/recurring';
import type { NotificationItem, NotificationType } from '../../db/types';
import { MS_PER_DAY } from '../constants';
import React from 'react';

export interface PanelNotification extends NotificationItem {
  actionLabel?: string;
  actionData?: string; // route or action identifier
}

export function useNotificationPanel() {
  const { budgets } = useBudgets();
  const { goals } = useGoals();
  const { expensesByCategory } = useAnalytics({ period: 'month' });
  const { transactions } = useTransactions({ period: 'month', ...getPeriodRange('month') });
  const [persistedNotifications, setPersistedNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load persisted notifications
  const loadNotifications = useCallback(async () => {
    const [all, count] = await Promise.all([
      getAllNotifications(),
      getUnreadCount(),
    ]);
    setPersistedNotifications(all);
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Generate dynamic notifications
  const dynamicNotifications = useMemo<PanelNotification[]>(() => {
    const items: PanelNotification[] = [];
    const now = Date.now();

    // --- Budget alerts ---
    for (const budget of budgets) {
      const spent = expensesByCategory.find(e => e.categoryId === budget.categoryId)?.amount ?? 0;
      const ratio = budget.amount > 0 ? spent / budget.amount : 0;

      if (ratio >= 1) {
        items.push({
          type: 'budget-overrun',
          title: 'Бюджет превышен',
          subtitle: `Потрачено ${spent.toLocaleString('ru-RU')} ₽ при лимите ${budget.amount.toLocaleString('ru-RU')} ₽`,
          icon: 'AlertTriangle',
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          data: { categoryId: budget.categoryId },
          read: false,
          createdAt: now,
          actionLabel: 'Изменить бюджет',
          actionData: `/budgets`,
        });
      } else if (ratio >= 0.8) {
        items.push({
          type: 'budget-warning',
          title: 'Бюджет почти исчерпан',
          subtitle: `Использовано ${Math.round(ratio * 100)}% лимита — осталось ${(budget.amount - spent).toLocaleString('ru-RU')} ₽`,
          icon: 'AlertTriangle',
          iconColor: 'text-amber-500',
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          data: { categoryId: budget.categoryId },
          read: false,
          createdAt: now,
          actionLabel: 'Посмотреть',
          actionData: `/budgets`,
        });
      }
    }

    // --- Goal alerts ---
    for (const goal of goals) {
      if (!goal.isActive) continue;
      const ratio = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;

      if (ratio >= 1) {
        items.push({
          type: 'goal-done',
          title: `Цель достигнута: ${goal.name}`,
          subtitle: `Накоплено ${goal.currentAmount.toLocaleString('ru-RU')} ₽`,
          icon: 'CheckCircle2',
          iconColor: 'text-green-500',
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          data: { goalId: goal.id },
          read: false,
          createdAt: now,
          actionLabel: 'Открыть цели',
          actionData: `/goals`,
        });
      } else if (ratio >= 0.8) {
        items.push({
          type: 'goal-near',
          title: `Почти у цели: ${goal.name}`,
          subtitle: `Накоплено ${Math.round(ratio * 100)}% — осталось ${(goal.targetAmount - goal.currentAmount).toLocaleString('ru-RU')} ₽`,
          icon: 'Target',
          iconColor: 'text-violet-500',
          iconBg: 'bg-violet-100 dark:bg-violet-900/30',
          data: { goalId: goal.id },
          read: false,
          createdAt: now,
          actionLabel: 'Пополнить',
          actionData: `/goals`,
        });
      }

      // Deadline-based alerts
      if (goal.deadline && goal.isActive) {
        const daysLeft = Math.ceil((goal.deadline - now) / MS_PER_DAY);
        const remaining = goal.targetAmount - goal.currentAmount;

        if (daysLeft > 0 && daysLeft <= 7 && remaining > 0) {
          items.push({
            type: 'goal-deadline',
            title: `Дедлайн через ${daysLeft} дн.: ${goal.name}`,
            subtitle: `Не хватает ${remaining.toLocaleString('ru-RU')} ₽`,
            icon: 'Calendar',
            iconColor: 'text-orange-500',
            iconBg: 'bg-orange-100 dark:bg-orange-900/30',
            data: { goalId: goal.id },
            read: false,
            createdAt: now,
            actionLabel: 'Пополнить',
            actionData: `/goals`,
          });
        } else if (daysLeft <= 0 && remaining > 0 && ratio < 1) {
          items.push({
            type: 'goal-deadline',
            title: `Дедлайн прошёл: ${goal.name}`,
            subtitle: `Не накоплено ${remaining.toLocaleString('ru-RU')} ₽`,
            icon: 'AlertTriangle',
            iconColor: 'text-red-500',
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            data: { goalId: goal.id },
            read: false,
            createdAt: now,
            actionLabel: 'Открыть цели',
            actionData: `/goals`,
          });
        }
      }
    }

    // --- Recurring payments ---
    // Due today
    // We fetch them async below; for now, we'll add a placeholder that gets updated

    // --- Anomalous expenses ---
    if (transactions.length > 5) {
      const expenses = transactions.filter(t => t.type === 'expense');
      const amounts = expenses.map(t => t.amount);
      const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / amounts.length
      );

      for (const tx of expenses) {
        // Flag if amount is > 2 standard deviations above mean
        if (stdDev > 0 && tx.amount > avg + 2 * stdDev) {
          items.push({
            type: 'anomalous-expense',
            title: 'Крупная трата',
            subtitle: `${tx.amount.toLocaleString('ru-RU')} ₽ — выше среднего (${Math.round(avg).toLocaleString('ru-RU')} ₽)`,
            icon: 'TrendingUp',
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            data: { transactionId: tx.id },
            read: false,
            createdAt: now,
            actionLabel: 'Посмотреть',
            actionData: `/history`,
          });
        }
      }

      // Duplicate detection: same amount within 1 hour
      const sorted = [...expenses].sort((a, b) => a.date - b.date);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const timeDiff = Math.abs(curr.date - prev.date);

        if (curr.amount === prev.amount && curr.categoryId === prev.categoryId && timeDiff < 3600000) {
          items.push({
            type: 'duplicate-transaction',
            title: 'Возможный дубликат',
            subtitle: `${curr.amount.toLocaleString('ru-RU')} ₽ — 2 операции за час`,
            icon: 'Copy',
            iconColor: 'text-yellow-600',
            iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
            data: { transactionId: curr.id },
            read: false,
            createdAt: now,
            actionLabel: 'Проверить',
            actionData: `/history`,
          });
        }
      }
    }

    return items;
  }, [budgets, goals, expensesByCategory, transactions]);

  // Fetch recurring payments async and merge
  const [recurringItems, setRecurringItems] = useState<PanelNotification[]>([]);

  useEffect(() => {
    const loadRecurring = async () => {
      const upcoming = await getUpcomingPayments(3); // next 3 days
      const now = Date.now();

      const items: PanelNotification[] = upcoming.map(payment => {
        const isDueToday = payment.daysUntilDue === 0 || payment.daysUntilDue < 0;
        return {
          type: isDueToday ? 'recurring-due' : 'recurring-upcoming' as NotificationType,
          title: isDueToday
            ? `Сегодня: ${payment.template.comment || 'Платёж'}`
            : `Через ${Math.abs(payment.daysUntilDue)} дн.: ${payment.template.comment || 'Платёж'}`,
          subtitle: `${payment.template.amount.toLocaleString('ru-RU')} ₽${payment.isOverdue ? ' (просрочено)' : ''}`,
          icon: 'Clock',
          iconColor: isDueToday ? 'text-red-500' : 'text-blue-500',
          iconBg: isDueToday ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30',
          data: { templateId: payment.template.id },
          read: false,
          createdAt: now,
          actionLabel: isDueToday ? 'Создать сейчас' : 'Посмотреть',
          actionData: `/history`,
        };
      });

      setRecurringItems(items);
    };

    loadRecurring();
  }, []);

  // Merge all notifications: dynamic + recurring + persisted (read ones)
  const allNotifications = useMemo<PanelNotification[]>(() => {
    const dynamic = [...dynamicNotifications, ...recurringItems];
    const persistedRead = persistedNotifications.filter(n => n.read);

    // Merge: dynamic ones are "new" (unread), persisted read stay as history
    const merged: PanelNotification[] = [
      ...dynamic,
      ...persistedRead.map(p => ({
        ...p,
        actionLabel: undefined,
        actionData: undefined,
      })),
    ];

    // Sort by createdAt descending
    return merged.sort((a, b) => b.createdAt - a.createdAt);
  }, [dynamicNotifications, recurringItems, persistedNotifications]);

  const hasUnread = unreadCount > 0 || dynamicNotifications.length > 0 || recurringItems.some(r => !r.read);

  // Mark all as read and persist
  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsAsRead();
    // Also persist current dynamic ones as read
    for (const n of dynamicNotifications) {
      await addNotification({ ...n, read: true });
    }
    setUnreadCount(0);
    setPersistedNotifications(prev => prev.map(p => ({ ...p, read: true })));
  }, [dynamicNotifications]);

  // Mark single as read
  const handleMarkRead = useCallback(async (id: number) => {
    await markNotificationAsRead(id);
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Delete notification
  const handleDelete = useCallback(async (id: number) => {
    await deleteNotification(id);
    setPersistedNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear read notifications
  const handleClearRead = useCallback(async () => {
    await clearReadNotifications();
    setPersistedNotifications(prev => prev.filter(n => !n.read));
  }, []);

  return {
    notifications: allNotifications,
    hasUnread,
    unreadCount,
    markAllRead: handleMarkAllRead,
    markRead: handleMarkRead,
    deleteNotification: handleDelete,
    clearRead: handleClearRead,
    refresh: loadNotifications,
  };
}

// Icon mapping for rendering from string names
export const iconMap: Record<string, React.ReactNode> = {
  AlertTriangle: React.createElement(AlertTriangle, { className: 'w-5 h-5' }),
  CheckCircle2: React.createElement(CheckCircle2, { className: 'w-5 h-5' }),
  Target: React.createElement(Target, { className: 'w-5 h-5' }),
  Bell: React.createElement(Bell, { className: 'w-5 h-5' }),
  Clock: React.createElement(Clock, { className: 'w-5 h-5' }),
  TrendingUp: React.createElement(TrendingUp, { className: 'w-5 h-5' }),
  Copy: React.createElement(Copy, { className: 'w-5 h-5' }),
  Calendar: React.createElement(Calendar, { className: 'w-5 h-5' }),
};
