export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  comment: string;
  date: Date;
  time: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  spent: number;
  period: 'month' | 'week';
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: Date;
  color: string;
}

export const categories: Category[] = [
  { id: '1', name: 'Продукты', icon: 'ShoppingCart', color: '#10b981', type: 'expense' },
  { id: '2', name: 'Транспорт', icon: 'Car', color: '#3b82f6', type: 'expense' },
  { id: '3', name: 'Кафе и рестораны', icon: 'Coffee', color: '#f59e0b', type: 'expense' },
  { id: '4', name: 'Развлечения', icon: 'Gamepad2', color: '#ec4899', type: 'expense' },
  { id: '5', name: 'Здоровье', icon: 'Heart', color: '#ef4444', type: 'expense' },
  { id: '6', name: 'Одежда', icon: 'Shirt', color: '#8b5cf6', type: 'expense' },
  { id: '7', name: 'Дом', icon: 'Home', color: '#14b8a6', type: 'expense' },
  { id: '8', name: 'Образование', icon: 'GraduationCap', color: '#6366f1', type: 'expense' },
  { id: '9', name: 'Зарплата', icon: 'Wallet', color: '#22c55e', type: 'income' },
  { id: '10', name: 'Фриланс', icon: 'Briefcase', color: '#0ea5e9', type: 'income' },
  { id: '11', name: 'Подарки', icon: 'Gift', color: '#f97316', type: 'income' },
  { id: '12', name: 'Инвестиции', icon: 'TrendingUp', color: '#06b6d4', type: 'income' },
];

export const transactions: Transaction[] = [
  {
    id: '1',
    type: 'expense',
    amount: 450,
    category: '3',
    comment: 'Кофе в Старбаксе',
    date: new Date(2026, 2, 20),
    time: '09:30'
  },
  {
    id: '2',
    type: 'expense',
    amount: 2500,
    category: '1',
    comment: 'Продукты в Перекрестке',
    date: new Date(2026, 2, 20),
    time: '14:20'
  },
  {
    id: '3',
    type: 'expense',
    amount: 150,
    category: '2',
    comment: 'Метро',
    date: new Date(2026, 2, 19),
    time: '08:15'
  },
  {
    id: '4',
    type: 'income',
    amount: 85000,
    category: '9',
    comment: 'Зарплата март',
    date: new Date(2026, 2, 15),
    time: '10:00'
  },
  {
    id: '5',
    type: 'expense',
    amount: 1200,
    category: '4',
    comment: 'Кино',
    date: new Date(2026, 2, 18),
    time: '19:00'
  },
  {
    id: '6',
    type: 'expense',
    amount: 3500,
    category: '6',
    comment: 'Джинсы',
    date: new Date(2026, 2, 17),
    time: '16:45'
  },
  {
    id: '7',
    type: 'expense',
    amount: 890,
    category: '3',
    comment: 'Обед с коллегами',
    date: new Date(2026, 2, 17),
    time: '13:00'
  },
  {
    id: '8',
    type: 'income',
    amount: 15000,
    category: '10',
    comment: 'Проект для стартапа',
    date: new Date(2026, 2, 16),
    time: '11:30'
  },
  {
    id: '9',
    type: 'expense',
    amount: 4200,
    category: '7',
    comment: 'Коммунальные услуги',
    date: new Date(2026, 2, 15),
    time: '12:00'
  },
  {
    id: '10',
    type: 'expense',
    amount: 680,
    category: '5',
    comment: 'Аптека',
    date: new Date(2026, 2, 14),
    time: '17:20'
  },
];

export const budgets: Budget[] = [
  { id: '1', categoryId: '1', limit: 15000, spent: 8400, period: 'month' },
  { id: '2', categoryId: '3', limit: 5000, spent: 4200, period: 'month' },
  { id: '3', categoryId: '2', limit: 3000, spent: 1850, period: 'month' },
  { id: '4', categoryId: '4', limit: 8000, spent: 3200, period: 'month' },
  { id: '5', categoryId: '7', limit: 20000, spent: 18500, period: 'month' },
];

export const goals: Goal[] = [
  {
    id: '1',
    name: 'Отпуск в Италии',
    target: 150000,
    current: 87000,
    deadline: new Date(2026, 6, 1),
    color: '#3b82f6'
  },
  {
    id: '2',
    name: 'Новый MacBook',
    target: 180000,
    current: 45000,
    deadline: new Date(2026, 8, 1),
    color: '#8b5cf6'
  },
  {
    id: '3',
    name: 'Резервный фонд',
    target: 300000,
    current: 125000,
    deadline: new Date(2026, 11, 31),
    color: '#10b981'
  },
];
