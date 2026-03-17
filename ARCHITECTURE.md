# Архитектура Finly

## 1. Общая концепция

- **Тип приложения:** Progressive Web App (PWA) — работает как в браузере, так и устанавливается на устройство
- **Backend отсутствует:** всё хранится локально на клиенте, нет серверных API-запросов
- **Офлайн-first:** приложение полностью функционально без подключения к интернету
- **Платформы:** мобильные и десктопные устройства (responsive/adaptive вёрстка)

---

## 2. Стек технологий

### Frontend
- **TypeScript** — строгая типизация всего приложения
- **React 18+** — UI-фреймворк
- **React Router** — клиентская маршрутизация
- **Material UI (MUI) / Chakra UI** — компонентная библиотека
- **Zustand / Redux Toolkit** — управление глобальным состоянием
- **Chart.js / Recharts** — графики и визуализация данных

### Хранение данных
- **IndexedDB** — браузерная база данных (NoSQL, key-value + индексы)
- **Dexie.js** — ORM-обёртка над IndexedDB

### PWA
- **Vite** — сборщик проекта
- **vite-plugin-pwa** — генерация Service Worker и Manifest
- **Workbox** — стратегии кэширования для Service Worker
- **Web App Manifest** — установка приложения на домашний экран

### Инфраструктура
- **GitHub** — система контроля версий
- **GitHub Actions** — CI/CD (сборка, тесты, деплой)
- **Vercel / Netlify** — хостинг

---

## 3. Слои архитектуры

```
┌──────────────────────────────────────────────┐
│              UI Layer (React)                │
│   Pages → Screens → Components → Charts      │
├──────────────────────────────────────────────┤
│        State Management Layer                │
│   Zustand / Redux Store → Actions/Selectors  │
├──────────────────────────────────────────────┤
│        Data Access Layer  (src/db/)          │
│   db.ts  ←→  types.ts  ←→  seed.ts           │
│              ↓                               │
│           Dexie.js ORM                       │
├──────────────────────────────────────────────┤
│        Storage Layer                         │
│   IndexedDB  →  FinlyDB (7 таблиц)           │
├──────────────────────────────────────────────┤
│        PWA Layer                             │
│   Service Worker (Workbox) + Manifest        │
└──────────────────────────────────────────────┘
```

---

## 4. Схема базы данных (`FinlyDB`)

База данных объявлена в классе `FinlyDatabase extends Dexie` (`src/db/db.ts`).

| Таблица              | Primary Key     | Индексы                          | Назначение                            |
|----------------------|-----------------|----------------------------------|---------------------------------------|
| `transactions`       | `++id` (auto)   | `date, categoryId, type, createdAt` | Финансовые операции (доходы/расходы) |
| `categories`         | `id` (string)   | `type, isSystem`                 | Категории с иконкой и цветом          |
| `budgets`            | `++id` (auto)   | `categoryId, period, startDate`  | Лимиты по категориям на период        |
| `goals`              | `++id` (auto)   | `isActive, deadline`             | Финансовые цели / «копилки»           |
| `recurringTemplates` | `++id` (auto)   | `nextDate, isActive`             | Шаблоны повторяющихся платежей        |
| `settings`           | `key` (string)  | —                                | KV-хранилище настроек                 |
| `aiPatterns`         | `++id` (auto)   | `pattern, categoryId`            | Паттерны для AI авто-категоризации    |

---

## 5. Модели данных (`src/db/types.ts`)

### Перечисления
```typescript
type TransactionType    = 'income' | 'expense';
type PeriodType         = 'week' | 'month';
type RecurringInterval  = 'daily' | 'weekly' | 'monthly' | 'yearly';
```

### Основные интерфейсы

- **`Transaction`** — сумма, тип, `categoryId`, дата (timestamp), валюта, курс к базовой валюте, опциональный `templateId`
- **`Category`** — uuid-строка, иконка, hex-цвет, флаг `isSystem` (системные нельзя удалить), опциональный `parentId` для подкатегорий
- **`Budget`** — привязка к категории, сумма лимита, тип периода, дата начала периода
- **`Goal`** — название, целевая и текущая суммы, опциональный дедлайн, флаг `isActive`
- **`RecurringTemplate`** — интервал повторения, `nextDate` (timestamp следующего платежа), флаг `isActive`
- **`AppSettings`** — простое key-value хранилище (`key: string`, `value: any`)
- **`AIPattern`** — ключевое слово (`pattern`), привязанная категория, `confidence` (0–1), счётчик `usageCount`

---

## 6. Структура модуля `src/db/`

```
src/db/
├── types.ts   — TypeScript-интерфейсы и union-типы всех сущностей
├── db.ts      — Singleton FinlyDatabase (extends Dexie), схема v1
├── seed.ts    — Начальное заполнение: категории + дефолтные настройки
└── readme.md  — Документация слоя данных
```

### Инициализация при первом запуске (`seed.ts`)
При первом открытии приложения `seedDatabase()` проверяет, пуста ли таблица `categories`,
и если да — добавляет стартовые данные:

**Категории расходов:** `cat_food` 🍔, `cat_transport` 🚗, `cat_home` 🏠, `cat_fun` 🎉

**Категории доходов:** `inc_salary` 💰, `inc_gift` 🎁

**Настройки по умолчанию:** `theme: 'light'`, `baseCurrency: 'RUB'`, `onboardingComplete: false`

---

## 7. PWA и офлайн-режим

- **Service Worker (Workbox)** кэширует статические ресурсы при первой установке
- **IndexedDB** хранит все пользовательские данные локально — приложение работает без сети
- **Web App Manifest** позволяет установить приложение на домашний экран устройства
- Поддерживается **фоновая синхронизация** при восстановлении соединения

---

## 8. AI-слой (умный ассистент)

- Таблица `aiPatterns` хранит обученные паттерны: слово → категория + уверенность
- При вводе («кофе 450 рублей») AI ищет совпадение с `pattern` и предлагает категорию
- Модель **дообучается** на исправлениях пользователя (растёт `confidence` и `usageCount`)
- Дополнительные функции: прогнозы бюджета, поиск аномальных трат, AI-обзор периода, мини-чат по своим финансам
