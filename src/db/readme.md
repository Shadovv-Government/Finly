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
| `seed.ts` | Начальное заполнение БД (категории, настройки) |
| `operations.ts` | CRUD-функции для всех таблиц |
| `analytics.ts` | Аналитические запросы для графиков и дашбордов |
| `ai.ts` | Логика авто-категоризации и умных подсказок |
| `recurring.ts` | Обработка повторяющихся платежей |
| `exportImport.ts` | Экспорт/импорт данных (JSON, CSV) |
| `validators.ts` | Валидация данных перед записью в БД |

---

## Модуль `operations.ts` — CRUD операции

Централизованные helper-функции для работы с данными.

### Transactions

| Функция | Описание |
|---------|----------|
| `addTransaction(tx)` | Добавить транзакцию, вернуть ID |
| `getTransaction(id)` | Получить транзакцию по ID |
| `updateTransaction(id, updates)` | Обновить транзакцию |
| `deleteTransaction(id)` | Удалить транзакцию |
| `getTransactionsByPeriod(start, end)` | Получить за период |
| `getTransactionsByCategory(categoryId)` | Получить по категории |
| `getAllTransactions()` | Получить все (сортировка по дате) |

### Categories

| Функция | Описание |
|---------|----------|
| `addCategory(cat)` | Добавить категорию |
| `getCategory(id)` | Получить категорию |
| `updateCategory(id, updates)` | Обновить категорию |
| `deleteCategory(id)` | Удалить категорию |
| `getCategories()` | Получить все |
| `getCategoriesByType(type)` | По типу (income/expense) |
| `getExpenseCategories()` | Только расходы |
| `getIncomeCategories()` | Только доходы |

### Budgets

| Функция | Описание |
|---------|----------|
| `addBudget(budget)` | Добавить бюджет |
| `getBudget(id)` | Получить бюджет |
| `updateBudget(id, updates)` | Обновить бюджет |
| `deleteBudget(id)` | Удалить бюджет |
| `getBudgetByCategory(catId, period)` | Бюджет категории на период |
| `getActiveBudgets()` | Активные бюджеты |

### Goals

| Функция | Описание |
|---------|----------|
| `addGoal(goal)` | Добавить цель |
| `getGoal(id)` | Получить цель |
| `updateGoal(id, updates)` | Обновить цель |
| `deleteGoal(id)` | Удалить цель |
| `getGoals()` | Получить все |
| `getActiveGoals()` | Активные цели |
| `contributeToGoal(id, amount)` | Внести вклад в цель |

### Recurring Templates

| Функция | Описание |
|---------|----------|
| `addRecurringTemplate(tpl)` | Добавить шаблон |
| `getRecurringTemplate(id)` | Получить шаблон |
| `updateRecurringTemplate(id, updates)` | Обновить шаблон |
| `deleteRecurringTemplate(id)` | Удалить шаблон |
| `getActiveRecurringTemplates()` | Активные шаблоны |

### Settings

| Функция | Описание |
|---------|----------|
| `getSetting<T>(key)` | Получить настройку |
| `setSetting<T>(key, value)` | Установить настройку |
| `getAllSettings()` | Получить все настройки |

### AI Patterns

| Функция | Описание |
|---------|----------|
| `addAIPattern(pattern)` | Добавить паттерн |
| `getAIPattern(id)` | Получить паттерн |
| `updateAIPattern(id, updates)` | Обновить паттерн |
| `deleteAIPattern(id)` | Удалить паттерн |

**Пример:**
```typescript
import { addTransaction, getCategories, setSetting } from './operations';

const id = await addTransaction({
  amount: 500,
  type: 'expense',
  categoryId: 'cat_food',
  date: Date.now(),
  currency: 'RUB',
  rate: 1,
});

const categories = await getCategories();
await setSetting('theme', 'dark');
```

---

## Модуль `analytics.ts` — Аналитика

Функции для графиков, дашбордов и отчётов.

### Баланс

| Функция | Описание |
|---------|----------|
| `getBalanceByPeriod(start, end)` | Баланс за период (доходы − расходы) |
| `getCurrentBalance()` | Текущий общий баланс |

### Расходы по категориям

| Функция | Описание |
|---------|----------|
| `getExpensesByCategory(start, end)` | Расходы по категориям с процентами |
| `getIncomeByCategory(start, end)` | Доходы по категориям |

### Тренды

| Функция | Описание |
|---------|----------|
| `getSpendingTrend(days)` | Дневной тренд расходов (N дней) |
| `getMonthlyTrend(months)` | Месячный тренд (N месяцев) |

### Бюджеты

| Функция | Описание |
|---------|----------|
| `getBudgetProgressForPeriod(catId, start, end)` | Прогресс бюджета категории |
| `getAllBudgetsProgress(start, end)` | Прогресс всех бюджетов |

### Цели

| Функция | Описание |
|---------|----------|
| `getGoalsProgress()` | Прогресс всех целей с расчётом ежемесячного взноса |

### Статистика

| Функция | Описание |
|---------|----------|
| `getSummaryStats()` | Общая статистика (кол-во транзакций, категорий и т.д.) |

**Пример:**
```typescript
import { getBalanceByPeriod, getExpensesByCategory, getSpendingTrend } from './analytics';

const now = Date.now();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

const balance = await getBalanceByPeriod(monthStart, now);
const byCategory = await getExpensesByCategory(monthStart, now);
const trend = await getSpendingTrend(30); // 30 дней
```

