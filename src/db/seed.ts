// src/db/seed.ts
import { db } from './db';
import { Category } from './types';

export const defaultCategories: Category[] = [
  // Расходы
  { id: 'cat_food', name: 'Еда', type: 'expense', icon: '🍔', color: '#FF5722', isSystem: true },
  { id: 'cat_transport', name: 'Транспорт', type: 'expense', icon: '🚗', color: '#2196F3', isSystem: true },
  { id: 'cat_home', name: 'Жильё', type: 'expense', icon: '🏠', color: '#795548', isSystem: true },
  { id: 'cat_fun', name: 'Развлечения', type: 'expense', icon: '🎉', color: '#E91E63', isSystem: true },
  // Доходы
  { id: 'inc_salary', name: 'Зарплата', type: 'income', icon: '💰', color: '#4CAF50', isSystem: true },
  { id: 'inc_gift', name: 'Подарок', type: 'income', icon: '🎁', color: '#9C27B0', isSystem: true },
];

export async function seedDatabase() {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(defaultCategories);
    
    // Базовые настройки
    await db.settings.bulkAdd([
      { key: 'theme', value: 'light' },
      { key: 'baseCurrency', value: 'RUB' },
      { key: 'onboardingComplete', value: false },
    ]);
  }
}