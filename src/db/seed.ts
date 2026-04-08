// src/db/seed.ts
import { db } from './db';
import { Category } from './types';

export const defaultCategories: Category[] = [
  // Расходы
  { id: 'cat_food', name: 'Еда', type: 'expense', icon: 'Utensils', color: '#FF5722', isSystem: true },
  { id: 'cat_transport', name: 'Транспорт', type: 'expense', icon: 'Car', color: '#2196F3', isSystem: true },
  { id: 'cat_home', name: 'Жильё', type: 'expense', icon: 'Home', color: '#795548', isSystem: true },
  { id: 'cat_fun', name: 'Развлечения', type: 'expense', icon: 'PartyPopper', color: '#E91E63', isSystem: true },
  { id: 'cat_other_expense', name: 'Другое', type: 'expense', icon: 'CircleHelp', color: '#9E9E9E', isSystem: true },
  // Доходы
  { id: 'inc_salary', name: 'Зарплата', type: 'income', icon: 'Wallet', color: '#4CAF50', isSystem: true },
  { id: 'inc_gift', name: 'Подарок', type: 'income', icon: 'Gift', color: '#9C27B0', isSystem: true },
  { id: 'inc_other', name: 'Другое', type: 'income', icon: 'CircleHelp', color: '#9E9E9E', isSystem: true },
];

// Маппинг старых эмодзи на новые иконки
const emojiToIconMap: Record<string, string> = {
  '🍔': 'Utensils',
  '🚗': 'Car',
  '🏠': 'Home',
  '🎉': 'PartyPopper',
  '💰': 'Wallet',
  '🎁': 'Gift',
  '🎯': 'Target',
};

export async function seedDatabase() {
  const count = await db.categories.count();

  if (count === 0) {
    // Первая инициализация БД
    await db.categories.bulkAdd(defaultCategories);

    // Базовые настройки
    await db.settings.bulkAdd([
      { key: 'theme', value: 'light' },
      { key: 'baseCurrency', value: 'RUB' },
      { key: 'onboardingComplete', value: false },
    ]);
  } else {
    // Миграция 1: обновить старые эмодзи на новые иконки
    const categories = await db.categories.toArray();
    const updates: Array<{ id: string; icon: string }> = [];

    categories.forEach(category => {
      const newIcon = emojiToIconMap[category.icon];
      if (newIcon && category.icon !== newIcon) {
        updates.push({ id: category.id, icon: newIcon });
      }
    });

    if (updates.length > 0) {
      await Promise.all(
        updates.map(update => db.categories.update(update.id, { icon: update.icon }))
      );
      console.log(`Migrated ${updates.length} categories from emoji to SVG icons`);
    }

    // Миграция 2: добавить категории "Другое" если их нет
    const existingIds = new Set(categories.map(c => c.id));
    const missingCategories = defaultCategories.filter(c => !existingIds.has(c.id));

    if (missingCategories.length > 0) {
      await db.categories.bulkAdd(missingCategories);
      console.log(`Added ${missingCategories.length} missing default categories`);
    }
  }
}