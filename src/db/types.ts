// src/db/types.ts

export type TransactionType = 'income' | 'expense';
export type PeriodType = 'week' | 'month';
export type RecurringInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string; // uuid
  name: string;
  type: TransactionType;
  icon: string; // например, эмодзи или название иконки MUI
  color: string; // hex code
  isSystem: boolean; // нельзя удалить системные
  parentId?: string; // для подкатегорий (опционально)
}

export interface Transaction {
  id?: number; // autoIncrement
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: number; // timestamp для удобного индексирования
  comment: string;
  currency: string; // код валюты (RUB, USD)
  rate: number; // курс к базовой валюте на момент операции
  createdAt: number; // timestamp создания
  templateId?: number; // ссылка на шаблон, если создано автоматически
}

export interface Budget {
  id?: number;
  categoryId: string;
  amount: number;
  period: PeriodType;
  startDate: number; // timestamp начала периода
  currency: string;
}

export interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: number; // timestamp
  icon: string;
  color: string;
  isActive: boolean;
}

export interface RecurringTemplate {
  id?: number;
  amount: number;
  type: TransactionType;
  categoryId: string;
  interval: RecurringInterval;
  nextDate: number; // timestamp следующего платежа
  isActive: boolean;
  comment?: string;
}

export interface AppSettings {
  key: string; // primary key
  value: any;
}

export interface AIPattern {
  id?: number;
  pattern: string; // ключевое слово (например, "старбакс")
  categoryId: string;
  confidence: number; // уверенность модели (0-1)
  usageCount: number; // сколько раз сработало
}