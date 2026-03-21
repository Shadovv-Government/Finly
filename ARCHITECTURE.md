# Архитектура Finly

## 1. Общая концепция

- **Тип приложения:** Progressive Web App (PWA) — работает в браузере и устанавливается на устройство
- **Backend отсутствует:** всё хранится локально на клиенте, нет серверных API-запросов
- **Offline-first:** приложение полностью функционально без подключения к интернету
- **Платформы:** мобильные и десктопные устройства (responsive-вёрстка)

---

## 2. Стек технологий

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| TypeScript | ^5.4.5 | Строгая типизация |
| React | ^18.3.1 | UI-фреймворк |
| React Router | ^7.13.1 | Клиентская маршрутизация |
| Zustand | ^4.5.2 | Глобальное состояние |
| Radix UI | 0.487.0 | Headless UI-компоненты |
| shadcn/ui | — | Готовые компоненты |
| Tailwind CSS | 4.1.12 | Утилитарные стили |
| Recharts | 2.15.2 | Графики и визуализация |
| Chart.js | ^4.4.2 | Альтернативная библиотека графиков |
| Lucide React | 0.487.0 | Иконки |
| Material Icons | ^5.15.15 | Дополнительные иконки |
| Motion | 12.23.24 | Анимации |

### Хранение данных
- **IndexedDB** — браузерная NoSQL-база (key-value + индексы)
- **Dexie.js** ^3.2.7 — ORM-обёртка над IndexedDB

### PWA
- **Vite** 6.3.5 — сборщик проекта
- **vite-plugin-pwa** ^1.2.0 — генерация Service Worker и Manifest
- **Workbox** ^7.1.0 — стратегии кэширования

### Инфраструктура
- **GitHub** — хостинг кода
- **Vercel** — хостинг приложения

---

## 3. Слои архитектуры

```
┌──────────────────────────────────────────────┐
│              UI Layer (React)                │
│   Screens → Layout → Components → BottomNav  │
├──────────────────────────────────────────────┤
│        Context Layer                         │
│   ThemeContext (light/dark/system)           │
│   AuthContext (user profile, registration)   │
├──────────────────────────────────────────────┤
│        Routing Layer                         │
│   react-router-dom (ProtectedRoute)          │
├──────────────────────────────────────────────┤
│        Data Access Layer  (src/db/)          │
│   operations.ts → analytics.ts → ai.ts       │
│   recurring.ts → exportImport.ts             │
│              ↓                               │
│           Dexie.js ORM                       │
├──────────────────────────────────────────────┤
│        Storage Layer                         │
│   IndexedDB → FinlyDB (8 таблиц)             │
├──────────────────────────────────────────────┤
│        PWA Layer                             │
│   Service Worker (Workbox) + Manifest        │
└──────────────────────────────────────────────┘
```

---

## 4. Схема базы данных (`FinlyDB`)

База данных объявлена в классе `FinlyDatabase extends Dexie` (`src/db/db.ts`).

| Таблица | Primary Key | Индексы | Назначение |
|---------|-------------|---------|------------|
| `transactions` | `++id` (auto) | `date, categoryId, type, createdAt` | Финансовые операции |
| `categories` | `id` (string) | `type, isSystem` | Категории с иконкой и цветом |
| `budgets` | `++id` (auto) | `categoryId, period, startDate` | Лимиты по категориям |
| `goals` | `++id` (auto) | `isActive, deadline` | Финансовые цели |
| `recurringTemplates` | `++id` (auto) | `nextDate, isActive` | Шаблоны платежей |
| `settings` | `key` (string) | — | KV-хранилище настроек |
| `aiPatterns` | `++id` (auto) | `pattern, categoryId` | Паттерны AI-категоризации |
| `users` | `id` (string) | `createdAt` | Профиль пользователя |

---

## 5. Модели данных (`src/db/types.ts`)

### Перечисления
```typescript
type TransactionType = 'income' | 'expense';
type PeriodType = 'week' | 'month';
type RecurringInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';
```

### Основные интерфейсы

**`Category`**
```typescript
{
  id: string;           // uuid
  name: string;
  type: TransactionType;
  icon: string;         // название иконки Lucide (Utensils, Car, Home...)
  color: string;        // hex code (#FF5722)
  isSystem: boolean;    // нельзя удалить
  parentId?: string;    // для подкатегорий
}
```

**`Transaction`**
```typescript
{
  id?: number;          // autoIncrement
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: number;         // timestamp
  comment?: string;
  currency: string;     // RUB, USD
  rate: number;         // курс к базовой валюте
  createdAt: number;    // timestamp создания
  templateId?: number;  // ссылка на шаблон
}
```

**`Budget`**
```typescript
{
  id?: number;
  categoryId: string;
  amount: number;
  period: PeriodType;
  startDate: number;    // timestamp начала периода
  currency: string;
}
```

**`Goal`**
```typescript
{
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: number;
  icon: string;
  color: string;
  isActive: boolean;
}
```

**`RecurringTemplate`**
```typescript
{
  id?: number;
  amount: number;
  type: TransactionType;
  categoryId: string;
  interval: RecurringInterval;
  nextDate: number;     // timestamp следующего платежа
  isActive: boolean;
  comment?: string;
}
```

