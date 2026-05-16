# Finly

Finly — это PWA-приложение для управления личными финансами с офлайн-поддержкой и AI-ассистентом. Учебный проект (МАИ, 01.03.02 — Прикладная математика и информатика).

## Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Запуск в режиме разработки
```bash
npm run dev
```

### Сборка для продакшена
```bash
npm run build
```

### Предпросмотр продакшен-сборки
```bash
npm run preview
```

### Проверка качества
```bash
npm run lint
npm test
npm run test:coverage
```

## Функциональность

### Основные возможности

#### Операции
- Добавление доходов и расходов через форму с полями: сумма, тип, категория, дата/время, комментарий
- Редактирование и удаление операций
- Быстрое добавление через нижнюю панель навигации

#### История операций
- Список всех операций с пагинацией
- Фильтры по периоду (день / неделя / месяц / произвольный диапазон)
- Фильтры по категориям
- Поиск по тексту комментария

#### Категории
- Расширенный системный набор категорий доходов и расходов
- Системные категории с иконками Lucide React и HEX-цветами
- Поддержка пользовательских категорий

#### Аналитика
- Баланс за выбранный период
- Расходы по категориям с круговыми диаграммами
- Графики динамики (Recharts)
- Тренды расходов

### Расширенные возможности

#### Бюджеты и лимиты
- Месячные и недельные бюджеты по категориям
- Индикатор прогресса и предупреждения о перерасходе

#### Цели и «копилки»
- Создание финансовых целей с целевой суммой и дедлайном
- Прогресс-бар по каждой цели
- Расчёт необходимого ежемесячного взноса

#### Повторяющиеся операции
- Шаблоны для регулярных платежей (аренда, подписки)
- Интервалы: daily, weekly, monthly, yearly
- Автодобавление по расписанию
- Отдельный экран управления повторяющимися операциями

#### Уведомления
- Панель уведомлений на дашборде с группировкой по дате
- Persist уведомлений в IndexedDB и статусы read/unread
- Сигналы о перерасходе бюджета, дедлайнах целей, повторяющихся платежах и аномальных тратах

#### Сканирование чеков
- OCR-сканирование чеков через Tesseract.js
- Автозаполнение суммы, комментария и даты после распознавания
- Поддержка русского и английского языков

#### Импорт/экспорт данных
- Экспорт операций в CSV/JSON
- Импорт из JSON для переноса истории

#### Темы и персонализация
- Светлая и тёмная темы (автоматическое переключение по системным настройкам)
- Сохранение предпочтений в localStorage
- Кастомизация через CSS-переменные

#### Биометрическая аутентификация
- Экран блокировки (LockScreen) с PIN-кодом
- Настройка биометрии (BiometricSetupCard) — Face ID / Touch ID через Web Authentication API
- Включение/отключение в настройках безопасности

### AI-ассистент

#### Локальный AI (всегда доступен)
- Автокатегоризация операций на основе паттернов
- Парсинг естественного языка («кофе 450 рублей в Старбаксе»)
- Обучение на исправлениях пользователя (confidence, usageCount)
- Рекомендации по бюджету и целям
- Поиск аномальных трат
- Локальная ML-классификация текста операций (TensorFlow.js)

#### AI-чат ассистент (премиум)
- Полноценный чат с финансовым AI-ассистентом на русском языке
- Контекстные ответы на основе реальных данных пользователя (баланс, расходы, бюджеты)
- Краткие и точные ответы без выдуманных цифр
- Офлайн-режим: при недоступности сервера переключается на локальные ответы

**Как это работает под капотом:**

```
Пользователь → React (useAIChat) → /api/ai-chat → Vercel Function → OpenRouter API → LLM
                                                                          ↑
                                                              OPENROUTER_API_KEY
                                                              (только на сервере)
```

