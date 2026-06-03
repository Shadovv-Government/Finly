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
- Быстрое добавление через нижнюю панель (AI-парсинг естественного языка или ручная форма)
- Голосовой ввод для быстрого добавления (Speech Recognition API)

#### История операций
- Список всех операций с пагинацией
- Фильтры по периоду (день / неделя / месяц / произвольный диапазон)
- Фильтры по категориям
- Поиск по тексту комментария
- Свайп-жесты для быстрых действий (SwipeableRow)

#### Категории
- 9 системных категорий расходов и 4 системных категории доходов
- Системные категории с иконками Lucide React и HEX-цветами
- Поддержка пользовательских категорий с произвольными иконками и цветами
- Защита от удаления системных категорий
- При удалении пользовательской категории — переназначение или удаление связанных транзакций

#### Аналитика
- Баланс за выбранный период
- Расходы и доходы по категориям с круговыми диаграммами (Recharts)
- Графики динамики расходов и доходов (дневные и месячные тренды)
- Сравнение категорий месяц к месяцу (MoM delta)
- Анализ расходов по дням недели
- Паттерны доходов
- Прогноз расходов до конца месяца
- Норма сбережений
- Крупнейшие транзакции
- Средний дневной расход
- Выявление аномальных трат (более 2× от среднего по категории)
- Выявление возможных дубликатов транзакций

### Расширенные возможности

#### Бюджеты и лимиты
- Месячные и недельные бюджеты по категориям
- Индикатор прогресса и предупреждения о перерасходе
- Уведомления при 80% и 100% исчерпания бюджета

#### Цели (копилки)
- Создание финансовых целей с целевой суммой и дедлайном
- Прогресс-бар по каждой цели
- Расчёт необходимого ежемесячного взноса
- Уведомления о достижении цели и приближении дедлайна

#### Повторяющиеся операции
- Шаблоны для регулярных платежей (аренда, подписки)
- Интервалы: daily, weekly, monthly, yearly
- Автоматическое создание транзакций по расписанию (с кулдауном 1 час)
- Отдельный экран управления повторяющимися операциями

#### Уведомления
- Панель уведомлений на дашборде с группировкой по дате (Сегодня/Вчера/На этой неделе/Ранее)
- Persist уведомлений в IndexedDB и статусы read/unread
- 9 типов уведомлений: перерасход бюджета, предупреждение о бюджете, достижение цели, приближение к цели, дедлайн цели, повторяющийся платёж сегодня, предстоящий платёж, аномальная трата, дубликат транзакции
- Действия в уведомлениях с навигацией к соответствующему экрану
- Настройки уведомлений: 4 переключателя (Push, Бюджеты, Цели, Платежи)

#### Сканирование чеков
- **QR-код:** распознавание фискальных чеков ФНС России через BarcodeDetector API (нативный) или jsQR (fallback)
- **AI-распознавание:** Gemini Vision (бесплатный) или Claude Vision (по API-ключу) для высокой точности
- **OCR:** Tesseract.js с поддержкой русского и английского языков
- Автозаполнение суммы, магазина и даты после распознавания
- Ручное редактирование результатов перед подтверждением
- Предупреждение при низкой уверенности распознавания

#### Импорт/экспорт данных
- Экспорт всех данных в JSON (с версией схемы)
- Экспорт транзакций в CSV
- Импорт из JSON с валидацией, проверкой версии и ограничениями (размер файла, количество записей)
- Полная очистка данных

#### Темы и персонализация
- Светлая и тёмная темы (автоматическое переключение по системным настройкам)
- Сохранение предпочтений в IndexedDB
- Кастомизация через CSS-переменные
- Режим reduced motion для доступности
- Аватар пользователя (градиент или своё фото)

#### Биометрическая аутентификация
- Экран блокировки (LockScreen) с WebAuthn (Face ID / Touch ID / fingerprint)
- Авто-lock после 5 минут неактивности (настраивается)
- PIN-код как fallback при недоступности биометрии
- Авто-сброс биометрии при NotFoundError/InvalidStateError
- Настройка биометрии при регистрации и в настройках безопасности
- Кнопка «Войти без биометрии (сброс)» после 3 неудачных попыток

