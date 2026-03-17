# База данных Finly

## Обзор

Finly использует **IndexedDB** через библиотеку **Dexie.js** для локального хранения данных PWA-приложения по управлению личными финансами.

## Структура БД

**Название:** `FinlyDB`

### Таблицы

| Таблица | Primary Key | Индексы | Описание |
|---------|-------------|---------|----------|
| `transactions` | `++id` | `date`, `categoryId`, `type`, `createdAt` | Финансовые операции |
| `categories` | `id` (string) | `type`, `isSystem` | Категории доходов/расходов |
| `budgets` | `++id` | `categoryId`, `period`, `startDate` | Лимиты по категориям |
| `goals` | `++id` | `isActive`, `deadline` | Финансовые цели |
| `recurringTemplates` | `++id` | `nextDate`, `isActive` | Шаблоны повторяющихся платежей |
| `settings` | `key` (string) | — | Настройки приложения |
| `aiPatterns` | `++id` | `pattern`, `categoryId` | Паттерны для авто-категоризации |

## Типы данных

```typescript
type TransactionType = 'income' | 'expense';
type PeriodType = 'week' | 'month';
type RecurringInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';
```

## Использование

```typescript
import { db } from './db';

// Добавить транзакцию
await db.transactions.add({
  amount: 1000,
  type: 'expense',
  categoryId: 'cat_food',
  date: Date.now(),
  currency: 'RUB',
  rate: 1,
  createdAt: Date.now(),
});

// Получить все расходы за категорию
const expenses = await db.transactions
  .where('type')
  .equals('expense')
  .and(t => t.categoryId === 'cat_food')
  .toArray();

// Обновить настройку
await db.settings.put({ key: 'theme', value: 'dark' });
```

## Инициализация

```typescript
import { seedDatabase } from './seed';

// Заполняет БД стартовыми данными при первом запуске
await seedDatabase();
```

## Стартовые данные

При первом запуске создаются:

**Категории расходов:**
| ID | Название | Иконка |
|----|----------|--------|
| `cat_food` | Еда | 🍔 |
| `cat_transport` | Транспорт | 🚗 |
| `cat_home` | Жильё | 🏠 |
| `cat_fun` | Развлечения | 🎉 |

**Категории доходов:**
| ID | Название | Иконка |
|----|----------|--------|
| `inc_salary` | Зарплата | 💰 |
| `inc_gift` | Подарок | 🎁 |

**Настройки по умолчанию:**
- `theme`: `'light'`
- `baseCurrency`: `'RUB'`
- `onboardingComplete`: `false`

## Файлы

| Файл | Описание |
|------|----------|
| `types.ts` | TypeScript-интерфейсы для всех сущностей |
| `db.ts` | Класс Dexie и объявление схем таблиц |
| `seed.ts` | Начальное заполнение БД |
