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
  comment?: string;
  currency: string; // код валюты (RUB, USD)
  rate: number; // курс к базовой валюте на момент операции
  createdAt: number; // timestamp создания
  templateId?: number; // ссылка на шаблон, если создано автоматически
  userId?: string; // FK → users.id (для многопользовательского режима)
  tags?: string[]; // теги для группировки и AI-аналитики
}

export interface Budget {
  id?: number;
  categoryId: string;
  amount: number;
  period: PeriodType;
  startDate: number; // timestamp начала периода
  endDate?: number; // timestamp конца периода (опционально)
  currency: string;
  monthlyLimit?: number; // лимит на месяц (для динамических бюджетов)
  notificationsEnabled?: boolean; // включать уведомления о перерасходе
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
  monthlyNeeded?: number; // сколько нужно откладывать в месяц
  monthlyContribution?: number; // фактические взносы за месяц
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
  type?: string; // тип значения (theme, currency, boolean...)
  updatedAt?: number; // timestamp последнего обновления
}

export interface AIPattern {
  id?: number;
  pattern: string; // ключевое слово (например, "старбакс")
  regex?: string; // регулярное выражение для сложных паттернов
  categoryId: string;
  confidence: number; // уверенность модели (0-1)
  usageCount: number; // сколько раз сработало
  lastUsed?: number; // timestamp последнего использования
  createdBy?: 'user' | 'ai'; // кто создал паттерн
}

export interface User {
  id: string; // primary key, uuid
  name: string;
  email?: string; // email пользователя (опционально)
  createdAt: number; // timestamp
  deviceId?: string; // идентификатор устройства
  avatarColor?: string; // цвет аватара (градиент)
  lastActiveAt?: number; // timestamp последней активности
}

export type NotificationType =
  | 'budget-overrun'
  | 'budget-warning'
  | 'goal-done'
  | 'goal-near'
  | 'goal-deadline'
  | 'recurring-due'
  | 'recurring-upcoming'
  | 'anomalous-expense'
  | 'duplicate-transaction';

export interface NotificationItem {
  id?: number;
  type: NotificationType;
  title: string;
  subtitle: string;
  icon: string; // lucide icon name
  iconColor: string; // tailwind color class for icon
  iconBg: string; // tailwind bg color for badge
  data?: Record<string, any>; // дополнительные данные (categoryId, goalId и т.д.)
  read: boolean;
  createdAt: number; // timestamp
  expiresAt?: number; // опционально: когда удалить
}