1. Клиент (`src/services/ai/aiClient.ts`) отправляет запрос на endpoint `/api/ai-chat` — **без API-ключа**
2. Vercel Function (`api/ai-chat.ts`) достаёт ключ из серверной переменной окружения `OPENROUTER_API_KEY` и проксирует запрос к OpenRouter
3. Ответ возвращается клиенту — ключ никогда не покидает сервер и не виден в JS-бандле
4. При ошибке сети или недоступности сервера `useAIChat` автоматически переключается на офлайн-режим (`chatContext.ts`)

**Настройка:**

1. Установи Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Привяжи проект к Vercel:
   ```bash
   vercel link
   ```

3. Добавь серверную переменную с API-ключом OpenRouter:
   ```bash
   vercel env add OPENROUTER_API_KEY
   ```
   Или через дашборд: Project → Settings → Environment Variables → добавь `OPENROUTER_API_KEY` со значением ключа.

   Опционально можно указать модель:
   ```bash
   vercel env add OPENROUTER_MODEL
   ```
   По умолчанию используется `openai/gpt-4o-mini`.

4. Запуск с работающим AI-чатом (локально):
   ```bash
   npm run dev:full
   ```
   Эта команда запускает `vercel dev`, который поднимает и Vite-сервер, и Vercel Function одновременно.

   Обычный `npm run dev` по-прежнему работает — AI-чат просто будет уходить в офлайн-режим.

**Почему ключ в безопасности:**

| Раньше (VITE_OPENROUTER_API_KEY) | Теперь (OPENROUTER_API_KEY) |
|-----------------------------------|------------------------------|
| Встраивался в JS-бандл при сборке | Живёт только в `process.env` на сервере Vercel |
| Виден любому через DevTools → Sources | Недоступен из браузера |
| Утекал при каждом `npm run build` | Не попадает в клиентский код |

## PWA и Offline

- **Service Worker (Workbox)** кэширует статические ресурсы
- **IndexedDB** хранит все пользовательские данные локально
- Работа без интернета: приложение полностью функционально offline
- Установка как приложения: добавление на домашний экран
- Web App Manifest с иконками 192x192 и 512x512

## Технологии

### Frontend
- **TypeScript** — строгая типизация
- **React 18.3.1** — UI-фреймворк
- **React Router 7.13.1** — клиентская маршрутизация
- **Zustand 4.5.2** — управление состоянием
- **react-hook-form 7.55.0** — управление формами
- **TensorFlow.js 4.22.0** — локальная ML-классификация
- **Tesseract.js 7.0.0** — OCR для сканирования чеков
- **UI-компоненты:** Radix UI (полный набор), shadcn/ui, cmdk, vaul (bottom sheets), embla-carousel
- **Стили:** Tailwind CSS 4.1.12, class-variance-authority, tailwind-merge
- **Графики:** Recharts 2.15.2
- **Иконки:** Lucide React 0.487.0, Material Icons 5.15.15
- **Анимации:** motion 12.23.24, canvas-confetti
- **Уведомления:** sonner 2.0.3
- **Даты:** date-fns 3.6.0
- **Жесты и свайпы:** кастомные компоненты (например, `SwipeableRow`)

### Хранение данных
- **IndexedDB** — браузерная NoSQL-база
- **Dexie.js 3.2.7** — ORM-обёртка над IndexedDB

### PWA
- **Vite 6.3.5** — сборщик проекта
- **vite-plugin-pwa 1.2.0** — генерация Service Worker и Manifest
- **Workbox** — стратегии кэширования

### Инфраструктура
- **Git** — система контроля версий
- **Деплой:** Vercel
- **CI/CD:** GitHub Actions (build + test при push/PR)

### Тестирование
- **Vitest 4.1.1** — тест-раннер
- **Testing Library** — @testing-library/react, @testing-library/dom, @testing-library/user-event, @testing-library/jest-dom
- **@vitest/coverage-v8** — отчёт покрытия
- **jsdom 29.0.1** — DOM-окружение

## Структура проекта

