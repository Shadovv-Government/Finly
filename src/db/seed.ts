// src/db/seed.ts
import { db } from './db';
import { Category } from './types';

export const defaultCategories: Category[] = [
  // Расходы
  { id: 'cat_food',          name: 'Еда',          type: 'expense', icon: 'Utensils',      color: '#FF5722', isSystem: true },
  { id: 'cat_groceries',     name: 'Продукты',      type: 'expense', icon: 'ShoppingBasket', color: '#8BC34A', isSystem: true },
  { id: 'cat_transport',     name: 'Транспорт',     type: 'expense', icon: 'Car',            color: '#2196F3', isSystem: true },
  { id: 'cat_home',          name: 'Аренда',        type: 'expense', icon: 'Home',           color: '#795548', isSystem: true },
  { id: 'cat_utilities',     name: 'Коммунальные',  type: 'expense', icon: 'Zap',            color: '#FF9800', isSystem: true },
  { id: 'cat_health',        name: 'Здоровье',      type: 'expense', icon: 'Heart',          color: '#E91E63', isSystem: true },
  { id: 'cat_shopping',      name: 'Шопинг',        type: 'expense', icon: 'ShoppingBag',    color: '#9C27B0', isSystem: true },
  { id: 'cat_fun',           name: 'Развлечения',   type: 'expense', icon: 'PartyPopper',    color: '#AB47BC', isSystem: true },
  { id: 'cat_other_expense', name: 'Другое',        type: 'expense', icon: 'CircleHelp',     color: '#9E9E9E', isSystem: true },
  // Доходы
  { id: 'inc_salary',      name: 'Зарплата',    type: 'income', icon: 'Wallet',      color: '#4CAF50', isSystem: true },
  { id: 'inc_investments', name: 'Инвестиции',  type: 'income', icon: 'TrendingUp',  color: '#00BCD4', isSystem: true },
  { id: 'inc_gift',        name: 'Подарок',     type: 'income', icon: 'Gift',        color: '#9C27B0', isSystem: true },
  { id: 'inc_other',       name: 'Другое',      type: 'income', icon: 'CircleHelp',  color: '#9E9E9E', isSystem: true },
];

// Маппинг старых эмодзи на новые иконки
const emojiToIconMap: Record<string, string> = {
  '🍔': 'Utensils',
  '🛒': 'ShoppingBasket',
  '🚗': 'Car',
  '🏠': 'Home',
  '⚡️': 'Zap',
  '❤️': 'Heart',
  '🛍': 'ShoppingBag',
  '🎉': 'PartyPopper',
  '💰': 'Wallet',
  '📈': 'TrendingUp',
  '🎁': 'Gift',
  '🎯': 'Target',
}; 

export async function seedDatabase() {
  const count = await db.categories.count();

  if (count === 0) {
    // Первая инициализация БД — только категории.
    // theme/baseCurrency хранятся в localStorage (ThemeContext, SettingsContext).
    // onboardingComplete не сеялся: AuthContext читает из DB и корректно обрабатывает undefined → false,
    // а write-lock на settings блокировал getSetting() в loadUser() на 8+ секунд.
    await db.categories.bulkAdd(defaultCategories);
  } else {
    const categories = await db.categories.toArray();
    const existingIds = new Set(categories.map(c => c.id));

    // Миграция 1: обновить старые эмодзи на новые иконки
    const iconUpdates: Array<{ id: string; icon: string }> = [];
    categories.forEach(category => {
      const newIcon = emojiToIconMap[category.icon];
      if (newIcon && category.icon !== newIcon) {
        iconUpdates.push({ id: category.id, icon: newIcon });
      }
    });
    if (iconUpdates.length > 0) {
      await Promise.all(
        iconUpdates.map(u => db.categories.update(u.id, { icon: u.icon }))
      );
      console.log(`Migrated ${iconUpdates.length} categories from emoji to SVG icons`);
    }

    // Миграция 2: добавить категории если их нет
    const missingCategories = defaultCategories.filter(c => !existingIds.has(c.id));
    if (missingCategories.length > 0) {
      await db.categories.bulkAdd(missingCategories);
      console.log(`Added ${missingCategories.length} missing default categories`);
    }

    // Миграция 3: переименовать "Жильё" → "Аренда" для совместимости с ML-моделью
    const home = categories.find(c => c.id === 'cat_home');
    if (home && home.name === 'Жильё') {
      await db.categories.update('cat_home', { name: 'Аренда' });
      console.log('Renamed "Жильё" → "Аренда" for ML compatibility');
    }
  }
}
