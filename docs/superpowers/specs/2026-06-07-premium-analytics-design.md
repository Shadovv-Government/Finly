# Premium Analytics — Дизайн-Спецификация

**Дата:** 2026-06-07
**Статус:** Проектирование
**Цель:** Добавить премиумную аналитику как lifetime-покупку в Finly

---

## 1. Обзор

Finly получает новый экран **PremiumAnalytics** — премиум-дашборд с AI-инсайтами. Доступ открывается разовой покупкой (lifetime). Экран содержит три вкладки (Прогнозы, Сравнения, Финансовое здоровье) и сквозной AI-слой.

### Ключевые принципы

- **Офлайн-first:** 9 из 11 функций работают без интернета
- **Локальные вычисления:** ML-прогнозы, health score и декомпозиция трендов считаются на клиенте
- **AI как усилитель:** OpenRouter API используется только для текстовых инсайтов и AI-диалога
- **Изолированный код:** Премиум-функции не затрагивают бесплатную аналитику

---

## 2. Структура Функций (11 премиум-фич)

### 🔮 Вкладка 1: Прогнозы (Predictive)

| # | Функция | Описание | Данные | Офлайн |
|---|---------|----------|--------|--------|
| 1 | ML-Прогноз расходов | 30-дневный прогноз с доверительным интервалом | 90 дней истории | ✅ |
| 2 | Cash Flow прогноз | Прогноз баланса на 3 месяца с учётом регулярных платежей | Все транзакции + recurringTemplates | ✅ |
| 3 | Сценарии «А что если» | Интерактивный симулятор сокращения/увеличения категорий | Текущий месяц | ✅ |

### 📊 Вкладка 2: Сравнения (Comparative)

| # | Функция | Описание | Данные | Офлайн |
|---|---------|----------|--------|--------|
| 4 | Year-over-Year | Сравнение текущего месяца с аналогичным месяцем прошлого года | 2+ года истории | ✅ |
| 5 | Calendar Heatmap | GitHub-style heatmap трат за год | 365 дней | ✅ |
| 6 | Тренды с сезонностью | Декомпозиция: тренд + сезонность + остаток | 6+ месяцев | ✅ |

### 💚 Вкладка 3: Финансовое Здоровье

| # | Функция | Описание | Данные | Офлайн |
|---|---------|----------|--------|--------|
| 7 | Health Score | Композитный 0-100 score из 6 метрик | Все данные | ✅ |
| 8 | План улучшения | Приоритизированные рекомендации на основе слабых метрик | Health score метрики | ✅ |
| 9 | Детектор проблем | Автопоиск: растущие категории, скрытые подписки, перерасход | 3 месяца | ✅ |

### 🤖 AI-Инсайты (сквозная функция)

| # | Функция | Описание | Данные | Офлайн |
|---|---------|----------|--------|--------|
| 10 | Еженедельный AI-отчёт | Текстовый отчёт от AI о финансах за неделю | 7 дней агрегаций | ❌ |
| 11 | «Спроси о финансах» | Контекстный AI-диалог внутри аналитики | Агрегированные данные | ❌ |

---

## 3. Архитектура

### 3.1 Файловая структура (новые файлы)

```
src/
├── app/
│   ├── screens/
│   │   └── PremiumAnalytics.tsx          ← Главный экран с TabBar (3 вкладки)
│   └── components/
│       └── premium/
│           ├── PremiumGate.tsx            ← Проверка флага premium, иначе Upsell
│           ├── PremiumUpsell.tsx          ← Карточка с описанием фич + кнопка покупки
│           ├── PredictiveTab.tsx          ← Вкладка 1: 3 панели прогнозов
│           ├── ComparativeTab.tsx         ← Вкладка 2: 3 панели сравнений
│           ├── HealthTab.tsx              ← Вкладка 3: 3 панели здоровья
│           ├── AIInsightsPanel.tsx        ← AI-отчёты и диалог (сквозной)
│           ├── HealthScoreGauge.tsx       ← Визуализация 0-100 (полукруглый gauge)
│           ├── WhatIfSimulator.tsx        ← Интерактивный симулятор (слайдеры)
│           ├── CalendarHeatmap.tsx        ← Календарный heatmap (12×~30 ячеек)
│           └── TrendDecomposition.tsx     ← График: данные + тренд + сезонность
├── db/
│   └── premium.ts                        ← Аналитические запросы для премиум-фич
└── lib/
    ├── forecasting.ts                    ← ML: прогнозирование (линейная регрессия)
    ├── healthScore.ts                    ← Расчёт композитного health score
    └── seasonality.ts                    ← Декомпозиция временного ряда
```