**`AppSettings`**
```typescript
{
  key: string;          // primary key
  value: any;
}
```

**`AIPattern`**
```typescript
{
  id?: number;
  pattern: string;      // ключевое слово
  categoryId: string;
  confidence: number;   // 0-1
  usageCount: number;
}
```

**`User`**
```typescript
{
  id: string;           // uuid
  name: string;
  createdAt: number;
  deviceId?: string;    // navigator.userAgent
  avatarColor?: string;
}
```

---

## 6. Структура модуля `src/db/`

```
src/db/
├── types.ts           — TypeScript-интерфейсы
├── db.ts              — Класс Dexie, схема БД (singleton)
├── seed.ts            — Начальное заполнение (категории, настройки)
├── operations.ts      — CRUD-функции для всех таблиц
├── analytics.ts       — Аналитика для графиков и дашбордов
├── ai.ts              — Авто-категоризация и рекомендации
├── recurring.ts       — Обработка повторяющихся платежей
├── exportImport.ts    — Экспорт/импорт (JSON, CSV)
├── validators.ts      — Валидация данных
└── readme.md          — Документация по БД
```

### Инициализация при первом запуске (`seed.ts`)

При первом открытии `seedDatabase()` проверяет таблицу `categories`:

**Если пуста — создаёт стартовые данные:**

**Категории расходов:**
| ID | Название | Иконка | Цвет |
|----|----------|--------|------|
| `cat_food` | Еда | Utensils | #FF5722 |
| `cat_transport` | Транспорт | Car | #2196F3 |
| `cat_home` | Жильё | Home | #795548 |
| `cat_fun` | Развлечения | PartyPopper | #E91E63 |

**Категории доходов:**
| ID | Название | Иконка | Цвет |
|----|----------|--------|------|
| `inc_salary` | Зарплата | Wallet | #4CAF50 |
| `inc_gift` | Подарок | Gift | #9C27B0 |

**Настройки по умолчанию:**
- `theme`: `'light'`
- `baseCurrency`: `'RUB'`
- `onboardingComplete`: `false`

**Миграция иконок:** если в БД есть категории со старыми эмодзи-иконками (🍔, 🚗...), они автоматически заменяются на названия иконок Lucide (Utensils, Car...).

---

## 7. Модули слоя данных

### 7.1 `operations.ts` — CRUD операции

| Сущность | Функции |
|----------|---------|
| **Transactions** | `addTransaction`, `getTransaction`, `updateTransaction`, `deleteTransaction`, `getTransactionsByPeriod`, `getTransactionsByCategory`, `getAllTransactions`, `getCurrentUser` |
| **Categories** | `addCategory`, `getCategory`, `updateCategory`, `deleteCategory`, `getCategories`, `getCategoriesByType`, `getExpenseCategories`, `getIncomeCategories` |
| **Budgets** | `addBudget`, `getBudget`, `updateBudget`, `deleteBudget`, `getBudgetByCategory`, `getActiveBudgets` |
| **Goals** | `addGoal`, `getGoal`, `updateGoal`, `deleteGoal`, `getGoals`, `getActiveGoals`, `contributeToGoal` |
| **Recurring** | `addRecurringTemplate`, `getRecurringTemplate`, `updateRecurringTemplate`, `deleteRecurringTemplate`, `getActiveRecurringTemplates` |
| **Settings** | `getSetting`, `setSetting`, `getAllSettings` |
| **AI Patterns** | `addAIPattern`, `getAIPattern`, `updateAIPattern`, `deleteAIPattern` |
| **Users** | `createUser`, `getUser`, `updateUser`, `deleteUser`, `getCurrentUser` |

---

### 7.2 `analytics.ts` — Аналитика

| Категория | Функции |
|-----------|---------|
| **Баланс** | `getBalanceByPeriod`, `getCurrentBalance` |
| **Расходы по категориям** | `getExpensesByCategory`, `getIncomeByCategory` |
| **Тренды** | `getSpendingTrend`, `getMonthlyTrend` |
| **Бюджеты** | `getBudgetProgressForPeriod`, `getAllBudgetsProgress` |
| **Цели** | `getGoalsProgress` |
| **Статистика** | `getSummaryStats` |

---

### 7.3 `ai.ts` — AI-ассистент

| Категория | Функции |
|-----------|---------|
| **Паттерны** | `findBestMatch`, `findAllMatches`, `learnPattern`, `recordPatternFeedback` |
| **Парсинг** | `parseNaturalLanguage` |
| **Рекомендации** | `generateSuggestions` |

---

### 7.4 `recurring.ts` — Повторяющиеся платежи

| Функция | Описание |
|---------|----------|
| `getDueTemplates` | Шаблоны на сегодня |
| `getUpcomingPayments` | Предстоящие платежи на N дней |
| `processDueTemplates` | Обработать_due_ шаблоны |
| `createManualTransactionFromTemplate` | Создать вручную по шаблону |
| `getRecurringStats` | Статистика по шаблонам |

---

### 7.5 `exportImport.ts` — Экспорт/импорт

