// src/db/operations/transactions.ts
// CRUD операции для транзакций

import { db } from '../db';
import { Transaction } from '../types';
import { validateTransaction, assertValid } from '../validators';

/**
 * Добавляет новую транзакцию с валидацией
 */
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<number> {
  const validation = validateTransaction(transaction);
  assertValid(validation, 'Transaction');

  const id = await db.transactions.add({
    ...transaction,
    createdAt: Date.now(),
  });
  return id;
}

/**
 * Получает транзакцию по ID
 */
export async function getTransaction(id: number): Promise<Transaction | undefined> {
  return db.transactions.get(id);
}

/**
 * Обновляет транзакцию с валидацией
 */
export async function updateTransaction(id: number, updates: Partial<Transaction>): Promise<void> {
  const validation = validateTransaction(updates, true);
  assertValid(validation, 'Transaction update');

  await db.transactions.update(id, updates);
}

/**
 * Удаляет транзакцию
 */
export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id);
}

/**
 * Получает транзакции за период
 */
export async function getTransactionsByPeriod(start: number, end: number): Promise<Transaction[]> {
  const results = await db.transactions
    .where('date')
    .between(start, end)
    .toArray();
  return results.sort((a, b) => b.date - a.date);
}

/**
 * Получает транзакции по категории
 */
export async function getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
  return db.transactions.where('categoryId').equals(categoryId).toArray();
}

/**
 * Получает все транзакции
 */
export async function getAllTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray();
}
