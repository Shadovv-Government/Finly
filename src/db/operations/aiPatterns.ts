// src/db/operations/aiPatterns.ts
// CRUD операции для AI-паттернов

import { db } from '../db';
import { AIPattern } from '../types';

/**
 * Добавляет новый паттерн
 */
export async function addAIPattern(pattern: Omit<AIPattern, 'id' | 'usageCount'>): Promise<number> {
  const id = await db.aiPatterns.add({
    ...pattern,
    usageCount: 0,
  });
  return id;
}

/**
 * Получает паттерн по ID
 */
export async function getAIPattern(id: number): Promise<AIPattern | undefined> {
  return db.aiPatterns.get(id);
}

/**
 * Обновляет паттерн
 */
export async function updateAIPattern(id: number, updates: Partial<AIPattern>): Promise<void> {
  await db.aiPatterns.update(id, updates);
}

/**
 * Удаляет паттерн
 */
export async function deleteAIPattern(id: number): Promise<void> {
  await db.aiPatterns.delete(id);
}

/**
 * Получает все паттерны
 */
export async function getAIPatterns(): Promise<AIPattern[]> {
  return db.aiPatterns.toArray();
}
