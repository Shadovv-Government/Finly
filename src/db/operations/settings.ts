// src/db/operations/settings.ts
// CRUD операции для настроек

import { db } from '../db';

/**
 * Получает настройку по ключу
 */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const setting = await db.settings.get(key);
  return setting?.value;
}

/**
 * Устанавливает значение настройки
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

/**
 * Получает все настройки
 */
export async function getAllSettings(): Promise<Record<string, any>> {
  const settings = await db.settings.toArray();
  return settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, any>);
}
