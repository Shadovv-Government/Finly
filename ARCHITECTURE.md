# Архитектура Finly

## 1. Общая концепция

- **Тип приложения:** Progressive Web App (PWA) — работает в браузере и устанавливается на устройство
- **Backend:** только serverless-функция на Vercel для AI-прокси (`api/ai-chat.ts`); все пользовательские данные хранятся локально
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
| Radix UI | 1.x/2.x пакеты (@radix-ui/react-*) | Headless UI-компоненты (27+ пакетов) |
| shadcn/ui | — | Готовые компоненты (~50 компонентов) |
| Tailwind CSS | 4.1.12 | Утилитарные стили |
| Recharts | 2.15.2 | Графики и визуализация |
| Lucide React | 0.487.0 | Иконки |
| Material Icons | ^5.15.15 | Дополнительные иконки |
| Motion | 12.23.24 | Анимации |
| next-themes | 0.4.6 | Абстракция темизации |

### Хранение данных
- **IndexedDB** — браузерная NoSQL-база (key-value + индексы)
- **Dexie.js** ^3.2.7 — ORM-обёртка над IndexedDB

### AI / ML
- **TensorFlow.js** ^4.22.0 — локальная ML-классификация (MC Dropout)
- **Tesseract.js** ^7.0.0 — OCR для сканирования чеков
- **jsQR** — декодирование QR-кодов (фискальные чеки)
- **OpenRouter API** — AI-чат (проксируется через Vercel Function)
- **Gemini 2.5 Flash** — AI-распознавание чеков (бесплатный)
- **Claude Vision API** — AI-распознавание чеков (по API-ключу)

### PWA
- **Vite** 6.3.5 — сборщик проекта
- **vite-plugin-pwa** ^1.2.0 — генерация Service Worker (injectManifest) и Manifest
- **Workbox** ^7.1.0 — стратегии кэширования

### Инфраструктура
- **GitHub** — хостинг кода
- **Vercel** — хостинг приложения (статический SPA + serverless-функция)
- **GitHub Actions** — CI/CD (3 воркфлоу: ci, lighthouse, quality)

---

## 3. Слои архитектуры

```
┌──────────────────────────────────────────────┐
│              UI Layer (React)                │
│   Screens → Layout → Components → BottomNav  │
├──────────────────────────────────────────────┤
│        Context Layer                         │
│   ThemeContext (light/dark/system)           │
│   AuthContext (user profile, biometric)      │
│   SettingsContext (reduced motion)           │
├──────────────────────────────────────────────┤
│        Routing Layer                         │
│   react-router-dom (ProtectedRoute)          │
├──────────────────────────────────────────────┤
│        Data Access Layer  (src/db/)          │
│   operations/index.ts → analytics.ts → ai.ts │
│   recurring.ts → exportImport.ts             │
│              ↓                               │
│           Dexie.js ORM                       │
├──────────────────────────────────────────────┤
│        Storage Layer                         │
│   IndexedDB → FinlyDB (9 таблиц)             │
├──────────────────────────────────────────────┤
│        PWA Layer                             │
│   Service Worker (Workbox) + Manifest        │
│   Background Sync (finly-fine-tune)          │
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
| `notifications` | `++id` (auto) | `type, read, createdAt, expiresAt` | Уведомления (persist/read-state) |

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
  categoryId?: string;  // опционален — fallback на категорию "Другое"
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
  avatarColor?: string; // CSS gradient (from-amber-400 to-pink-500)
  avatarDataUrl?: string; // своё фото (base64 data URL)
}
```

**`NotificationItem`**
```typescript
{
  id?: number;
  type: NotificationType;  // 9 типов
  title: string;
  subtitle: string;
  icon: string;            // lucide icon name
  iconColor: string;       // tailwind color class
  iconBg: string;          // tailwind bg class
  data?: Record<string, any>; // categoryId, goalId, transactionId...
  read: boolean;
  createdAt: number;
  expiresAt?: number;
}
```

---

## 6. Структура модуля `src/db/`

