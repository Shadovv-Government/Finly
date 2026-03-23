// src/db/operations/users.ts
// CRUD операции для пользователей

import { db } from '../db';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Создаёт нового пользователя с валидацией
 */
export async function createUser(name: string, deviceId?: string): Promise<string> {
  if (!name || name.trim().length === 0) {
    throw new Error('User name is required');
  }

  const id = uuidv4();
  await db.users.add({
    id,
    name,
    createdAt: Date.now(),
    deviceId,
  });
  return id;
}

/**
 * Получает текущего пользователя (первого в БД)
 */
export async function getCurrentUser(): Promise<User | undefined> {
  const users = await db.users.toArray();
  return users.length > 0 ? users[0] : undefined;
}

/**
 * Обновляет пользователя
 */
export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  await db.users.update(id, updates);
}

/**
 * Удаляет пользователя
 */
export async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
}

/**
 * Проверяет наличие пользователя
 */
export async function hasUser(): Promise<boolean> {
  const users = await db.users.toArray();
  return users.length > 0;
}
