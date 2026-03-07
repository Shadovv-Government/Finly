// src/db/db.ts
import Dexie, { Table } from 'dexie';
import { 
  Transaction, Category, Budget, Goal, 
  RecurringTemplate, AppSettings, AIPattern 
} from './types';

class FinlyDatabase extends Dexie {
  // Объявляем таблицы как свойства класса
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, number>;
  goals!: Table<Goal, number>;
  recurringTemplates!: Table<RecurringTemplate, number>;
  settings!: Table<AppSettings, string>;
  aiPatterns!: Table<AIPattern, number>;

  constructor() {
    super('FinlyDB');
    
    // Версионирование схемы
    this.version(1).stores({
      // Транзакции: индексы для фильтрации по дате, категории и типу
      transactions: '++id, date, categoryId, type, createdAt', 
      
      // Категории: поиск по типу (доход/расход)
      categories: 'id, type, isSystem', 
      
      // Бюджеты: поиск по категории и периоду
      budgets: '++id, categoryId, period, startDate', 
      
      // Цели: фильтрация активных
      goals: '++id, isActive, deadline', 
      
      // Шаблоны: поиск по дате следующего платежа для автодобавления
      recurringTemplates: '++id, nextDate, isActive', 
      
      // Настройки: ключ-значение
      settings: 'key', 
      
      // AI паттерны: поиск по слову
      aiPatterns: '++id, pattern, categoryId', 
    });
  }
}

export const db = new FinlyDatabase();