```
src/db/
├── types.ts           — TypeScript-интерфейсы
├── db.ts              — Класс Dexie, схема БД (singleton, 3 версии)
├── seed.ts            — Начальное заполнение (категории, настройки) + миграции
├── validators.ts      — Валидация данных (русскоязычные сообщения)
├── analytics.ts       — ~25 аналитических запросов для графиков и дашбордов
├── ai.ts              — Авто-категоризация, NLP-парсинг, рекомендации
├── recurring.ts       — Обработка повторяющихся платежей
├── exportImport.ts    — Экспорт/импорт (JSON с версией схемы, CSV)
├── operations/        — CRUD-функции (модульная структура)
│   ├── index.ts       — Ре-экспорт всех операций
│   ├── transactions.ts — CRUD транзакций (+ тесты)
│   ├── categories.ts  — CRUD категорий (+ тесты)
│   ├── budgets.ts     — CRUD бюджетов (+ тесты)
│   ├── goals.ts       — CRUD целей (+ тесты)
│   ├── recurring.ts   — CRUD повторяющихся платежей
│   ├── settings.ts    — CRUD настроек
│   ├── users.ts       — CRUD пользователей (+ тесты)
│   ├── aiPatterns.ts  — CRUD AI паттернов
│   ├── biometric.ts   — Биометрические настройки
│   └── notifications.ts — CRUD уведомлений
└── readme.md          — Документация по БД
```

### Инициализация при первом запуске (`seed.ts`)

При первом открытии `seedDatabase()` проверяет таблицу `categories`:

**Если пуста — создаёт стартовые данные:**

**Категории расходов:**
| ID | Название | Иконка | Цвет |
|----|----------|--------|------|
| `cat_food` | Еда | Utensils | #FF5722 |
| `cat_groceries` | Продукты | ShoppingBasket | #8BC34A |
| `cat_transport` | Транспорт | Car | #2196F3 |
| `cat_home` | Аренда | Home | #795548 |
| `cat_utilities` | Коммунальные | Zap | #FF9800 |
| `cat_health` | Здоровье | Heart | #E91E63 |
| `cat_shopping` | Шопинг | ShoppingBag | #9C27B0 |
| `cat_fun` | Развлечения | PartyPopper | #AB47BC |
| `cat_other_expense` | Другое | CircleHelp | #9E9E9E |

**Категории доходов:**
| ID | Название | Иконка | Цвет |
|----|----------|--------|------|
| `inc_salary` | Зарплата | Wallet | #4CAF50 |
| `inc_investments` | Инвестиции | TrendingUp | #00BCD4 |
| `inc_gift` | Подарок | Gift | #9C27B0 |
| `inc_other` | Другое | CircleHelp | #9E9E9E |

**Настройки по умолчанию:**
- `theme`: `'light'`
- `baseCurrency`: `'RUB'`
- `onboardingComplete`: `false`
- biometric-ключи (`biometric_enabled`, `biometric_credential_id`, `biometric_last_active`) создаются при включении аутентификации

**Миграции seed-данных:** старые эмодзи-иконки заменяются на Lucide-иконки, недостающие системные категории добавляются автоматически, а `cat_home` переименовывается из `Жильё` в `Аренда`.

---

## 7. Модули слоя данных

### 7.1 `operations/` — CRUD операции (модульная структура)

CRUD-операции разделены по отдельным файлам для каждой сущности:

| Файл | Сущность | Основные функции |
|------|----------|------------------|
| `transactions.ts` | **Transactions** | `addTransaction`, `getTransaction`, `updateTransaction`, `deleteTransaction`, `getTransactionsByPeriod`, `getTransactionsByCategory`, `getAllTransactions` |
| `categories.ts` | **Categories** | `addCategory`, `getCategory`, `updateCategory`, `deleteCategory`, `getCategories`, `getCategoriesByType`, `getExpenseCategories`, `getIncomeCategories`, `reassignCategoryTransactions`, `deleteCategoryWithTransactions` |
| `budgets.ts` | **Budgets** | `addBudget`, `getBudget`, `updateBudget`, `deleteBudget`, `getBudgetByCategory`, `getActiveBudgets` |
| `goals.ts` | **Goals** | `addGoal`, `getGoal`, `updateGoal`, `deleteGoal`, `getGoals`, `getActiveGoals`, `contributeToGoal` |
| `recurring.ts` | **Recurring** | `addRecurringTemplate`, `getRecurringTemplate`, `updateRecurringTemplate`, `deleteRecurringTemplate`, `getActiveRecurringTemplates` |
| `settings.ts` | **Settings** | `getSetting`, `setSetting`, `getAllSettings` |
| `users.ts` | **Users** | `createUser`, `getUser`, `updateUser`, `deleteUser`, `getCurrentUser` |
| `aiPatterns.ts` | **AI Patterns** | `addAIPattern`, `getAIPattern`, `updateAIPattern`, `deleteAIPattern` |
| `biometric.ts` | **Biometric** | `getBiometricSettings`, `setBiometricSetting`, `clearBiometricSettings` |
| `notifications.ts` | **Notifications** | `addNotification`, `getAllNotifications`, `getUnreadNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `clearReadNotifications`, `clearAllNotifications`, `getUnreadCount`, `clearExpiredNotifications` |

Все функции экспортируются через `operations/index.ts`.

---

### 7.2 `analytics.ts` — Аналитика

| Категория | Функции |
|-----------|---------|
| **Баланс** | `getBalanceByPeriod`, `getCurrentBalance`, `getTotalSavings`, `getBalanceWithSavings` |
| **Расходы по категориям** | `getExpensesByCategory`, `getIncomeByCategory` |
| **Тренды** | `getSpendingTrend`, `getIncomeTrend`, `getMonthlyTrend` |
| **Бюджеты** | `getBudgetProgressForPeriod`, `getAllBudgetsProgress` |
| **Цели** | `getGoalsProgress` |
| **Прогноз** | `getMonthForecast` |
| **Сравнение** | `getCategoryMoMDelta` (месяц к месяцу) |
| **Анализ** | `getSavingsRate`, `getLargestTransactions`, `getAverageDailySpend`, `getSpendByDayOfWeek`, `getAnomalousTransactions`, `getIncomePattern` |
| **Платежи** | `getRecurringUpcoming` |
| **Поиск** | `findCategoryByName` |
| **Статистика** | `getSummaryStats` |

---

### 7.3 `ai.ts` — AI-ассистент

| Категория | Функции |
|-----------|---------|
| **Паттерны** | `findBestMatch`, `findAllMatches`, `learnPattern`, `recordPatternFeedback` |
| **Парсинг** | `parseNaturalLanguage`, `inferCategoryId` |
| **Рекомендации** | `generateSuggestions` |

---

### 7.4 `recurring.ts` — Повторяющиеся платежи

| Функция | Описание |
|---------|----------|
| `getNextDate` | Вычислить следующую дату по интервалу |
| `getDaysUntilDue` | Дней до платежа |
| `getDueTemplates` | Шаблоны на сегодня |
| `getUpcomingPayments` | Предстоящие платежи на N дней |
| `processDueTemplates` | Обработать все due шаблоны (с кулдауном 1 час) |
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
| `assertValid` | Бросить ошибку если не валидно |
| `validateWithWarnings` | Валидировать с предупреждениями |

Все сообщения об ошибках на русском языке.

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
| `AddTransactionForm.tsx` | Форма добавления операции (AI-парсинг + ручной ввод) |
| `AIQuickInput.tsx` | Быстрый ввод с AI-подсказками |
| `AmountDisplay.tsx` | Отображение суммы с форматированием |
| `BiometricSetupCard.tsx` | Карточка настройки биометрии |
| `BottomNav.tsx` | Нижняя панель навигации |
| `BottomSheet.tsx` | Выезжающая панель (мобильная) |
| `BudgetForm.tsx` | Форма создания/редактирования бюджета |
| `CategoryBadge.tsx` | Бейдж категории с иконкой и цветом |
| `CategoryForm.tsx` | Форма создания/редактирования категории |
| `ContributeBottomSheet.tsx` | Панель внесения вклада в цель |
| `EmptyState.tsx` | Пустое состояние списка |
| `ErrorBoundary.tsx` | Граница ошибок с route-level key |
| `GoalForm.tsx` | Форма создания/редактирования цели |
| `NotificationsPanel.tsx` | Панель уведомлений с группировкой по дате |
| `QuickActionBar.tsx` | Бар быстрых действий на дашборде |
| `ReceiptScannerModal.tsx` | Модальное окно сканера чеков |
| `RecurringTemplateForm.tsx` | Форма создания/редактирования шаблона |
| `SwipeableRow.tsx` | Строка со свайп-жестом |
| `ui/` | ~50 базовых компонентов shadcn/ui |
| `figma/` | Компоненты из Figma-макета |

### 8.2 Контексты (`contexts/`)

| Контекст | Назначение |
|----------|------------|
| `ThemeContext.tsx` | Темы: light/dark/system, сохранение в IndexedDB |
| `AuthContext.tsx` | Авторизация: user, register, updateProfile, logout + биометрия |
| `SettingsContext.tsx` | Настройки: reduced motion |

### 8.3 Экраны (`screens/`)

| Экран | Описание |
|-------|----------|
| `Dashboard.tsx` | Главная панель с балансом, быстрыми действиями, инсайтами, уведомлениями |
| `TransactionHistory.tsx` | История операций с фильтрами, поиском, свайп-действиями |
| `Analytics.tsx` | Графики и аналитика: баланс, категории, тренды, сравнения, прогноз |
| `Settings.tsx` | Настройки: профиль, тема, безопасность, данные, уведомления |
| `Budgets.tsx` | Управление бюджетами с индикаторами прогресса |
| `Goals.tsx` | Финансовые цели с прогресс-барами |
| `RecurringScreen.tsx` | Управление повторяющимися операциями |
| `Categories.tsx` | Управление категориями (добавление, редактирование, удаление) |
| `AIAssistant.tsx` | AI-ассистент: инсайты + чат (онлайн/офлайн) |
| `AddTransaction.tsx` | Добавление транзакции: NLP-парсинг, голосовой ввод, сканер чеков |
| `LockScreen.tsx` | Экран блокировки (WebAuthn + PIN fallback) |
| `Onboarding.tsx` | Онбординг для новых пользователей |
| `Registration.tsx` | Регистрация пользователя + настройка биометрии |
| `PrivacyPolicy.tsx` | Политика конфиденциальности |
| `TermsOfService.tsx` | Условия использования |
| `ComponentShowcase.tsx` | Демонстрация компонентов (dev only) |

**Всего: 16 экранов**

### 8.4 Маршрутизация (`routes.tsx`)

```typescript
/                    → Dashboard
/history             → TransactionHistory
/analytics           → Analytics
/settings            → Settings
/budgets             → Budgets
/goals               → Goals
/recurring           → RecurringScreen
/categories          → Categories
/ai-assistant        → AIAssistant
/add                 → AddTransaction
/components          → ComponentShowcase (только в development)
/onboarding          → Onboarding
/register            → Registration
/privacy             → PrivacyPolicy
/terms               → TermsOfService
```

**ProtectedRoute:** все маршруты кроме `/onboarding`, `/register`, `/privacy`, `/terms` требуют авторизации. Если включена биометрия и приложение заблокировано, роут рендерит `LockScreen`.

---

## 9. PWA и офлайн-режим

### Service Worker (Workbox)

**Стратегии кэширования:**
- `CacheFirst` — ML-модели (TensorFlow.js), шрифты, статические ресурсы
- `NetworkFirst` — HTML-страницы (навигация)
- `StaleWhileRevalidate` — изображения, иконки
- Очистка устаревшего кэша при активации SW

**Кэшируемые файлы:**
```javascript
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
```

### Background Sync

Service Worker регистрирует тэг `finly-fine-tune`. Когда устройство в сети и неактивно, браузер отправляет событие синхронизации, и SW запускает инкрементальное дообучение ML-модели через WebGL.

### Web App Manifest

```json
{
  "name": "Finly — Управление личными финансами",
  "short_name": "Finly",
  "display": "standalone",
  "theme_color": "#7c3aed",
  "background_color": "#ffffff",
  "start_url": "/",
  "orientation": "portrait",
  "shortcuts": [
    { "name": "Добавить расход", "url": "/add?type=expense" },
    { "name": "Добавить доход", "url": "/add?type=income" }
  ]
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

Текущая версия схемы: **v3**.

---

## 12. Безопасность

- **Данные на устройстве:** все пользовательские данные только в IndexedDB
- **AI-прокси:** единственный сетевой запрос — к Vercel Function; API-ключ OpenRouter хранится только в серверных переменных окружения
- **CSP:** Content Security Policy в index.html ограничивает ресурсы `'self'`
- **Биометрия:** WebAuthn с `userVerification: 'required'`, платформенный аутентификатор
- **Нет сбора данных:** приложение не отправляет пользовательские данные на сторонние серверы

---

## 13. Структура состояний (Custom Hooks)

### Хуки для работы с данными

| Хук | Описание |
|-----|----------|
| `useTransactions` | Загрузка, фильтрация, CRUD операций |
| `useCategories` | Категории доходов/расходов |
| `useBudgets` | Управление бюджетами и лимитами |
| `useGoals` | Финансовые цели и прогресс |
| `useAnalytics` | Аналитические данные для графиков (Promise.all + cancellation ref) |
| `useRecurringTemplates` | CRUD и загрузка шаблонов повторяющихся операций |

### AI и ML хуки

| Хук | Описание |
|-----|----------|
| `useAIInsights` | Инсайты для дашборда и AI-ассистента |
| `useAIChat` | AI-чат: онлайн (OpenRouter) + офлайн fallback |
| `useMLModel` | Интеграция TF.js классификатора |

### UI и взаимодействие

| Хук | Описание |
|-----|----------|
| `useTransactionForm` | Логика формы транзакций + NLP-парсинг |
| `useReceiptScanner` | OCR + QR + AI сканирование чеков |
| `useSpeechInput` | Голосовой ввод (Speech Recognition API) |
| `useBiometric` | Биометрическая аутентификация (WebAuthn) |
| `useBudgetNotifications` | Генерация уведомлений о бюджетах (пороги 80%/99%/100%/120%) |
| `useNotifications` | Push-уведомления (Sonner + Browser Notification API) |
| `useNotificationPanel` | Сборка панели уведомлений, группировка по дате, persist read-state |
| `useCountUp` | Анимированный счётчик чисел |
| `useReducedMotion` | Доступность: режим reduced motion |

**Всего: 17+ хуков**

### AI модули (не хуки)

| Модуль | Описание |
|--------|----------|
| `chatContext.ts` | Офлайн AI: intent-роутер (15+ интентов) с follow-up suggestions |
| `insightsEngine.ts` | Построитель карточек инсайтов для дашборда |
| `nlpParser.ts` | Извлечение периодов из естественного языка, форматирование |

---

## 14. Утилиты (`src/app/utils/`)

| Модуль | Функции |
|--------|---------|
| `formatCurrency.ts` | Форматирование сумм с валютой (+ тесты) |
| `errorHandler.ts` | Кастомные типы ошибок, `withRetry` (+ тесты) |
| `notifications.ts` | Helper-функции для уведомлений |
| `notificationIcons.ts` | Иконки для типов уведомлений |
| `animations.ts` | Анимационные утилиты |
| `dataEvents.ts` | События данных |
| `imagePreprocess.ts` | Предобработка изображений для OCR |
| `lucideIcons.tsx` | Динамический рендер иконок Lucide |
| `recurringProcessor.ts` | Процессор повторяющихся платежей |

---

## 15. Система уведомлений (`NotificationsPanel` + `useNotificationPanel`)

### Панель уведомлений

Компонент `NotificationsPanel.tsx` открывается по кнопке-колокольчику на Dashboard. Отображает уведомления, сгруппированные по дате:

| Группа | Условие |
|--------|---------|
| **Сегодня** | `createdAt` < 24ч |
| **Вчера** | `createdAt` < 48ч |
| **На этой неделе** | `createdAt` < 7 дней |
| **Ранее** | старше 7 дней |

### Типы уведомлений (9 типов)

| Тип | Условие генерации | Иконка | Цвет |
|-----|-------------------|--------|------|
| `budget-overrun` | Потрачено ≥ 100% бюджета | AlertTriangle | Красный |
| `budget-warning` | Потрачено 80–99% бюджета | AlertTriangle | Жёлтый |
| `goal-done` | Накоплено ≥ 100% цели | CheckCircle2 | Зелёный |
| `goal-near` | Накоплено 80–99% цели | Target | Фиолетовый |
| `goal-deadline` | Дедлайн ≤ 30 дней или прошёл | Calendar / AlertTriangle | Оранжевый / Красный |
| `recurring-due` | Платёж должен сегодня | Clock | Красный |
| `recurring-upcoming` | Платёж через 1–3 дня | Clock | Синий |
| `anomalous-expense` | Трата > 2× от среднего по категории | TrendingUp | Синий |
| `duplicate-transaction` | 2 одинаковые операции за < 1ч | Copy | Жёлтый |

### Persist и прочтение

- Уведомления сохраняются в IndexedDB (таблица `notifications`, схема v3)
- При открытии панели все уведомления помечаются как прочитанные
- Кнопки действий: **"Прочитать все"**, **"Очистить прочитанные"**
- Красный индикатор на колокольчике показывается только при наличии непрочитанных
- `clearExpiredNotifications()` вызывается при каждом монтировании

### Действия в уведомлениях

Каждое уведомление имеет кнопку действия с навигацией:
- Бюджеты → `/budgets`
- Цели → `/goals`
- Транзакции → `/history`

### Настройки уведомлений (Settings)

4 переключателя:
1. **Push-уведомления** — браузерные Notification API
2. **Бюджеты** — уведомления о превышении лимитов
3. **Цели** — уведомления о достижениях и дедлайнах
4. **Регулярные платежи** — напоминания о платежах

---

## 16. Стилевая архитектура (`src/styles/`)

| Файл | Описание |
|------|----------|
| `index.css` | Основные стили, utility-классы (`scrollbar-hide`, `safe-area-inset-bottom`) |
| `tailwind.css` | Конфигурация Tailwind CSS 4.x |
| `theme.css` | CSS-переменные тем (light/dark), Tailwind `@theme inline` |
| `fonts.css` | Подключение шрифтов |

### Темизация

- CSS-переменные для всех цветов
- Поддержка `prefers-color-scheme: dark`
- Переключение через `ThemeContext` + `next-themes`
- Сохранение в `IndexedDB`

---

## 17. PWA-конфигурация (`vite.config.ts`)

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
  shortcuts: [
    { name: 'Добавить расход', url: '/add?type=expense' },
    { name: 'Добавить доход', url: '/add?type=income' },
  ],
  icons: [
    { src: '/pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    { src: '/pwa-2048x2048.svg', sizes: '2048x2048', type: 'image/svg+xml' },
  ],
}
```

### Workbox стратегии

| Паттерн | Стратегия | Назначение |
|---------|-----------|------------|
| Модели/шрифты | CacheFirst | ML-модели, Google Fonts |
| `**/*.{js,css,woff,woff2}` | CacheFirst | Статические ресурсы |
| `**/*.{png,svg,ico}` | CacheFirst | Изображения, иконки |
| `/` (навигация) | NetworkFirst | HTML страницы |
| `*` | StaleWhileRevalidate | Остальные запросы |

### Ручное разделение чанков

Агрессивное разделение vendor-чанков для оптимизации загрузки:
- Отдельные чанки для TF.js подсистем (core, backend-cpu, backend-webgl, converter, layers)
- MUI, Recharts, Dexie, Radix UI, Tesseract, motion, date-fns, Lucide, React, Workbox, Zustand — каждый в своём чанке

---

## 18. Маршрутизация

### Защищённые роуты

Требуют авторизации (Redirect на `/register`) и разблокировки (LockScreen если включена биометрия):

| Путь | Компонент |
|------|-----------|
| `/` | Dashboard |
| `/history` | TransactionHistory |
| `/analytics` | Analytics |
| `/settings` | Settings |
| `/budgets` | Budgets |
| `/goals` | Goals |
| `/recurring` | RecurringScreen |
| `/categories` | Categories |
| `/ai-assistant` | AIAssistant |
| `/add` | AddTransaction |
| `/components` | ComponentShowcase (development-only) |

### Публичные роуты

Доступны без авторизации:

| Путь | Компонент |
|------|-----------|
| `/register` | Registration |
| `/onboarding` | Onboarding |
| `/privacy` | PrivacyPolicy |
| `/terms` | TermsOfService |

---

## 19. Жизненный цикл приложения

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
1. Пользователь нажимает «+» в BottomNav или использует быстрый ввод
2. AI-парсинг текста (parseNaturalLanguage) или ручной ввод через форму
3. ML-классификация: LRU-кэш → правила → ML → fallback
4. useTransactionForm валидирует данные
5. addTransaction() → IndexedDB
6. Обновление кэша аналитики
7. Уведомление об успехе (toast)
```

### 3. Обработка повторяющихся платежей

```
1. При запуске: processDueTemplates()
2. Проверка кулдауна (1 час с последнего запуска)
3. Поиск шаблонов с nextDate <= today
4. Для каждого: createTransaction()
5. Обновление nextDate по интервалу
6. Уведомление о созданных транзакциях
```

---

## 20. Производительность

### Оптимизации

| Техника | Реализация |
|---------|------------|
| Code splitting | React Router lazy loading + ручные чанки |
| Tree shaking | Tailwind CSS, ES-модули |
| Кэширование | Service Worker (Workbox) |
| Индексы БД | Dexie индексация полей |
| Мемоизация | React.memo, useMemo, useCallback |
| Минификация | Terser с drop_console + drop_debugger |
| CSP | Только 'self' для всех ресурсов |

### Размеры бандла

- Отдельные чанки для крупных библиотек (TF.js, MUI, Recharts, Dexie, Tesseract, motion, date-fns, Lucide, Radix UI, React, Workbox, Zustand)
- Каждый чанк загружается асинхронно и кэшируется Service Worker

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
| motion | 12.23.24 | Анимации |
| sonner | 2.0.3 | Уведомления |
| @mui/material | ^5.15.15 | Дополнительные UI-компоненты |
| @mui/icons-material | ^5.15.15 | Дополнительные иконки |
| react-hook-form | 7.55.0 | Управление формами |
| date-fns | 3.6.0 | Работа с датами |
| uuid | ^13.0.0 | Генерация UUID |
| canvas-confetti | 1.9.4 | Анимация конфетти |
| vaul | 1.1.2 | Drawer-компоненты |
| embla-carousel-react | 8.6.0 | Карусель |
| next-themes | 0.4.6 | Абстракция темизации |
| @tensorflow/tfjs | ^4.22.0 | ML-классификация |
| tesseract.js | ^7.0.0 | OCR сканирование |
| jsqr | — | QR-декодирование |

### Дополнительные UI-компоненты (Radix UI + shadcn/ui)

30+ компонентов: accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toggle, toggle-group, tooltip, command, calendar, carousel, drawer, form, input-otp, resizable, sheet, sidebar, breadcrumb, pagination, skeleton, table, textarea, badge, chart, sonner.

### Dev-зависимости

| Пакет | Версия | Назначение |
|-------|--------|------------|
| vite | 6.3.5 | Сборщик |
| vite-plugin-pwa | ^1.2.0 | PWA плагин |
| typescript | ^5.4.5 | Типизация |
| vitest | ^4.1.1 | Тестирование |
| @testing-library/react | ^16.3.2 | React тесты |
| @testing-library/jest-dom | ^6.9.1 | Jest DOM матчеры |
| @testing-library/user-event | ^14.6.1 | Эмуляция пользовательского ввода |
| @vitest/coverage-v8 | ^4.1.1 | Покрытие кода |
| jsdom | ^29.0.1 | Среда тестирования |
| fake-indexeddb | — | Мок IndexedDB для тестов |
| eslint | ^8.57.0 | Линтинг |

---

## 22. Тестирование

### Инфраструктура

| Инструмент | Версия | Назначение |
|------------|--------|------------|
| Vitest | ^4.1.1 | Тест-раннер |
| Testing Library | ^16.3.2 | Рендер и запросы |
| jsdom | ^29.0.1 | DOM-среда |
| coverage-v8 | ^4.1.1 | Покрытие кода |

### Покрытие

- **Порог:** 50% branches, functions, lines, statements
- **Количество:** 345+ тестов в 27+ тестовых файлах
- **Команды:** `npm run test`, `npm run test:watch`, `npm run test:ui`, `npm run test:coverage`

### Тест-файлы (27+)

| Категория | Файлы |
|-----------|-------|
| **Компоненты** | `AddTransactionForm.test.tsx`, `ErrorBoundary.test.tsx`, `ReceiptScannerModal.test.tsx` |
| **Хуки** | `useTransactions.test.ts`, `useCategories.test.ts`, `useTransactionForm.test.ts`, `useAIChat.test.ts`, `useReceiptScanner.test.ts`, `useBudgetNotifications.test.ts` |
| **Утилиты** | `formatCurrency.test.ts`, `errorHandler.test.ts`, `nlpParser.test.ts` |
| **БД операции** | `operations/transactions.test.ts`, `operations/categories.test.ts`, `operations/budgets.test.ts`, `operations/goals.test.ts`, `operations/users.test.ts` |
| **AI/ML** | `chatContext.test.ts` (26 тестов, 20+ интентов), `aiClient.test.ts`, `contextBuilder.test.ts`, `classifier/finly_runtime.test.ts` |
| **Валидаторы** | `db/validators.test.ts` |

---

## 23. CI/CD Pipeline

### GitHub Actions (3 воркфлоу)

**1. CI/CD (`.github/workflows/ci.yml`)**

| Джоб | Шаги | Описание |
|------|------|----------|
| **build** | Checkout → Node 20 → `npm ci` → `npm run lint` → `npm run build` | Проверка и сборка |
| **deploy** | Vercel Action | Деплой на продакшен (только `main`) |

**2. Lighthouse (`.github/workflows/lighthouse.yml`)**

Lighthouse CI для performance-аудита.

**3. Quality Gates (`.github/workflows/quality.yml`)**

npm audit, проверка размера бандла (total JS < 3MB), test coverage (пороги 50%), PWA manifest/SW валидация.

---

## 24. Будущие улучшения

### Реализовано

- [x] Биометрическая аутентификация (WebAuthn Face ID / Touch ID + PIN fallback)
- [x] Система уведомлений с persist, группировкой по дате и действиями (9 типов)
- [x] Уведомления о повторяющихся платежах, аномальных тратах, дубликатах, дедлайнах целей
- [x] Настройки уведомлений (4 переключателя)
- [x] AI-чат ассистент (OpenRouter + офлайн fallback)
- [x] Сканер чеков: QR + OCR + AI (Gemini/Claude Vision)
- [x] Голосовой ввод
- [x] Кастомные аватары (своё фото)
- [x] Сравнение категорий месяц к месяцу
- [x] Анализ расходов по дням недели
- [x] Прогноз расходов до конца месяца
- [x] Background Sync для ML-дообучения

### В планах

- [ ] Мультивалютность с авто-конвертацией
- [ ] Push-уведомления через браузерный Notification API
- [ ] Синхронизация между устройствами (CRDT/cloud sync)
- [ ] SQLite WASM (PGlite) для реальных SQL-агрегаций
