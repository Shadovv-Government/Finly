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
- Базовый набор категорий (еда, транспорт, жильё, развлечения)
- Системные категории с иконками Lucide React и HEX-цветами
- Поддержка пользовательских категорий

#### Аналитика
- Баланс за выбранный период
- Расходы по категориям с круговыми диаграммами
- Графики динамики (Recharts, Chart.js)
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

#### Импорт/экспорт данных
- Экспорт операций в CSV/JSON
- Импорт из JSON для переноса истории

#### Темы и персонализация
- Светлая и тёмная темы (автоматическое переключение по системным настройкам)
- Сохранение предпочтений в localStorage
- Кастомизация через CSS-переменные

### AI-ассистент

- Автокатегоризация операций на основе паттернов
- Парсинг естественного языка («кофе 450 рублей в Старбаксе»)
- Обучение на исправлениях пользователя (confidence, usageCount)
- Рекомендации по бюджету и целям
- Поиск аномальных трат

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
- **UI-компоненты:** Radix UI, shadcn/ui
- **Стили:** Tailwind CSS 4.1.12
- **Графики:** Recharts 2.15.2, Chart.js 4.4.2
- **Иконки:** Lucide React 0.487.0, Material Icons 5.15.15

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
│   │   │   └── EmptyState.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx # Авторизация и профиль пользователя
│   │   │   └── ThemeContext.tsx # Темы (light/dark/system)
│   │   ├── hooks/              # Кастомные React-хуки
│   │   ├── screens/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TransactionHistory.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Budgets.tsx
│   │   │   ├── Goals.tsx
│   │   │   ├── Categories.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Registration.tsx
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
│   │   ├── operations.ts       # CRUD-операции
│   │   ├── analytics.ts        # Аналитические запросы
│   │   ├── ai.ts               # AI-автокатегоризация
│   │   ├── recurring.ts        # Повторяющиеся платежи
│   │   ├── exportImport.ts     # Экспорт/импорт данных
│   │   ├── validators.ts       # Валидация данных
│   │   ├── seed.ts             # Начальные данные (категории)
│   │   └── readme.md           # Документация по БД
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
└── vercel.json                 # Настройки деплоя
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск сервера разработки (Vite) |
| `npm run build` | Сборка для продакшена (tsc + vite build) |
| `npm run preview` | Предпросмотр продакшен-сборки |
| `npm run lint` | Проверка кода ESLint |

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

### Сущности

- **Transaction** — сумма, тип, categoryId, дата, валюта, курс, комментарий, templateId
- **Category** — uuid, name, type, icon (Lucide), color, isSystem, parentId
- **Budget** — categoryId, amount, period (week/month), startDate, currency
- **Goal** — name, targetAmount, currentAmount, deadline, icon, color, isActive
- **RecurringTemplate** — amount, type, categoryId, interval, nextDate, isActive, comment
- **AppSettings** — key-value хранилище (theme, baseCurrency, onboardingComplete)
- **AIPattern** — pattern, categoryId, confidence (0-1), usageCount
- **User** — id (uuid), name, createdAt, deviceId, avatarColor

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
- Уведомления через Toaster (Sonner)

### Производительность
- Code splitting через React Router
- Tailwind CSS с tree-shaking
- Кэширование ресурсов через Service Worker
- Индексы в IndexedDB для быстрого поиска

## Лицензия

Учебный проект МАИ.