```
finly/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── ui/             # Базовые компоненты (shadcn/ui)
│   │   │   ├── figma/          # Figma-компоненты
│   │   │   ├── AddTransactionForm.tsx
│   │   │   ├── AmountDisplay.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── CategoryBadge.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── NotificationsPanel.tsx
│   │   │   └── ReceiptScannerModal.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx # Авторизация и профиль пользователя
│   │   │   ├── SettingsContext.tsx # Настройки приложения (локальные/сессионные)
│   │   │   └── ThemeContext.tsx # Темы (light/dark/system)
│   │   ├── hooks/              # Кастомные React-хуки
│   │   │   ├── useAnalytics.ts
│   │   │   ├── useBiometric.ts
│   │   │   ├── useBudgets.ts
│   │   │   ├── useCategories.ts
│   │   │   ├── useGoals.ts
│   │   │   ├── useNotificationPanel.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useReceiptScanner.ts
│   │   │   ├── useRecurringTemplates.ts
│   │   │   ├── useSpeechInput.ts
│   │   │   ├── useTransactionForm.ts
│   │   │   └── useTransactions.ts
│   │   ├── screens/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TransactionHistory.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Budgets.tsx
│   │   │   ├── Goals.tsx
│   │   │   ├── RecurringScreen.tsx
│   │   │   ├── Categories.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Registration.tsx
│   │   │   ├── AddTransaction.tsx
│   │   │   ├── LockScreen.tsx
│   │   │   ├── PrivacyPolicy.tsx
│   │   │   ├── TermsOfService.tsx
│   │   │   └── ComponentShowcase.tsx
│   │   ├── data/               # Данные и константы
│   │   ├── App.tsx             # Корневой компонент с провайдерами
│   │   ├── Layout.tsx          # Лейаут с нижней навигацией
│   │   └── routes.tsx          # Маршрутизация (react-router)
│   ├── db/
│   │   ├── db.ts               # Dexie-конфигурация (FinlyDB)
│   │   ├── types.ts            # TypeScript-типы сущностей
│   │   ├── validators.ts       # Валидация данных
│   │   ├── seed.ts             # Начальные данные (категории)
│   │   ├── readme.md           # Документация по БД
│   │   ├── operations/         # CRUD-операции (модульная структура)
│   │   │   ├── index.ts
│   │   │   ├── transactions.ts
│   │   │   ├── categories.ts
│   │   │   ├── budgets.ts
│   │   │   ├── goals.ts
│   │   │   ├── recurring.ts
│   │   │   ├── settings.ts
│   │   │   ├── users.ts
│   │   │   ├── aiPatterns.ts
│   │   │   ├── biometric.ts
│   │   │   └── notifications.ts
│   │   ├── analytics.ts        # Аналитические запросы
│   │   ├── ai.ts               # AI-автокатегоризация
│   │   └── exportImport.ts     # Экспорт/импорт данных
│   ├── styles/
│   │   ├── index.css           # Основные стили
│   │   ├── tailwind.css        # Tailwind-конфигурация
│   │   ├── theme.css           # CSS-переменные тем
│   │   └── fonts.css           # Шрифты
│   └── main.tsx                # Точка входа
├── public/
│   ├── manifest.json           # PWA-манифест
│   ├── pwa-192x192.svg         # Иконка 192x192
│   ├── pwa-512x512.svg         # Иконка 512x512
│   └── favicon.svg
├── index.html                  # HTML-шаблон
├── vite.config.ts              # Конфигурация Vite + PWA
├── tsconfig.json               # Конфигурация TypeScript
├── tsconfig.node.json          # Конфигурация TypeScript (node)
├── package.json                # Зависимости и скрипты
├── api/
│   └── ai-chat.ts              # Vercel Function: прокси к OpenRouter
└── vercel.json                 # Настройки деплоя
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск сервера разработки (Vite) |
| `npm run dev:full` | Запуск с Vercel Function (AI-чат работает) |
| `npm run build` | Сборка для продакшена (tsc + vite build) |
| `npm run preview` | Предпросмотр продакшен-сборки |
| `npm run lint` | Проверка кода ESLint |
| `npm run test` | Запуск тестов (Vitest) |
| `npm run test:watch` | Тесты в режиме наблюдения |
| `npm run test:ui` | Тесты с UI (Vitest UI) |
| `npm run test:coverage` | Тесты с отчётом покрытия |

## Тестирование

Проект использует **Vitest** + **Testing Library** (React, DOM, jest-dom, user-event). Тесты покрывают компоненты, хуки, утилиты и операции с БД.

```bash
npm run test        # однократный запуск
npm run test:watch  # режим наблюдения
npm run test:ui     # визуальный UI
```

Покрытие: 10+ тестовых файлов — компоненты (`AddTransactionForm`, `ErrorBoundary`), хуки (`useCategories`, `useTransactionForm`, `useTransactions`), утилиты (`errorHandler`, `formatCurrency`), операции БД (`categories`, `transactions`) и валидаторы.

CI/CD: сборка и тесты запускаются автоматически через GitHub Actions при push и pull request.

## База данных

### Таблицы

| Таблица | Primary Key | Индексы | Описание |
|---------|-------------|---------|----------|
| `transactions` | `++id` | `date, categoryId, type, createdAt` | Финансовые операции |
| `categories` | `id` (string) | `type, isSystem` | Категории (доходы/расходы) |
| `budgets` | `++id` | `categoryId, period, startDate` | Лимиты по категориям |
| `goals` | `++id` | `isActive, deadline` | Финансовые цели |
| `recurringTemplates` | `++id` | `nextDate, isActive` | Шаблоны повторяющихся платежей |
| `settings` | `key` (string) | — | Настройки приложения |
| `aiPatterns` | `++id` | `pattern, categoryId` | Паттерны автокатегоризации |
| `users` | `id` (string) | `createdAt` | Профиль пользователя |
| `notifications` | `++id` | `type, read, createdAt, expiresAt` | Уведомления с persist/read-state |

### Сущности

- **Transaction** — сумма, тип, categoryId, дата, валюта, курс, комментарий, templateId
- **Category** — uuid, name, type, icon (Lucide), color, isSystem, parentId
- **Budget** — categoryId, amount, period (week/month), startDate, currency
- **Goal** — name, targetAmount, currentAmount, deadline, icon, color, isActive
- **RecurringTemplate** — amount, type, categoryId, interval, nextDate, isActive, comment
- **AppSettings** — key-value хранилище (theme, baseCurrency, onboardingComplete)
- **AIPattern** — pattern, categoryId, confidence (0-1), usageCount
- **User** — id (uuid), name, createdAt, deviceId, avatarColor
- **NotificationItem** — type, title, subtitle, icon/meta, read, createdAt, expiresAt

## Особенности реализации

### Архитектура
- **Offline-first:** все данные хранятся локально в IndexedDB
- **Отсутствие бэкенда:** приложение полностью клиентское
- **Модульная структура:** разделение на screens, components, contexts, hooks
- **Защищённые роуты:** Redirect на /register если пользователь не авторизован

### UI/UX
- Адаптивный дизайн для мобильных и десктопных устройств
- Нижняя панель навигации (BottomNav) для мобильных
- BottomSheet для форм добавления операций
- Темная/светлая тема с системным детектированием
- Уведомления через Toaster (Sonner) и панель уведомлений с persist в IndexedDB
- 9 типов уведомлений: бюджеты, цели, дедлайны, повторяющиеся платежи, аномальные траты, дубликаты
- Группировка уведомлений по дате (Сегодня, Вчера, На этой неделе, Ранее)
- Действия в уведомлениях с навигацией к соответствующему экрану
- Настройки уведомлений: 4 переключателя (Push, Бюджеты, Цели, Платежи)

### Производительность
- Code splitting через React Router
- Tailwind CSS с tree-shaking
- Кэширование ресурсов через Service Worker
- Индексы в IndexedDB для быстрого поиска

## Лицензия

Учебный проект МАИ.
