# База данных Finly

Локальная база данных **IndexedDB** для PWA-приложения Finly — персонального финансового менеджера с поддержкой офлайн-режима и AI-функциями.

Построена на **Dexie.js** для типобезопасного и реактивного доступа к данным.

---

## Быстрый старт

```ts
import { db } from './db';
import { seedDatabase } from './seed';

// Инициализация при запуске приложения
await seedDatabase();

// Добавить транзакцию
await db.transactions.add({
  amount: 450,
  type: 'expense',
  categoryId: 'cat_food',
  date: Date.now(),
  comment: 'кофе в Старбаксе',
  currency: 'RUB',
  rate: 1,
  createdAt: Date.now(),
});
```

---

## Схема базы данных

**Имя базы:** `FinlyDB`

| Таблица | Ключ | Описание |
|---------|------|----------|
| [`transactions`](#transactions) | `id` (auto) | Все операции доходов и расходов |
| [`categories`](#categories) | `id` (string) | Справочник категорий (системные + пользовательские) |
| [`budgets`](#budgets) | `id` (auto) | Лимиты расходов по категориям |
| [`goals`](#goals) | `id` (auto) | Финансовые цели с отслеживанием прогресса |
| [`recurringTemplates`](#recurringtemplates) | `id` (auto) | Шаблоны для автодобавления регулярных платежей |
| [`settings`](#settings) | `key` | Настройки приложения (тема, валюта и др.) |
| [`aiPatterns`](#aipatterns) | `id` (auto) | Данные для AI-автокатегоризации |

---

## Таблицы

### transactions
Основная таблица для всех финансовых операций.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | number | Автоинкрементируемый первичный ключ |
| `amount` | number | Сумма операции |
| `type` | `'income' \| 'expense'` | Тип операции (доход/расход) |
| `categoryId` | string | FK → `categories.id` |
| `date` | number | Unix-timestamp операции |
| `comment` | string? | Текстовый комментарий (используется AI) |
| `currency` | string | Код валюты (`RUB`, `USD`, `EUR`) |
| `rate` | number | Курс к базовой валюте |
| `createdAt` | number | Timestamp создания записи |
| `templateId` | number? | FK → `recurringTemplates.id` (если авто-создано) |

**Индексы:** `id`, `date`, `categoryId`, `type`, `createdAt`

**Примеры запросов:**
```ts
// Расходы за текущий месяц
const startOfMonth = new Date(new Date().setDate(1)).getTime();
const expenses = await db.transactions
  .where('date').above(startOfMonth)
  .and(t => t.type === 'expense')
  .toArray();

// По категории
const foodSpend = await db.transactions
  .where({ categoryId: 'cat_food', type: 'expense' })
  .toArray();
```

---

### categories
Справочник для классификации транзакций.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | UUID (`cat_food`, `inc_salary`, и т.д.) |
| `name` | string | Отображаемое название |
| `type` | `'income' \| 'expense'` | Тип категории |
| `icon` | string | Эмодзи или имя иконки MUI |
| `color` | string | HEX-код цвета для визуализации |
| `isSystem` | boolean | Системные категории нельзя удалить |
| `parentId` | string? | Родительская категория для иерархии |

**Индексы:** `id`, `type`, `isSystem`

---

### budgets
Лимиты расходов с отслеживанием периодов.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | number | Автоинкрементируемый ID |
| `categoryId` | string | FK → `categories.id` |
| `amount` | number | Лимит бюджета |
| `period` | `'week' \| 'month'` | Период бюджета |
| `startDate` | number | Timestamp начала периода |
| `currency` | string | Код валюты |

**Индексы:** `id`, `categoryId`, `period`, `startDate`

**Использование:** Отслеживание перерасхода с индикаторами прогресса в UI.

---

### goals
Финансовые цели («копилки») с отслеживанием прогресса.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | number | Автоинкрементируемый ID |
| `name` | string | Название цели |
| `targetAmount` | number | Целевая сумма |
| `currentAmount` | number | Текущий прогресс |
| `deadline` | number? | Timestamp дедлайна |
| `icon` | string | Эмодзи или иконка |
| `color` | string | HEX-код цвета |
| `isActive` | boolean | Активные цели отображаются в UI |

**Индексы:** `id`, `isActive`, `deadline`

**Использование:** Расчёт необходимого ежемесячного вклада для достижения цели к дедлайну.

---

### recurringTemplates
Шаблоны для автоматического создания регулярных транзакций (подписки, аренда и т.п.).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | number | Автоинкрементируемый ID |
| `amount` | number | Сумма операции |
| `type` | `'income' \| 'expense'` | Тип операции |
| `categoryId` | string | FK → `categories.id` |
| `interval` | `'daily' \| 'weekly' \| 'monthly' \| 'yearly'` | Интервал повторения |
| `nextDate` | number | Timestamp следующего платежа |
| `isActive` | boolean | Активные шаблоны обрабатываются автоматически |
| `comment` | string? | Комментарий |

**Индексы:** `id`, `nextDate`, `isActive`

**Использование:** Service worker или фоновая задача проверяет `nextDate` и авто-создаёт транзакции.

---

### settings
Хранилище ключ-значение для конфигурации приложения.

| Поле | Тип | Описание |
|------|-----|----------|
| `key` | string | Идентификатор настройки |
| `value` | any | Значение (JSON-сериализуемое) |

**Индексы:** `key`

**Настройки по умолчанию (seed):**
| Ключ | Значение | Описание |
|------|----------|----------|
| `theme` | `'light'` | Тема UI (`light` / `dark`) |
| `baseCurrency` | `'RUB'` | Базовая валюта для расчётов |
| `onboardingComplete` | `false` | Флаг первого запуска |

---

### aiPatterns
Данные машинного обучения для интеллектуальной автокатегоризации.

Обеспечивает работу «умного ассистента»:
- Парсит свободный ввод («кофе 450 рублей в Старбаксе»)
- Учится на исправлениях пользователя
- Повышает точность категоризации со временем

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | number | Автоинкрементируемый ID |
| `pattern` | string | Ключевое слово/фраза (например, «старбакс», «uber») |
| `categoryId` | string | FK → `categories.id` |
| `confidence` | number | Уверенность модели (0–1) |
| `usageCount` | number | Количество успешных совпадений |

**Индексы:** `id`, `pattern`, `categoryId`

**Как работает:**
1. Пользователь вводит «кофе 450 старбакс»
2. AI извлекает паттерн «старбакс» → находит совпадение в `aiPatterns.pattern`
3. Возвращает `categoryId` с оценкой уверенности
4. После подтверждения пользователя увеличивает `usageCount` и повышает confidence

---

## Начальные данные

При первом запуске `seedDatabase()` заполняет:

### Категории по умолчанию

**Расходы:**
| ID | Название | Иконка | Цвет |
|----|----------|--------|------|
| `cat_food` | Еда | 🍔 | #FF5722 |
| `cat_transport` | Транспорт | 🚗 | #2196F3 |
| `cat_home` | Жильё | 🏠 | #795548 |
| `cat_fun` | Развлечения | 🎉 | #E91E63 |

**Доходы:**
| ID | Название | Иконка | Цвет |
|----|----------|--------|------|
| `inc_salary` | Зарплата | 💰 | #4CAF50 |
| `inc_gift` | Подарок | 🎁 | #9C27B0 |

### Настройки по умолчанию
```ts
[
  { key: 'theme', value: 'light' },
  { key: 'baseCurrency', value: 'RUB' },
  { key: 'onboardingComplete', value: false },
]
```

---

## Архитектурные заметки

### Offline-first
Все данные хранятся локально в IndexedDB, что обеспечивает:
- Полную функциональность без интернета
- Мгновенную загрузку
- Поддержку PWA-установки

### Поток данных
```
Ввод пользователя → Транзакция → Обучение AI → Аналитика
                        ↓
            Отслеживание бюджета → Уведомления о перерасходе
                        ↓
            Прогресс целей → Рекомендации
```

### Версионирование
Текущая схема: **v1**

Для миграции:
```ts
this.version(2).stores({
  // Добавить новые таблицы или индексы
});
```

---

## Связанные файлы

- [Главный README](../../README.md) — Обзор проекта и возможности
- [types.ts](./types.ts) — TypeScript-интерфейсы
- [db.ts](./db.ts) — Определение класса базы данных
- [seed.ts](./seed.ts) — Начальное заполнение данными
