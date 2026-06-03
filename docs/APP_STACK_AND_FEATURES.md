# Finly — стек технологий и функциональность

## 1) Полный стек технологий

### Язык и основа
- TypeScript 5.4
- React 18.3
- React DOM 18.3
- React Router 7.13

### Состояние и формы
- Zustand 4.5
- react-hook-form 7.55

### Хранение данных (offline-first)
- IndexedDB
- Dexie.js 3.2

### AI / ML / OCR
- @tensorflow/tfjs 4.22 (классификация с MC Dropout)
- tesseract.js 7.0 (OCR, русский + английский)
- jsQR (декодирование QR-кодов фискальных чеков)
- OpenRouter API (AI-чат, через Vercel Function прокси)
- Gemini 2.5 Flash (AI-распознавание чеков, бесплатный)
- Claude Vision API (AI-распознавание чеков, по ключу)

### UI и дизайн-система
- @mui/material 5.15
- @mui/icons-material 5.15
- Radix UI (27+ пакетов):
  - @radix-ui/react-accordion
  - @radix-ui/react-alert-dialog
  - @radix-ui/react-aspect-ratio
  - @radix-ui/react-avatar
  - @radix-ui/react-checkbox
  - @radix-ui/react-collapsible
  - @radix-ui/react-context-menu
  - @radix-ui/react-dialog
  - @radix-ui/react-dropdown-menu
  - @radix-ui/react-hover-card
  - @radix-ui/react-label
  - @radix-ui/react-menubar
  - @radix-ui/react-navigation-menu
  - @radix-ui/react-popover
  - @radix-ui/react-progress
  - @radix-ui/react-radio-group
  - @radix-ui/react-scroll-area
  - @radix-ui/react-select
  - @radix-ui/react-separator
  - @radix-ui/react-slider
  - @radix-ui/react-slot
  - @radix-ui/react-switch
  - @radix-ui/react-tabs
  - @radix-ui/react-toggle
  - @radix-ui/react-toggle-group
  - @radix-ui/react-tooltip
- shadcn/ui (~50 компонентов: button, card, dialog, sheet, sidebar, breadcrumb, pagination, skeleton, table...)
- cmdk
- vaul
- input-otp
- react-day-picker
- react-resizable-panels
- embla-carousel-react

### Стили и визуальные утилиты
- Tailwind CSS 4.1
- @tailwindcss/vite
- class-variance-authority
- clsx
- tailwind-merge
- tw-animate-css
- @emotion/react
- @emotion/styled

### Графики, анимации, иконки, уведомления
- recharts 2.15
- motion 12.23
- canvas-confetti 1.9
- lucide-react 0.487
- sonner 2.0

### Дата, темы, утилиты
- date-fns 3.6
- next-themes 0.4
- uuid 13.0

### PWA и сборка
- Vite 6.3
- vite-plugin-pwa 1.2 (injectManifest режим)
- workbox-window 7.1

### Тестирование и качество
- Vitest 4.1
- @vitest/coverage-v8
- Testing Library (react, dom, user-event, jest-dom)
- jsdom 29.0
- fake-indexeddb
- ESLint 8.57
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- Playwright

### Dev-инструменты и инфраструктура
- TypeScript (tsc)
- @vitejs/plugin-react
- GitHub Actions (3 воркфлоу: CI/CD, Lighthouse, Quality Gates)
- Vercel (деплой: статический SPA + serverless-функция)

## 2) Полный функционал приложения

### Аутентификация и доступ
- Регистрация пользователя с именем и аватаром.
- Защищённые маршруты (ProtectedRoute).
- Онбординг для новых пользователей.
- Экран блокировки (LockScreen) с WebAuthn (Face ID / Touch ID / fingerprint).
- PIN-код как fallback при недоступности биометрии.
- Авто-lock после 5 минут неактивности.
- Авто-сброс биометрии при NotFoundError/InvalidStateError.
- Кнопка «Войти без биометрии (сброс)» после 3 неудачных попыток.

### Управление транзакциями
- Добавление доходов/расходов через AI-парсинг естественного языка или ручную форму.
- Редактирование и удаление операций.
- Быстрое добавление из нижней панели (AIQuickInput).
- Голосовой ввод (Speech Recognition API).
- Комментарии, категория, дата/время, тип операции, валюта, курс.
- ML-автокатегоризация (5-уровневый пайплайн: LRU-кэш → правила → ML → fallback).

### История операций
- Список транзакций с пагинацией.
- Фильтрация по периоду (день/неделя/месяц/диапазон).
- Фильтрация по категориям.
- Поиск по комментарию.
- Свайп-жесты для быстрых действий (SwipeableRow).

### Категории
- 9 системных категорий расходов + 4 системных категории доходов.
- Пользовательские категории с произвольными иконками и цветами.
- Защита от удаления системных категорий.
- При удалении — переназначение или удаление связанных транзакций.
- Поддержка подкатегорий (parentId).

