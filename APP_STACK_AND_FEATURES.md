# Finly — стек технологий и функциональность

## 1) Полный стек технологий

### Язык и основа
- TypeScript
- React 18
- React DOM
- React Router / React Router DOM

### Состояние и формы
- Zustand
- react-hook-form

### Хранение данных (offline-first)
- IndexedDB
- Dexie

### AI / ML / OCR
- @tensorflow/tfjs
- tesseract.js

### UI и дизайн-система
- @mui/material
- @mui/icons-material
- Radix UI:
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
- cmdk
- vaul
- input-otp
- react-day-picker
- react-resizable-panels
- embla-carousel-react

### Стили и визуальные утилиты
- Tailwind CSS
- @tailwindcss/vite
- class-variance-authority
- clsx
- tailwind-merge
- tw-animate-css
- @emotion/react
- @emotion/styled

### Графики, анимации, иконки, уведомления
- recharts
- motion
- canvas-confetti
- lucide-react
- sonner

### Дата, темы, утилиты
- date-fns
- next-themes
- uuid

### PWA и сборка
- Vite
- vite-plugin-pwa
- workbox-window

### Тестирование и качество
- Vitest
- @vitest/coverage-v8
- Testing Library:
  - @testing-library/react
  - @testing-library/dom
  - @testing-library/user-event
  - @testing-library/jest-dom
- jsdom
- fake-indexeddb
- ESLint
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh

### Dev-инструменты и инфраструктура
- TypeScript (tsc)
- @vitejs/plugin-react
- Playwright
- GitHub Actions (CI/CD)
- Vercel (деплой)

## 2) Полный функционал приложения

### Аутентификация и доступ
- Регистрация/вход пользователя.
- Защищённые маршруты.
- Онбординг для новых пользователей.
- Экран блокировки (PIN).
- Биометрическая защита (Face ID / Touch ID через WebAuthn API).

### Управление транзакциями
- Добавление доходов/расходов.
- Редактирование и удаление операций.
- Быстрое добавление из нижней панели.
- Комментарии, категория, дата/время, тип операции и прочие поля транзакции.

### История операций
- Список транзакций.
- Пагинация.
- Фильтрация по периоду (день/неделя/месяц/диапазон).
- Фильтрация по категориям.
- Поиск по комментарию.

### Категории
- Системные категории доходов/расходов.
- Пользовательские категории.
- Настройка иконок и цветов категорий.

### Бюджеты
- Лимиты по категориям.
- Периоды бюджета (неделя/месяц).
- Контроль прогресса и предупреждения о перерасходе.

### Финансовые цели
- Создание целей (сумма, дедлайн, визуальные параметры).
- Отслеживание прогресса накопления.
- Расчёт требуемого ежемесячного взноса.

### Повторяющиеся платежи
- Шаблоны регулярных операций.
- Интервалы: daily / weekly / monthly / yearly.
- Автоматическое создание транзакций по расписанию.
- Экран управления шаблонами.

### Аналитика
- Баланс за период.
- Распределение расходов по категориям.
- Графики динамики.
- Тренды расходов.

### AI-ассистент
- Автокатегоризация операций по паттернам.
- Парсинг естественного языка для создания транзакций.
- Обучение на исправлениях пользователя (confidence, usageCount).
- Рекомендации по бюджету и целям.
- Выявление аномальных трат.
- Локальная ML-классификация текста.

### OCR сканирование чеков
- Распознавание текста чека.
- Поддержка русского и английского языков OCR.
- Автозаполнение данных транзакции по результатам распознавания.

### Уведомления
- Центр уведомлений на дашборде.
- Группировка по времени (сегодня/вчера/неделя/раньше).
- Статусы прочитано/непрочитано.
- Хранение уведомлений в IndexedDB.
- Типы уведомлений: бюджеты, цели, дедлайны, регулярные платежи, аномалии, дубликаты.
- Действия из уведомлений с переходом на соответствующий экран.
- Настройки уведомлений (push, бюджеты, цели, регулярные платежи).

### Экспорт / импорт данных
- Экспорт истории в CSV/JSON.
- Импорт из JSON.

### Настройки и персонализация
- Светлая/тёмная/системная тема.
- Сохранение предпочтений пользователя.
- Настройки безопасности и уведомлений.
- Базовые пользовательские настройки приложения.

### PWA и офлайн-режим
- Полностью клиентская архитектура без обязательного бэкенда.
- Работа офлайн.
- Service Worker и кэширование ресурсов.
- Установка приложения на устройство (home screen).
- Manifest и PWA-метаданные.

### Роутинг и экраны (в приложении)
- Dashboard
- TransactionHistory
- Analytics
- Settings
- Budgets
- Goals
- Recurring
- Categories
- AIAssistant
- AddTransaction
- LockScreen
- Registration
- Onboarding
- PrivacyPolicy
- TermsOfService
- ComponentShowcase (dev-only)

### База данных (сущности)
- transactions
- categories
- budgets
- goals
- recurringTemplates
- settings
- aiPatterns
- users
- notifications
