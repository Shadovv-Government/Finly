// src/db/seed.ts
import { db } from './db';
import { Category } from './types';

export const defaultCategories: Category[] = [
  // Расходы
  { id: 'cat_food', name: 'Еда', type: 'expense', icon: 'Utensils', color: '#FF5722', isSystem: true },
  { id: 'cat_transport', name: 'Транспорт', type: 'expense', icon: 'Car', color: '#2196F3', isSystem: true },
  { id: 'cat_home', name: 'Жильё', type: 'expense', icon: 'Home', color: '#795548', isSystem: true },
  { id: 'cat_fun', name: 'Развлечения', type: 'expense', icon: 'PartyPopper', color: '#E91E63', isSystem: true },
  // Доходы
  { id: 'inc_salary', name: 'Зарплата', type: 'income', icon: 'Wallet', color: '#4CAF50', isSystem: true },
  { id: 'inc_gift', name: 'Подарок', type: 'income', icon: 'Gift', color: '#9C27B0', isSystem: true },
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

/**
 * Миграция данных при обновлении схемы БД
 */
export async function migrateDatabase() {
  console.log('Running database migrations...');

  // Миграция 1: Добавление tags к транзакциям без tags
  const transactions = await db.transactions.toArray();
  const txUpdates = transactions
    .filter(t => !t.tags)
    .map(t => ({ id: t.id!, tags: [] as string[] }));

  if (txUpdates.length > 0) {
    await Promise.all(txUpdates.map(u => db.transactions.update(u.id, { tags: u.tags })));
    console.log(`Migrated ${txUpdates.length} transactions: added empty tags`);
  }

  // Миграция 2: Добавление notificationsEnabled к бюджетам
  const budgets = await db.budgets.toArray();
  const budgetUpdates = budgets
    .filter(b => b.notificationsEnabled === undefined)
    .map(b => ({ id: b.id!, notificationsEnabled: true }));

  if (budgetUpdates.length > 0) {
    await Promise.all(budgetUpdates.map(u => db.budgets.update(u.id, { notificationsEnabled: u.notificationsEnabled })));
    console.log(`Migrated ${budgetUpdates.length} budgets: added notificationsEnabled`);
  }

  // Миграция 3: Добавление createdBy к AI паттернам
  const aiPatterns = await db.aiPatterns.toArray();
  const patternUpdates = aiPatterns
    .filter(p => !p.createdBy)
    .map(p => ({ id: p.id!, createdBy: 'ai' as const }));

  if (patternUpdates.length > 0) {
    await Promise.all(patternUpdates.map(u => db.aiPatterns.update(u.id, { createdBy: u.createdBy })));
    console.log(`Migrated ${patternUpdates.length} AI patterns: added createdBy`);
  }

  // Миграция 4: Обновление пользователей — добавление lastActiveAt
  const users = await db.users.toArray();
  const userUpdates = users
    .filter(u => !u.lastActiveAt)
    .map(u => ({ id: u.id!, lastActiveAt: u.createdAt }));

  if (userUpdates.length > 0) {
    await Promise.all(userUpdates.map(u => db.users.update(u.id, { lastActiveAt: u.lastActiveAt })));
    console.log(`Migrated ${userUpdates.length} users: added lastActiveAt`);
  }

  // Миграция 5: Добавление monthlyNeeded к целям
  const goals = await db.goals.toArray();
  const goalUpdates = goals
    .filter(g => g.monthlyNeeded === undefined && g.deadline && g.targetAmount > g.currentAmount)
    .map(g => {
      const monthsLeft = Math.max(1, (g.deadline! - Date.now()) / (1000 * 60 * 60 * 24 * 30));
      return {
        id: g.id!,
        monthlyNeeded: Math.ceil((g.targetAmount - g.currentAmount) / monthsLeft),
      };
    });

  if (goalUpdates.length > 0) {
    await Promise.all(goalUpdates.map(u => db.goals.update(u.id, { monthlyNeeded: u.monthlyNeeded })));
    console.log(`Migrated ${goalUpdates.length} goals: added monthlyNeeded`);
  }

  console.log('Database migrations complete');
}

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
    // Миграция: обновить старые эмодзи на новые иконки
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
  }
}