| Категория | Функции |
|-----------|---------|
| **Экспорт** | `exportData`, `exportToFile`, `exportToCSV`, `exportCSVToFile` |
| **Импорт** | `importData`, `importFromFile` |
| **Очистка** | `clearAllData`, `clearUserData` |

---

### 7.6 `validators.ts` — Валидация

| Функция | Описание |
|---------|----------|
| `validateTransaction` | Валидация транзакции |
| `validateCategory` | Валидация категории |
| `validateBudget` | Валидация бюджета |
| `validateGoal` | Валидация цели |
| `validateRecurringTemplate` | Валидация шаблона |
| `validateAIPattern` | Валидация AI-паттерна |

**Result:**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

---

## 8. Структура приложения (`src/app/`)

### 8.1 Компоненты (`components/`)

| Компонент | Назначение |
|-----------|------------|
| `AddTransactionForm.tsx` | Форма добавления операции |
| `AmountDisplay.tsx` | Отображение суммы с форматированием |
| `BottomNav.tsx` | Нижняя панель навигации |
| `BottomSheet.tsx` | Выезжающая панель (мобильная) |
| `CategoryBadge.tsx` | Бейдж категории с иконкой и цветом |
| `EmptyState.tsx` | Пустое состояние списка |
| `ui/` | Базовые компоненты shadcn/ui |
| `figma/` | Компоненты из Figma-макета |

### 8.2 Контексты (`contexts/`)

| Контекст | Назначение |
|----------|------------|
| `ThemeContext.tsx` | Темы: light/dark/system, сохранение в localStorage |
| `AuthContext.tsx` | Авторизация: user, register, updateProfile, logout |

### 8.3 Экраны (`screens/`)

| Экран | Описание |
|-------|----------|
| `Dashboard.tsx` | Главная панель с балансом и быстрыми действиями |
| `TransactionHistory.tsx` | История операций с фильтрами |
| `Analytics.tsx` | Графики и аналитика расходов |
| `Settings.tsx` | Настройки приложения |
| `Budgets.tsx` | Управление бюджетами |
| `Goals.tsx` | Финансовые цели |
| `Categories.tsx` | Категории операций |
| `AIAssistant.tsx` | AI-ассистент |
| `Onboarding.tsx` | Онбординг для новых пользователей |
| `Registration.tsx` | Регистрация/вход пользователя |
| `PrivacyPolicy.tsx` | Политика конфиденциальности |
| `TermsOfService.tsx` | Условия использования |
| `ComponentShowcase.tsx` | Демонстрация компонентов |

### 8.4 Маршрутизация (`routes.tsx`)

```typescript
/                    → Dashboard
/history             → TransactionHistory
/analytics           → Analytics
/settings            → Settings
/budgets             → Budgets
/goals               → Goals
/categories          → Categories
/ai-assistant        → AIAssistant
/components          → ComponentShowcase
/onboarding          → Onboarding
/register            → Registration
/privacy             → PrivacyPolicy
/terms               → TermsOfService
```

**ProtectedRoute:** все маршруты кроме `/onboarding`, `/register`, `/privacy`, `/terms` требуют авторизации.

---

## 9. PWA и офлайн-режим

### Service Worker (Workbox)

**Стратегии кэширования:**
- `CacheFirst` — шрифты (Google Fonts)
- `NetworkFirst` — навигация (pages)
- `StaleWhileRevalidate` — статические ресурсы

**Кэшируемые файлы:**
```javascript
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
```

### Web App Manifest

```json
{
  "name": "Finly — Управление личными финансами",
  "short_name": "Finly",
  "display": "standalone",
  "theme_color": "#7c3aed",
  "background_color": "#ffffff",
  "start_url": "/",
  "orientation": "portrait"
}
```

### IndexedDB

Все данные пользователя хранятся локально:
- Работает без интернета
- Сохраняется после закрытия браузера
- Автоматическая синхронизация между вкладками

---

## 10. Темизация

### CSS-переменные (`theme.css`)

**Светлая тема:**
```css
:root {
  --background: #ffffff;
  --foreground: oklch(0.145 0 0);
  --primary: #7c3aed;
  --muted: #f3f4f6;
  --border: rgba(0, 0, 0, 0.1);
  /* ... */
}
```

**Тёмная тема:**
```css
.dark {
  --background: #0f172a;
  --foreground: #f1f5f9;
  --primary: #8b5cf6;
  --muted: #334155;
  --border: #334155;
  /* ... */
}
```

### Режимы тем

| Режим | Описание |
|-------|----------|
| `light` | Всегда светлая |
| `dark` | Всегда тёмная |
| `system` | Авто (по `prefers-color-scheme`) |

---

## 11. Миграции БД

При изменении схемы обновляется версия:

```typescript
this.version(2).stores({
  users: 'id, createdAt',
}).upgrade(tx => {
  // логика миграции
});
```

---

## 12. Безопасность

- **Отсутствие бэкенда:** все данные только на устройстве пользователя
- **Нет сетевых запросов:** приложение не отправляет данные на сервер
- **Локальное хранение:** IndexedDB + localStorage для настроек