### AI-ассистент

#### Локальный AI (всегда доступен)
- Автокатегоризация операций на основе паттернов (LRU-кэш → пользовательские правила → правиловый движок → ML → fallback)
- Парсинг естественного языка («кофе 450 рублей в Старбаксе»)
- Обучение на исправлениях пользователя (confidence, usageCount)
- 15+ intent-обработчиков для офлайн-чата (баланс, расходы, доходы, бюджеты, цели, прогноз, аномалии, советы и др.)
- Follow-up suggestions после каждого ответа
- Локальная ML-классификация через TensorFlow.js с MC Dropout (оценка неуверенности)
- 24 входных признака, z-score нормализация, 5-уровневый пайплайн классификации
- Фоновое дообучение ML-модели через Background Sync API

#### AI-чат ассистент (онлайн)
- Полноценный чат с финансовым AI-ассистентом на русском языке
- Контекстные ответы на основе реальных данных пользователя (баланс, расходы, бюджеты, цели, платежи)
- Краткие и точные ответы без выдуманных цифр
- Офлайн-режим: при недоступности сервера автоматически переключается на локальный движок
- Быстрые подсказки для начала диалога

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

- **Service Worker (Workbox)** кэширует статические ресурсы и ML-модели
- **IndexedDB** хранит все пользовательские данные локально
- Работа без интернета: приложение полностью функционально offline
- Установка как приложения: добавление на домашний экран
- Web App Manifest с иконками 192×192, 512×512 и 2048×2048
- **Background Sync** для фонового дообучения ML-модели (тэг `finly-fine-tune`)

## Технологии

### Frontend
- **TypeScript 5.4** — строгая типизация
- **React 18.3** — UI-фреймворк
- **React Router 7.13** — клиентская маршрутизация с lazy loading
- **Zustand 4.5** — управление состоянием
- **react-hook-form 7.55** — управление формами
- **TensorFlow.js 4.22** — локальная ML-классификация (MC Dropout, 5-уровневый пайплайн)
- **Tesseract.js 7.0** — OCR для сканирования чеков (rus + eng)
- **jsQR** — декодирование QR-кодов (фискальные чеки ФНС)
- **UI-компоненты:** Radix UI (полный набор из 27+ пакетов), shadcn/ui, cmdk, vaul (bottom sheets), embla-carousel
- **Стили:** Tailwind CSS 4.1, class-variance-authority, tailwind-merge, tw-animate-css
- **Графики:** Recharts 2.15
- **Иконки:** Lucide React 0.487, Material Icons 5.15
- **Анимации:** motion 12.23, canvas-confetti
- **Уведомления:** sonner 2.0
- **Даты:** date-fns 3.6
- **UUID:** uuid 13.0
- **Тема:** next-themes 0.4

### Хранение данных
- **IndexedDB** — браузерная NoSQL-база
- **Dexie.js 3.2** — ORM-обёртка над IndexedDB (3 версии схемы)

### AI и ML
- **Клиентская ML:** TensorFlow.js с кастомным классификатором (WebGL-бэкенд)
- **AI-чат:** OpenRouter API (OpenAI-совместимый) через Vercel Function-прокси
- **AI-распознавание чеков:** Gemini 2.5 Flash (бесплатный) / Claude Vision (по API-ключу)
- **Локальный AI:** правиловый движок, NLP-парсинг, intent-роутер (15+ интентов)

### PWA
- **Vite 6.3** — сборщик проекта
- **vite-plugin-pwa 1.2** — генерация Service Worker (injectManifest) и Manifest
- **Workbox 7.1** — стратегии кэширования (CacheFirst, NetworkFirst, StaleWhileRevalidate)

### Инфраструктура
- **Git** — система контроля версий
- **Деплой:** Vercel (статический SPA + serverless-функция для AI-прокси)
- **CI/CD:** GitHub Actions (3 воркфлоу: CI/CD, Lighthouse, Quality Gates)