---

## Модуль `ai.ts` — AI-ассистент

Авто-категоризация и умные рекомендации.

### Паттерны

| Функция | Описание |
|---------|----------|
| `findBestMatch(comment)` | Найти лучший паттерн для комментария |
| `findAllMatches(comment)` | Найти все возможные паттерны |
| `learnPattern(comment, categoryId, wasCorrect)` | Обучить на исправлении |
| `recordPatternFeedback(patternId, wasCorrect)` | Записать фидбек |

### Парсинг естественного языка

| Функция | Описание |
|---------|----------|
| `parseNaturalLanguage(text)` | Распарсить фразу типа «кофе 450 рублей» |

### Рекомендации

| Функция | Описание |
|---------|----------|
| `generateSuggestions()` | Сгенерировать рекомендации (перерасход, цели, аномалии) |

**Пример:**
```typescript
import { findBestMatch, parseNaturalLanguage, generateSuggestions } from './ai';

// Парсинг фразы
const parsed = parseNaturalLanguage('кофе 450 рублей в Старбаксе');
// { amount: 450, type: 'expense', comment: 'кофе в Старбаксе', currency: 'RUB' }

// Поиск категории
const match = await findBestMatch('Старбакс');
if (match) {
  console.log(`Категория: ${match.category.name}, уверенность: ${match.confidence}`);
}

// Рекомендации
const suggestions = await generateSuggestions();
suggestions.forEach(s => console.log(s.message));
```

---

## Модуль `recurring.ts` — Повторяющиеся платежи

Автоматическое создание транзакций по шаблону.

### Функции

| Функция | Описание |
|---------|----------|
| `getDueTemplates()` | Получить шаблоны, которые нужно обработать сегодня |
| `getUpcomingPayments(days)` | Получить предстоящие платежи на N дней |
| `processDueTemplates()` | Обработать все просроченные шаблоны |
| `createManualTransactionFromTemplate(id)` | Создать транзакцию вручную |
| `getRecurringStats()` | Статистика по шаблонам (месячная сумма) |

**Пример:**
```typescript
import { processDueTemplates, getUpcomingPayments } from './recurring';

// Обработать все_due_ шаблоны (например, при запуске приложения)
const result = await processDueTemplates();
console.log(`Создано транзакций: ${result.processed}`);

// Показать предстоящие платежи
const upcoming = await getUpcomingPayments(7);
upcoming.forEach(u => {
  console.log(`${u.template.amount} ₽ через ${u.daysUntilDue} дн.`);
});
```

---

## Модуль `exportImport.ts` — Экспорт/импорт

Резервное копирование и перенос данных.

### Экспорт

| Функция | Описание |
|---------|----------|
| `exportData()` | Экспортировать всё в JSON-объект |
| `exportToFile(filename)` | Скачать JSON-файл |
| `exportToCSV()` | Экспорт транзакций в CSV-строку |
| `exportCSVToFile(filename)` | Скачать CSV-файл транзакций |

### Импорт

| Функция | Описание |
|---------|----------|
| `importData(data, options)` | Импортировать из JSON-объекта |
| `importFromFile(file)` | Импортировать из JSON-файла |

### Очистка

| Функция | Описание |
|---------|----------|
| `clearAllData()` | Полная очистка (кроме системных категорий) |
| `clearUserData()` | Очистка пользовательских данных |

**Пример:**
```typescript
import { exportToFile, importFromFile, exportCSVToFile } from './exportImport';

// Экспорт
await exportToFile('my-finly-backup.json');
await exportCSVToFile('transactions.csv');

// Импорт из файла (через input[type=file])
const file = fileInput.files[0];
const result = await importFromFile(file);
console.log(`Импортировано: ${result.imported.transactions} транзакций`);
```

---

## Модуль `validators.ts` — Валидация

Проверка данных перед записью в БД.

### Функции валидации

| Функция | Описание |
|---------|----------|
| `validateTransaction(data, isUpdate)` | Валидация транзакции |
| `validateCategory(data, isUpdate)` | Валидация категории |
| `validateBudget(data, isUpdate)` | Валидация бюджета |
| `validateGoal(data, isUpdate)` | Валидация цели |
| `validateRecurringTemplate(data, isUpdate)` | Валидация шаблона |
| `validateAIPattern(data, isUpdate)` | Валидация AI-паттерна |

### Результат валидации

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Хелперы

| Функция | Описание |
|---------|----------|
| `assertValid(result, entityType)` | Бросить ошибку если не валидно |
| `validateWithWarnings(data, validator, type)` | Валидировать с предупреждениями |

**Пример:**
```typescript
import { validateTransaction, assertValid } from './validators';

const result = validateTransaction({
  amount: 500,
  type: 'expense',
  categoryId: 'cat_food',
  date: Date.now(),
  currency: 'RUB',
  rate: 1,
});

if (!result.isValid) {
  console.error('Ошибки:', result.errors);
  console.warn('Предупреждения:', result.warnings);
}

// Или с исключением:
assertValid(result, 'Transaction'); // бросит Error если не валидно
```

---

## Миграции БД

При изменении схемы нужно обновлять версию:

```typescript
this.version(2).stores({
  // новые индексы или таблицы
  transactions: '++id, date, categoryId, type, createdAt, amount',
}).upgrade(tx => {
  // логика миграции
});
```