### 3.2 Поток данных

```
IndexedDB (Dexie)
    │
    ├── premium.ts (aggregation queries)
    │       │
    │       ├── forecasting.ts (линейная регрессия, CI)
    │       ├── healthScore.ts (6 метрик → 0-100)
    │       └── seasonality.ts (тренд + сезонность + остаток)
    │
    ▼
React Components (PremiumAnalytics → Tabs → Panels)
    │
    ▼
recharts (визуализация: AreaChart, BarChart, Pie, Scatter, Heatmap)
    │
    ▼ (только для AI-фич)
api/ai-chat.ts (Vercel Function proxy → OpenRouter)
    │
    ▼
AIInsightsPanel.tsx (markdown rendering)
```

### 3.3 База Данных — Миграция v3 → v4

```typescript
// src/db/db.ts — version(4).stores()

this.version(4).stores({
  transactions: '++id, date, categoryId, type, createdAt',
  categories: 'id, type, isSystem, isEssential',
  budgets: '++id, categoryId, period, startDate',
  goals: '++id, isActive, deadline',
  recurringTemplates: '++id, nextDate, isActive',
  settings: 'key',
  aiPatterns: '++id, pattern, categoryId',
  users: 'id, createdAt',
  notifications: '++id, type, read, createdAt, expiresAt',
}).upgrade(async tx => {
  // Установить isEssential = true для системных категорий
  const sysCats = await tx.table('categories').where('isSystem').equals(true).toArray();
  for (const cat of sysCats) {
    const essentialNames = ['Продукты', 'Жильё', 'Коммунальные', 'Транспорт', 'Здоровье', 'Аптека', 'Связь', 'Интернет'];
    const isEssential = essentialNames.some(n => cat.name.toLowerCase().includes(n.toLowerCase()));
    await tx.table('categories').update(cat.id, { isEssential });
  }
});
```

### 3.4 `premium.ts` — API Поверхность

```typescript
// Основные функции для премиум-запросов

// Health Score
export async function getHealthScore(): Promise<HealthScoreResult>
// { score, metrics: [{ name, value, weight, subscore }], recommendations: string[] }

// Forecasting
export async function getForecast30Days(): Promise<ForecastResult>
// { points: [{ date, predicted, lower, upper }], confidence: number }

// Cash Flow
export async function getCashFlowForecast(months: number): Promise<CashFlowPoint[]>

// Comparative
export async function getYoYComparison(): Promise<YoYResult>
export async function getCalendarYearData(year: number): Promise<CalendarDay[]>
export async function getTrendDecomposition(days: number): Promise<DecompositionResult>

// What-If
export function simulateWhatIf(currentMonth: CategoryAnalytics[], changes: WhatIfChange[]): WhatIfResult

// AI Context (для AIInsightsPanel)
export async function buildAIContext(): Promise<AIAnalyticsContext>
// Возвращает агрегированные данные для отправки в AI:
// { balance, topCategories, momDelta, anomalies, healthScore, forecast }
```

### 3.5 Роутинг

Добавить маршрут в `src/app/routes.tsx`:
```typescript
{ path: '/premium', element: <PremiumAnalytics /> }
```

Ссылка на премиум-аналитику добавляется:
- В экран Analytics: баннер «🔮 Premium Аналитика» (если нет премиума) или кнопка «🔮 Premium» (если есть)
- В навигацию/меню (иконка с короной или бриллиантом)

### 3.6 Premium Gate