### Тестирование
- **Vitest 4.1** — тест-раннер
- **Testing Library** — @testing-library/react, @testing-library/dom, @testing-library/user-event, @testing-library/jest-dom
- **@vitest/coverage-v8** — отчёт покрытия
- **jsdom 29.0** — DOM-окружение
- **fake-indexeddb** — мок IndexedDB для тестов

## Структура проекта

```
finly/
├── api/
│   └── ai-chat.ts                 # Vercel Function: прокси к OpenRouter
├── public/
│   ├── manifest.json               # PWA-манифест
│   ├── favicon.svg                  # Иконка сайта
│   └── icon.png                     # PWA-иконка
├── docs/
│   └── superpowers/                # Планы разработки и спеки
│       ├── plans/                  # Планы реализации
│       └── specs/                  # Дизайн-спецификации
├── .github/workflows/
│   ├── ci.yml                      # Build + test + deploy to Vercel
│   ├── lighthouse.yml              # Lighthouse CI performance audits
│   └── quality.yml                 # Security audit, bundle size, test coverage, PWA validation
├── src/
│   ├── main.tsx                    # Точка входа
│   ├── bootstrap.tsx               # Корневой рендер + lazy seed
│   ├── sw.ts                       # Service Worker (Workbox)
│   ├── app/
│   │   ├── App.tsx                 # Корневой компонент: провайдеры + AuthGuard + recurring processor
│   │   ├── Layout.tsx              # Основной лейаут: Outlet + BottomNav + BottomSheet
│   │   ├── routes.tsx              # Конфигурация React Router с lazy loading
│   │   ├── constants.ts            # Константы и конфигурация
│   │   ├── components/
│   │   │   ├── ui/                 # ~50 компонентов shadcn/ui (button, card, dialog, sheet, sidebar...)
│   │   │   ├── figma/              # Figma-компоненты
│   │   │   ├── AddTransactionForm.tsx
│   │   │   ├── AIQuickInput.tsx
│   │   │   ├── AmountDisplay.tsx
│   │   │   ├── BiometricSetupCard.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── BudgetForm.tsx
│   │   │   ├── CategoryBadge.tsx
│   │   │   ├── CategoryForm.tsx
│   │   │   ├── ContributeBottomSheet.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── GoalForm.tsx
│   │   │   ├── NotificationsPanel.tsx
│   │   │   ├── QuickActionBar.tsx
│   │   │   ├── ReceiptScannerModal.tsx
│   │   │   ├── RecurringTemplateForm.tsx
│   │   │   └── SwipeableRow.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      # Авторизация, профиль пользователя, биометрия
│   │   │   ├── ThemeContext.tsx     # Темы (light/dark/system)
│   │   │   └── SettingsContext.tsx  # Настройки приложения (reduced motion)
│   │   ├── hooks/
│   │   │   ├── useAIChat.ts        # AI-чат (онлайн + офлайн fallback)
│   │   │   ├── useAIInsights.ts    # Инсайты и обзор дашборда
│   │   │   ├── useAnalytics.ts     # Данные аналитики
│   │   │   ├── useBiometric.ts     # WebAuthn биометрический лок
│   │   │   ├── useBudgetNotifications.ts # Генерация уведомлений о бюджетах
│   │   │   ├── useBudgets.ts       # CRUD бюджетов
│   │   │   ├── useCategories.ts    # CRUD категорий
│   │   │   ├── useCountUp.ts       # Анимированный счётчик
│   │   │   ├── useGoals.ts         # CRUD целей
│   │   │   ├── useMLModel.ts       # Интеграция TF.js классификатора
│   │   │   ├── useNotificationPanel.ts # Сборка панели уведомлений
│   │   │   ├── useNotifications.ts # Управление уведомлениями
│   │   │   ├── useReceiptScanner.ts # OCR + QR + AI сканирование чеков
│   │   │   ├── useRecurringTemplates.ts # CRUD повторяющихся платежей
│   │   │   ├── useReducedMotion.ts # Доступность
│   │   │   ├── useSpeechInput.ts   # Голосовой ввод
│   │   │   ├── useTransactionForm.ts # Состояние формы + NLP-парсинг
│   │   │   ├── useTransactions.ts  # CRUD транзакций
│   │   │   ├── chatContext.ts      # Офлайн AI: intent-роутер (15+ интентов)
│   │   │   ├── insightsEngine.ts   # Построитель карточек инсайтов
│   │   │   └── nlpParser.ts        # Извлечение периодов, форматирование
│   │   ├── screens/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TransactionHistory.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Budgets.tsx
│   │   │   ├── Goals.tsx
│   │   │   ├── Categories.tsx
│   │   │   ├── RecurringScreen.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── AddTransaction.tsx
│   │   │   ├── LockScreen.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Registration.tsx
│   │   │   ├── PrivacyPolicy.tsx
│   │   │   ├── TermsOfService.tsx
│   │   │   └── ComponentShowcase.tsx (dev only)
│   │   └── utils/
│   │       ├── animations.ts       # Анимационные утилиты
│   │       ├── dataEvents.ts       # События данных
│   │       ├── errorHandler.ts     # Обработка ошибок (+ тесты)
│   │       ├── formatCurrency.ts   # Форматирование валют (+ тесты)
│   │       ├── imagePreprocess.ts  # Предобработка изображений для OCR
│   │       ├── lucideIcons.tsx     # Динамический рендер иконок Lucide
│   │       ├── notificationIcons.ts # Иконки для типов уведомлений
│   │       ├── notifications.ts    # Helper-функции уведомлений
│   │       └── recurringProcessor.ts # Процессор повторяющихся платежей
│   ├── db/
│   │   ├── db.ts                   # Dexie-конфигурация (FinlyDB, 3 версии схемы)
│   │   ├── types.ts                # TypeScript-типы всех сущностей
│   │   ├── validators.ts           # Валидация данных (русскоязычные сообщения)
│   │   ├── seed.ts                 # Начальные данные (категории) + миграции
│   │   ├── analytics.ts            # ~25 аналитических запросов
│   │   ├── ai.ts                   # AI-автокатегоризация и NLP-парсинг
│   │   ├── recurring.ts            # Обработка повторяющихся платежей
│   │   ├── exportImport.ts         # Экспорт/импорт (JSON с версией, CSV)
│   │   ├── readme.md               # Документация по БД
│   │   └── operations/             # CRUD-операции (модульная структура)
│   │       ├── index.ts            # Ре-экспорт всех операций
│   │       ├── transactions.ts     # CRUD транзакций
│   │       ├── categories.ts       # CRUD категорий
│   │       ├── budgets.ts          # CRUD бюджетов
│   │       ├── goals.ts            # CRUD целей
│   │       ├── recurring.ts        # CRUD шаблонов
│   │       ├── settings.ts         # CRUD настроек
│   │       ├── users.ts            # CRUD пользователей
│   │       ├── aiPatterns.ts       # CRUD AI-паттернов
│   │       ├── biometric.ts        # Биометрические настройки
│   │       └── notifications.ts    # CRUD уведомлений
│   ├── lib/
│   │   ├── classifier/
│   │   │   ├── finly_runtime.ts    # TF.js классификатор v4.3 (MC Dropout)
│   │   │   ├── finly_runtime.test.ts
│   │   │   └── finly_db.ts         # Интеграция классификатора с IndexedDB
│   │   ├── geminiReceiptParser.ts  # Gemini Vision — распознавание чеков
│   │   └── claudeReceiptParser.ts  # Claude Vision — распознавание чеков
│   ├── services/
│   │   └── ai/
│   │       ├── aiClient.ts         # HTTP-клиент к /api/ai-chat
│   │       ├── aiClient.test.ts
│   │       ├── contextBuilder.ts   # Сборка финансового слепка для AI-контекста
│   │       └── contextBuilder.test.ts
│   ├── styles/
│   │   ├── index.css               # Глобальные стили
│   │   ├── theme.css               # CSS-переменные light/dark + Tailwind тема
│   │   ├── tailwind.css            # Tailwind-импорт
│   │   └── fonts.css               # Шрифты
│   └── test/
│       └── setup.ts                # Конфигурация тестов
├── index.html                      # HTML-точка входа (CSP, theme-color, loading spinner)
├── vite.config.ts                  # Vite + PWA + Tailwind + ручные чанки
├── vitest.config.ts                # Конфигурация тестов
├── tsconfig.json                   # Конфигурация TypeScript
├── tsconfig.node.json
├── vercel.json                     # Vercel SPA rewrites
├── .env.example                    # OPENROUTER_API_KEY + OPENROUTER_MODEL
├── .eslintrc.cjs
└── .lighthouserc.cjs
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

Покрытие: 345+ тестов в 27+ тестовых файлах — компоненты (`AddTransactionForm`, `ErrorBoundary`, `ReceiptScannerModal`), хуки (`useCategories`, `useTransactionForm`, `useTransactions`, `useAIChat`, `useReceiptScanner`, `useBudgetNotifications`), утилиты (`errorHandler`, `formatCurrency`, `nlpParser`), операции БД (`transactions`, `categories`, `budgets`, `goals`, `users`), AI-контекст (`chatContext` — 26 тестов, все 20+ интентов), валидаторы, AI-клиент, контекст-билдер, и путь обновления IndexedDB (v1→v2→v3).

Порог покрытия: 50% (branches, functions, lines, statements).

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
- **AppSettings** — key-value хранилище (theme, baseCurrency, onboardingComplete, biometric_*)
- **AIPattern** — pattern, categoryId, confidence (0-1), usageCount
- **User** — id (uuid), name, createdAt, deviceId, avatarColor, avatarDataUrl
- **NotificationItem** — type, title, subtitle, icon, iconColor, iconBg, data (JSON), read, createdAt, expiresAt

## Особенности реализации

### Архитектура
- **Offline-first:** все данные хранятся локально в IndexedDB
- **Отсутствие бэкенда:** приложение полностью клиентское, кроме AI-прокси на Vercel
- **Модульная структура:** разделение на screens, components, contexts, hooks, utils, db/operations
- **Защищённые роуты:** Redirect на /register если пользователь не авторизован; LockScreen если включена биометрия
- **Background Sync:** фоновое дообучение ML-модели через Service Worker

### UI/UX
- Адаптивный дизайн для мобильных и десктопных устройств
- Нижняя панель навигации (BottomNav) для мобильных
- BottomSheet для форм добавления операций
- Свайп-жесты для быстрых действий (SwipeableRow)
- Темная/светлая тема с системным детектированием
- Уведомления через Toaster (Sonner) и панель уведомлений с persist в IndexedDB
- 9 типов уведомлений: бюджеты, цели, дедлайны, повторяющиеся платежи, аномальные траты, дубликаты
- Группировка уведомлений по дате (Сегодня, Вчера, На этой неделе, Ранее)
- Действия в уведомлениях с навигацией к соответствующему экрану
- Настройки уведомлений: 4 переключателя (Push, Бюджеты, Цели, Платежи)
- Red индикатор на колокольчике при непрочитанных уведомлениях
- Аватар пользователя с возможностью загрузки своего фото

### Производительность
- Code splitting через React Router lazy loading
- Агрессивное ручное разделение чанков в vite.config.ts (отдельные чанки для TF.js подсистем, MUI, Recharts, Dexie, Radix UI, Tesseract, motion, date-fns, Lucide, React, Workbox, Zustand)
- Tailwind CSS с tree-shaking
- Кэширование ресурсов через Service Worker (CacheFirst для ML-моделей и шрифтов, NetworkFirst для HTML)
- Индексы в IndexedDB для быстрого поиска
- Terser minification с drop_console и drop_debugger в продакшене
- CSP в index.html: все ресурсы только с `'self'`

## Лицензия

Учебный проект МАИ.
