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

---

## 13. Структура состояний (Zustand)

### Хуки для работы с данными

| Хук | Описание |
|-----|----------|
| `useTransactions` | Загрузка, фильтрация, CRUD операций |
| `useCategories` | Категории доходов/расходов |
| `useBudgets` | Управление бюджетами и лимитами |
| `useGoals` | Финансовые цели и прогресс |
| `useAnalytics` | Аналитические данные для графиков |

### Вспомогательные хуки

| Хук | Описание |
|-----|----------|
| `useNotifications` | Уведомления (Sonner) |
| `useTransactionForm` | Логика формы транзакций |

---

## 14. Утилиты (`src/app/utils/`)

| Модуль | Функции |
|--------|---------|
| `formatCurrency.ts` | Форматирование сумм с валютой |
| `errorHandler.ts` | Обработка и логирование ошибок |
| `notifications.ts` | Helper-функции для уведомлений |
| `notificationIcons.ts` | Иконки для уведомлений |

**Тесты:**
- `formatCurrency.test.ts` — тесты форматирования
- `errorHandler.test.ts` — тесты обработки ошибок
- `useTransactionForm.test.ts` — тесты хука формы
- `useCategories.test.ts` — тесты хука категорий
- `useTransactions.test.ts` — тесты хука транзакций

---

## 15. Стилевая архитектура (`src/styles/`)

| Файл | Описание |
|------|----------|
| `index.css` | Основные стили, utility-классы |
| `tailwind.css` | Конфигурация Tailwind CSS 4.x |
| `theme.css` | CSS-переменные тем (light/dark) |
| `fonts.css` | Подключение шрифтов |

### Utility-классы

```css
.scrollbar-hide          /* Скрытие скроллбара */
.safe-area-inset-bottom  /* Padding для iOS safe area */
```

### Темизация

- CSS-переменные для всех цветов
- Поддержка `prefers-color-scheme: dark`
- Переключение через `ThemeContext`
- Сохранение в `localStorage`

---

## 16. PWA-конфигурация (`vite.config.ts`)

### Manifest настройки

```typescript
manifest: {
  name: 'Finly — Управление личными финансами',
  short_name: 'Finly',
  description: 'PWA для контроля личных финансов',
  theme_color: '#7c3aed',
  background_color: '#ffffff',
  display: 'standalone',
  start_url: '/',
  orientation: 'portrait',
  icons: [
    {
      src: '/pwa-192x192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
    },
    {
      src: '/pwa-512x512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
    },
  ],
}
```

### Workbox стратегии

| Паттерн | Стратегия | Назначение |
|---------|-----------|------------|
| `**/*.{js,css,woff,woff2}` | CacheFirst | Статические ресурсы |
| `**/*.{png,svg,ico}` | CacheFirst | Изображения, иконки |
| `/` | NetworkFirst | HTML страницы |
| `*` | StaleWhileRevalidate | Остальные запросы |

---

## 17. Маршрутизация

### Защищённые роуты

Требуют авторизации (Redirect на `/register`):

| Путь | Компонент |
|------|-----------|
| `/` | Dashboard |
| `/history` | TransactionHistory |
| `/analytics` | Analytics |
| `/settings` | Settings |
| `/budgets` | Budgets |
| `/goals` | Goals |
| `/categories` | Categories |
| `/ai-assistant` | AIAssistant |
| `/components` | ComponentShowcase |

### Публичные роуты

Доступны без авторизации:

| Путь | Компонент |
|------|-----------|
| `/onboarding` | Onboarding |
| `/register` | Registration |
| `/privacy` | PrivacyPolicy |
| `/terms` | TermsOfService |

---

## 18. Жизненный цикл приложения

### 1. Первый запуск

```
1. Загрузка main.tsx
2. Инициализация Dexie (FinlyDB)
3. Проверка categories.isEmpty()
4. Если пусто → seedDatabase()
5. Рендер App.tsx с ThemeProvider + AuthProvider
6. Проверка currentUser
7. Если нет пользователя → Redirect на /register
8. Если есть → Переход на /
```

### 2. Добавление транзакции

```
1. Пользователь нажимает «+» в BottomNav
2. Открывается BottomSheet с AddTransactionForm
3. useTransactionForm валидирует данные
4. AI-парсинг комментария (parseNaturalLanguage)
5. Поиск категории (findBestMatch)
6. addTransaction() → IndexedDB
7. Обновление кэша аналитики
8. Уведомление об успехе (toast)
9. Закрытие BottomSheet
```

### 3. Обработка повторяющихся платежей

```
1. При запуске: processDueTemplates()
2. Поиск шаблонов с nextDate <= today
3. Для каждого: createTransaction()
4. Обновление nextDate по интервалу
5. Уведомление о созданных транзакциях
```

---

## 19. Производительность

### Оптимизации

| Техника | Реализация |
|---------|------------|
| Code splitting | React Router lazy loading |
| Tree shaking | Tailwind CSS, ES-модули |
| Кэширование | Service Worker (Workbox) |
| Индексы БД | Dexie индексация полей |
| Мемоизация | React.memo, useMemo, useCallback |

### Размеры бандла

- **main.js:** ~200-300 KB (gzipped)
- **vendor.js:** ~500-700 KB (React, Recharts, Dexie)
- **CSS:** ~20-30 KB (Tailwind purge)

---

## 20. Расширяемость

### Добавление новой фичи

1. **Типы:** Добавить интерфейс в `src/db/types.ts`
2. **БД:** Обновить схему в `src/db/db.ts`
3. **CRUD:** Функции в `src/db/operations.ts`
4. **Хук:** Создать `src/app/hooks/useNewFeature.ts`
5. **UI:** Компоненты в `src/app/components/`
6. **Экран:** `src/app/screens/NewFeatureScreen.tsx`
7. **Роут:** Добавить в `src/app/routes.tsx`
8. **Тесты:** `*.test.ts` файлы

### Миграции БД

```typescript
this.version(3).stores({
  newTable: '++id, indexedField',
}).upgrade(async tx => {
  // Миграция данных
  const oldData = await tx.table('oldTable').toArray();
  // ...
});
```

---

## 21. Зависимости

### Основные

| Пакет | Версия | Назначение |
|-------|--------|------------|
| react | ^18.3.1 | UI фреймворк |
| react-router-dom | ^7.13.1 | Маршрутизация |
| zustand | ^4.5.2 | State management |
| dexie | ^3.2.7 | IndexedDB ORM |
| tailwindcss | 4.1.12 | CSS framework |
| lucide-react | 0.487.0 | Иконки |
| recharts | 2.15.2 | Графики |
| chart.js | ^4.4.2 | Альтернативные графики |
| motion | 12.23.24 | Анимации |
| sonner | 2.0.3 | Уведомления |

### Dev-зависимости

| Пакет | Версия | Назначение |
|-------|--------|------------|
| vite | 6.3.5 | Сборщик |
| vite-plugin-pwa | ^1.2.0 | PWA плагин |
| typescript | ^5.4.5 | Типизация |
| vitest | ^4.1.1 | Тестирование |
| @testing-library/react | ^16.3.2 | React тесты |
| eslint | ^8.57.0 | Линтинг |

---

## 22. Будущие улучшения

### В разработке

- [ ] Биометрическая аутентификация (WebAuthn)
- [ ] Мультивалютность с авто-конвертацией
- [ ] Push-уведомления о лимитах