- Флаг `premium: boolean` хранится в таблице `settings` IndexedDB (ключ `'premium'`)
- Компонент `PremiumGate` — обёртка над `PremiumAnalytics`
- Без флага: рендерится `PremiumUpsell` с описанием 11 фич и кнопкой покупки
- Покупка: внешний платёж → webhook на Vercel Function → установка флага
- Восстановление: флаг `premium` включён в экспорт/импорт JSON
- При полном сбросе данных: флаг `premium` сохраняется (отдельный ключ, не очищается)

---

## 4. Алгоритмы

### 4.1 Financial Health Score (0-100)

| # | Метрика | Вес | Формула | Цель |
|---|---------|-----|---------|------|
| 1 | Норма сбережений | 25% | `(Income − Expenses) / Income × 100` → нормализация к 20% | ≥ 20% |
| 2 | Обязательные расходы | 20% | `Σ(категории: жильё, еда, транспорт) / Σ(расходы) × 100` | ≤ 50% |
| 3 | Регулярность доходов | 15% | `1 − CV(месячные доходы за 6 мес.)` → нормализация | CV → 0 |
| 4 | Резервный фонд | 20% | `Свободный баланс / Среднемесячные расходы` → нормализация к 6 мес. | ≥ 3 мес. |
| 5 | Диверсификация | 10% | `1 − HHI(расходы по категориям)` → чем равномернее, тем выше | HHI → 0 |
| 6 | Долговая нагрузка | 10% | `Долговые платежи / Доходы × 100` → инвертировать | ≤ 30% |

Каждая метрика даёт 0-100 подскор, взвешенная сумма даёт итоговый Score.

**Категории для обязательных расходов:** системные категории с тегами `essentials` (еда, жильё, транспорт, здоровье, коммунальные).

**Новое поле для категорий:** требуется добавить `isEssential?: boolean` в `Category`.

**Миграция БД (версия 3 → 4):** добавить поле `isEssential` в таблицу `categories`. Системные категории получают `isEssential: true` для: «Продукты», «Жильё/коммунальные», «Транспорт», «Здоровье/аптека», «Связь/интернет». Остальные — `isEssential: false`.

**Долговая нагрузка:** в v1 определяется через категорию с названием содержащим «долг», «кредит», «ипотека», «заём» (поиск по ключевым словам в названии категории). Если таких категорий нет — метрика получает максимальный балл (нет долгов = хорошо).

**Резервный фонд:** `свободный баланс` = `getBalanceWithSavings().freeBalance`. Среднемесячные расходы = среднее за последние 6 месяцев.

### 4.2 ML-Прогноз расходов

1. **Данные:** последние 90 дней транзакций типа `expense`, агрегированные по дням
2. **Модель:** линейная регрессия (pure JS, без TensorFlow.js для простоты — обычный least squares)
3. **Признаки:**
   - День недели (one-hot, 7 фич)
   - День месяца (1 фича)
   - Номер дня от начала данных (тренд)
4. **Прогноз:** 30 точек вперёд
5. **Доверительный интервал:** ±1 стандартное отклонение остатков (RMSE)
6. **Корректировка:** добавление известных будущих регулярных платежей из `recurringTemplates`

### 4.3 Декомпозиция тренда

Классическая STL-подобная декомпозиция (без итераций, один проход):
1. **Тренд:** линейная регрессия по всем точкам
2. **Сезонность:** среднее по дням недели за вычетом тренда
3. **Остаток:** `Y − Trend − Seasonal`

Визуализация: 3 линии на одном AreaChart (данные, тренд, сезонность).

### 4.4 What-If Симулятор

- Слайдер: "Сократить [категория] на X%"
- Мгновенный пересчёт: `новая_сумма = текущая × (1 − X/100)`
- Показатели: экономия за месяц, за год, влияние на savings rate
- Сценарий "Откладывать X в месяц" → дата достижения цели = `(цель − текущий_прогресс) / X`

---

### 4.5 AI Insights — Построение Контекста

Для AI-отчёта и AI-диалога строится контекст из агрегированных данных:

```typescript
interface AIAnalyticsContext {
  period: { start: number; end: number };
  balance: { income: number; expenses: number; net: number };
  savingsRate: number;
  topExpenseCategories: { name: string; amount: number; percent: number }[];
  momChanges: { name: string; delta: number; deltaPercent: number }[];
  anomalies: { name: string; amount: number; ratio: number }[];
  healthScore: number;
  forecast: { dailyRate: number; projectedMonthEnd: number };
  upcomingRecurring: { label: string; amount: number; daysUntil: number }[];
}
```

