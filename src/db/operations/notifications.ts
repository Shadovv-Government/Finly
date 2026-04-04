// src/db/operations/notifications.ts
// CRUD операции для уведомлений

import { db } from '../db';
import { NotificationItem } from '../types';

/**
 * Добавляет новое уведомление
 */
export async function addNotification(
  notification: Omit<NotificationItem, 'id'>
): Promise<number> {
  return db.notifications.add(notification);
}

/**
 * Получает уведомление по ID
 */
export async function getNotification(id: number): Promise<NotificationItem | undefined> {
  return db.notifications.get(id);
}

/**
 * Получает все непрочитанные уведомления
 */
export async function getUnreadNotifications(): Promise<NotificationItem[]> {
  return db.notifications
    .where('read')
    .equals(0)
    .sortBy('createdAt');
}

/**
 * Получает все уведомления (сортировка по дате, новые сверху)
 */
export async function getAllNotifications(): Promise<NotificationItem[]> {
  return db.notifications
    .orderBy('createdAt')
    .reverse()
    .toArray();
}

/**
 * Помечает уведомление как прочитанное
 */
export async function markNotificationAsRead(id: number): Promise<void> {
  await db.notifications.update(id, { read: true });
}

/**
 * Помечает все уведомления как прочитанные
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await db.notifications
    .where('read')
    .equals(0)
    .modify({ read: true });
}

/**
 * Удаляет уведомление
 */
export async function deleteNotification(id: number): Promise<void> {
  await db.notifications.delete(id);
}

/**
 * Очищает все прочитанные уведомления
 */
export async function clearReadNotifications(): Promise<void> {
  await db.notifications
    .where('read')
    .equals(1)
    .delete();
}

/**
 * Очищает все уведомления
 */
export async function clearAllNotifications(): Promise<void> {
  await db.notifications.clear();
}

/**
 * Получает количество непрочитанных уведомлений
 */
export async function getUnreadCount(): Promise<number> {
  return db.notifications
    .where('read')
    .equals(0)
    .count();
}

/**
 * Удаляет просроченные уведомления (expiresAt < now)
 */
export async function clearExpiredNotifications(): Promise<void> {
  const now = Date.now();
  await db.notifications
    .where('expiresAt')
    .below(now)
    .delete();
}