### Бюджеты
- Лимиты по категориям на месяц или неделю.
- Контроль прогресса и предупреждения о перерасходе.
- Уведомления при 80% и 100% исчерпания.
- Дедупликация уведомлений (24ч кулдаун).

### Финансовые цели
- Создание целей (сумма, дедлайн, иконка, цвет).
- Отслеживание прогресса накопления.
- Расчёт требуемого ежемесячного взноса.
- Возможность вносить вклад (ContributeBottomSheet).
- Уведомления о достижении и приближении дедлайна.

### Повторяющиеся платежи
- Шаблоны регулярных операций.
- Интервалы: daily / weekly / monthly / yearly.
- Автоматическое создание транзакций по расписанию (кулдаун 1 час).
- Экран управления шаблонами (RecurringScreen).
- Ручное создание транзакции из шаблона.

### Аналитика
- Баланс за период (включая сбережения).
- Распределение расходов и доходов по категориям (круговые диаграммы).
- Дневные и месячные тренды расходов и доходов.
- Сравнение категорий месяц к месяцу (MoM delta).
- Анализ расходов по дням недели.
- Паттерны доходов.
- Прогноз расходов до конца месяца.
- Норма сбережений.
- Крупнейшие транзакции.
- Средний дневной расход.
- Выявление аномальных трат (> 2× от среднего по категории).
- Выявление возможных дубликатов транзакций.

### AI-ассистент
- Автокатегоризация операций по паттернам (findBestMatch).
- Парсинг естественного языка для создания транзакций (parseNaturalLanguage).
- Обучение на исправлениях пользователя (confidence, usageCount).
- Рекомендации по бюджету и целям.
- Выявление аномальных трат и дубликатов.
- Локальная ML-классификация (TensorFlow.js, MC Dropout, 24 признака).
- Онлайн AI-чат через OpenRouter API (прокси через Vercel Function).
- Офлайн-режим: intent-роутер с 15+ обработчиками (баланс, расходы, доходы, бюджеты, цели, прогноз, аномалии, советы, сравнение и др.).
- Follow-up suggestions после каждого ответа.
- Быстрые подсказки для начала диалога.
- Фоновое дообучение ML-модели через Background Sync API.

### Сканирование чеков
- **QR-код:** распознавание фискальных чеков ФНС России (BarcodeDetector API / jsQR fallback).
- **AI-распознавание:** Gemini 2.5 Flash (бесплатный) или Claude Vision (по ключу).
- **OCR:** Tesseract.js с поддержкой русского и английского языков.
- Предобработка изображений (imagePreprocess.ts).
- Автозаполнение суммы, магазина и даты.
- Ручное редактирование результатов перед подтверждением.
- Предупреждение при низкой уверенности распознавания.

### Уведомления
- Центр уведомлений на дашборде (NotificationsPanel).
- Группировка по времени (сегодня/вчера/неделя/раньше).
- Статусы прочитано/непрочитано с persist в IndexedDB.
- 9 типов уведомлений: budget-overrun, budget-warning, goal-done, goal-near, goal-deadline, recurring-due, recurring-upcoming, anomalous-expense, duplicate-transaction.
- Действия из уведомлений с переходом на соответствующий экран.
- Настройки уведомлений (Push, Бюджеты, Цели, Регулярные платежи).
- Красный индикатор на колокольчике при непрочитанных.
- Авто-очистка просроченных уведомлений.

### Экспорт / импорт данных
- Экспорт всех данных в JSON (с версией схемы).
- Экспорт транзакций в CSV.
- Импорт из JSON с валидацией и проверкой версии.
- Ограничения: размер файла, количество записей.
- Полная очистка данных.

### Настройки и персонализация
- Светлая/тёмная/системная тема.
- Сохранение предпочтений в IndexedDB.
- Настройки безопасности (биометрия).
- Настройки уведомлений (4 переключателя).
- Аватар пользователя (градиент или своё фото).
- Режим reduced motion.
- Базовая валюта.

### PWA и офлайн-режим
- Полностью клиентская архитектура (кроме AI-прокси на Vercel).
- Полная работа офлайн.
- Service Worker с кэшированием (Workbox).
- Установка приложения на устройство (home screen).
- Manifest и PWA-метаданные (иконки 192, 512, 2048).
- Background Sync для ML-дообучения (тэг `finly-fine-tune`).
- App shortcuts: «Добавить расход», «Добавить доход».

### Роутинг и экраны (16 экранов)
- Dashboard
- TransactionHistory
- Analytics
- Settings
- Budgets
- Goals
- RecurringScreen
- Categories
- AIAssistant
- AddTransaction
- LockScreen
- Registration
- Onboarding
- PrivacyPolicy
- TermsOfService
- ComponentShowcase (dev-only)

### База данных (9 таблиц, Dexie v3)
- transactions
- categories
- budgets
- goals
- recurringTemplates
- settings
- aiPatterns
- users
- notifications