Функция `buildAIContext()` собирает эти данные локально, затем отправляет промпт в OpenRouter через `api/ai-chat.ts`. Ответ рендерится как markdown.

**Для еженедельного отчёта:** промпт «Ты финансовый аналитик. Вот данные пользователя за неделю: [контекст]. Напиши краткий отчёт: главные тренды, предупреждения, советы.»
**Для AI-диалога:** контекст прикрепляется к каждому сообщению пользователя.

---

## 5. Edge Cases

| Ситуация | Поведение |
|----------|-----------|
| Нет транзакций (новый пользователь) | EmptyState с CTA «Добавьте первые транзакции» |
| Мало данных (< 7 дней) | Прогнозы с предупреждением о низкой точности |
| Офлайн | AI-фичи заменяются сообщением «Нужен интернет», остальное работает |
| Премиум не куплен | PremiumGate → PremiumUpsell с превью фич |
| 2000+ транзакций | IndexedDB индексы, лимитирование данных для прогнозов (90 дней) |
| Восстановление премиума | Флаг premium в JSON экспорте/импорте, сохранение при сбросе данных |
| Нет регулярных доходов | Health Score метрика «Регулярность доходов» = 0, остальные считаются нормально |
| Все расходы в одной категории | Метрика «Диверсификация» = 0, рекомендация diversify |

---

## 6. Тестирование

### Unit Tests (Vitest)
- `healthScore.test.ts` — все 6 метрик, граничные значения, весовая сумма
- `forecasting.test.ts` — линейная регрессия, доверительный интервал, учёт регулярных платежей
- `seasonality.test.ts` — декомпозиция на синтетических данных
- `premium.test.ts` — все премиум-запросы к fake-indexeddb

### Component Tests (Testing Library)
- `PremiumGate.test.tsx` — рендер Upsell без флага, рендер детей с флагом
- `HealthScoreGauge.test.tsx` — отображение разных значений score
- `WhatIfSimulator.test.tsx` — работа слайдеров, пересчёт значений
- `CalendarHeatmap.test.tsx` — рендер ячеек, интенсивность цвета

### Integration Tests
- `PremiumAnalytics.test.tsx` — полный экран с mock-данными, переключение вкладок, AI-панель

### E2E (Playwright)
- Сценарий: открыть аналитику → увидеть Upsell → купить премиум → открыть дашборд → проверить все вкладки

### Coverage Target
- Новый код: > 80% line coverage
- Критические функции (healthScore, forecasting): 100%

---

## 7. UI/UX Заметки

- **HealthScoreGauge:** полукруглый gauge (как спидометр), градиент от красного (0) к зелёному (100)
- **CalendarHeatmap:** 7 колонок (дни недели) × ~52 строк (недели), раскраска по квантилям
- **WhatIfSimulator:** карточка с 3-4 слайдерами для топ-категорий, результаты в реальном времени
- **AIInsightsPanel:** markdown-рендеринг AI-ответов, skeleton при загрузке
- **Вкладки:** TabBar в стиле приложения (как в других экранах)
- **Анимации:** motion/react для появления секций (как в существующей Analytics)

---

## 8. Что НЕ входит в Scope

- Платёжная система (Telegram Stars, DonationAlerts, etc.) — отдельная задача
- AI-диалог с историей чата (v1: один запрос-ответ)
- Бенчмарки по реальным данным других пользователей (v1: только нормы 50/30/20)
- Экспорт премиум-отчётов в PDF
- Кастомные алерты на основе прогнозов

---

## 9. Приёмка (Definition of Done)

- [ ] Все 11 функций реализованы и проходят тесты
- [ ] PremiumGate корректно скрывает контент без флага premium
- [ ] 9 из 11 функций работают офлайн
- [ ] Загрузка дашборда < 2 секунд на 2000 транзакциях
- [ ] Покрытие нового кода тестами > 80%
- [ ] a11y: все графики имеют текстовые альтернативы
- [ ] Документация в AGENTS.md обновлена
