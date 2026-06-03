# Finly — Технический аудит

> Статус: ✅ Завершён  
> Дата: 2026-05-02  
> Легенда: ✅ Готово · 🔧 В процессе · ⬜ Не начато · ⚠️ Риск · 🗑️ Долг

---

## Быстрые победы (Quick Wins)

- [x] ✅ Скрыть `/components` роут за `process.env.NODE_ENV !== 'production'` (`src/app/routes.tsx`)
- [x] ✅ Перевести error messages `validators.ts` на русский (50+ сообщений)
- [x] ✅ Добавить `ErrorBoundary key={location.pathname}` вокруг `<Outlet />` в `Layout.tsx`
- [x] ✅ Добавить orphan-check перед `deleteCategory()` — бросает ошибку если есть транзакции
- [x] ✅ Добавить `isMlClassifying` guard на кнопку Save в `AddTransactionForm.tsx`
- [x] ✅ Убрать Chart.js и 7 других неиспользуемых пакетов (`package.json`)
- [x] ✅ Добавить `clearExpiredNotifications()` при монтировании `useNotifications`

---

## Критические проблемы 🔴

### 1. ~~Full table scan в analytics~~ ✅ (уже было исправлено)
- Проверено: `getBalanceByPeriod`, `getExpensesByCategory`, `getSpendingTrend`, `getIncomeTrend` и все остальные period-функции уже используют `where('date').between(start, end)`.
- `getCurrentBalance()` и `getBalanceWithSavings()` — намеренно all-time (можно только full scan).
- Критическая проблема отсутствовала.

### 2. ~~Biometric lock без fallback~~ ✅ (уже было реализовано)
- Проверено: `LockScreen.tsx` уже содержит кнопку «Войти без биометрии (сбросить)» после 3 неудачных попыток (строки 97–104).
- `NotFoundError`/`InvalidStateError` от WebAuthn → автоматически вызывает `biometric.disable()` (строка 29).
- Критическая проблема отсутствовала.

### 3. ~~Удаление категории с транзакциями~~ ✅
- `deleteCategory()` бросает ошибку если есть транзакции
- При поимке ошибки `Categories.tsx` показывает конфликтный диалог с выбором:
  - **Переназначить** операции на другую категорию того же типа → `reassignCategoryTransactions(fromId, toId)`
  - **Удалить вместе с операциями** → `deleteCategoryWithTransactions(id)`
  - Оба пути атомарны (Dexie `transaction('rw', ...)`)
- [x] ✅ Добавить UX-диалог в `Categories.tsx` с опцией reassign при ошибке удаления

---

## Средние проблемы 🟡

### 4. ~~Нет очистки просроченных нотификаций~~ ✅
- Исправлено: `clearExpiredNotifications()` вызывается при каждом монтировании `useNotifications`

### 5. ~~ComponentShowcase в продакшне~~ ✅
- Исправлено: роут скрыт за `process.env.NODE_ENV !== 'production'`

### 6. ~~Import без версии схемы~~ ✅
- Исправлено: `SUPPORTED_VERSION = '1.0'` — константа используется и при экспорте, и при валидации импорта
- Импорт из файла без версии или с неизвестной версией → предупреждение (не ошибка) — обратная совместимость сохранена
- Все error messages в `exportImport.ts` переведены на русский
- [x] ✅ Добавить `version` поле в JSON export
- [x] ✅ Добавить проверку версии при import

### 7. ~~Race condition в форме транзакции~~ ✅
- Кнопка Save: `disabled={isMlClassifying}` (Quick Win #5)
- `handleSave`: добавлен ранний `if (isMlClassifying) return` — защищает от Enter/программного вызова
- [x] ✅ Блокировать submit если `isMlClassifying === true`

### 8. ~~Два чарт-движка без причины~~ ✅
- Исправлено: удалены `chart.js`, `react-chartjs-2`, `react-slick`, `react-responsive-masonry`, `react-dnd`, `react-dnd-html5-backend`, `react-popper`, `@popperjs/core`

### 9. ~~Error messages на английском в русском UI~~ ✅
- Исправлено: все 50+ сообщений в `validators.ts` переведены на русский

### 10. ~~Нет ErrorBoundary на route-уровне~~ ✅
- Исправлено: `<ErrorBoundary key={location.pathname}>` вокруг `<Outlet />` в `Layout.tsx`

### 11. ~~`getActiveBudgets()` — неправильная семантика~~ ✅ (поведение намеренное)
- Проверено: бюджеты — это *постоянные* лимиты (ежемесячные/еженедельные), а не разовые.
- `getAllBudgetsProgress()` уже дедуплицирует по `categoryId`, выбирая самый новый бюджет — старые игнорируются.
- Проблема отсутствовала.

### 12. ~~seed.ts доступен в продакшне~~ ✅ (намеренно)
- Проверено: `seedDatabase()` — это production-код миграции и инициализации системных категорий.
- Идемпотентен: добавляет категории только если их нет. Запускается при старте приложения для всех пользователей.
- Проблема отсутствовала.

### 13. ~~Stale closure в `useCategories`~~ ✅ (не было проблемы)
- Проверено: `categories` уже присутствует в `useCallback` deps на строке 67. Проблема отсутствовала.

### 14. ~~`withRetry()` применяется к IndexedDB операциям~~ ✅ (проблема отсутствовала)
- Проверено: `withRetry` в `src/app/utils/errorHandler.ts` уже содержит `if (!isNetworkError) throw` — мгновенно пробрасывает не-сетевые ошибки, не ретраит IndexedDB
- `withRetry` нигде не обёртывает Dexie-операции — используется только в тестах самого `errorHandler`

---

## Технический долг 🗑️

### TD-1. ~~`useAIInsights.ts` — 532 строки монолит~~ ✅
- Разбит на 3 модуля + тонкий хук:
  - `nlpParser.ts` — `Period`, `extractPeriod`, `shiftPeriodBack`, `HELP_TEXT`, `fmt`, `MS_PER_DAY`
  - `insightsEngine.ts` — `Insight`, `buildInsights`
  - `chatContext.ts` — `ChatCtx`, `answerQuery` (230 строк роутера запросов)
  - `useAIInsights.ts` — только хук (75 строк)
- [x] ✅ Выделить `nlpParser.ts`
- [x] ✅ Выделить `insightsEngine.ts`
- [x] ✅ Выделить `chatContext.ts`
- [x] ✅ Написать тесты на `nlpParser.ts` (`extractPeriod` — 8 паттернов, `shiftPeriodBack`, `fmt`)
- [x] ✅ Написать тесты на ключевые intent-паттерны (`chatContext.ts`) — 26 тестов, все 20+ интентов

### TD-2. ~~Validators — i18n основа~~ ✅
- [x] ✅ Создать `src/i18n/ru.ts` — 47 ключей, динамические строки как типизированные функции
- [x] ✅ Переключить validators на i18n ключи — все 50+ литералов заменены на `msg.*`

### TD-3. ~~Screen-монолиты — разбить на подкомпоненты~~ ✅
- `Settings.tsx` → `ProfileSection`, `AppearanceSection`, `DataSection`, `SecuritySection` (самостоятельные хуки, нет prop-drilling)
- `TransactionHistory.tsx` → `TransactionItem`, `TransactionFilters`; `SwipeableRow` вынесен в `src/app/components/SwipeableRow.tsx`
- `Dashboard.tsx` → `BalanceCard`, `ExpenseBreakdown`, `RecentTransactions`
- [x] ✅ Разбить `Settings.tsx`
- [x] ✅ Разбить `TransactionHistory.tsx`
- [x] ✅ Разбить `Dashboard.tsx`

### TD-4. ~~Export/Import — добавить schemaVersion~~ ✅
- Исправлено: см. проблему #6

---

## Тестовое покрытие 🧪

**Текущее состояние**: 345 тестов, 27 тест-файлов. Порог coverage 50% — минимальный floor.

- [x] ✅ `addTransaction` → `getBalanceByPeriod` (end-to-end, rate/currency, empty period, period echo)
- [x] ✅ `deleteCategory` с существующими транзакциями
- [x] ✅ Export → Import round-trip (JSON) — exportData version, биометрия, mergeOptions, round-trip
- [x] ✅ `processRecurringTransactions` — генерация, бэкфилл, ошибки, nextDate
- [x] ✅ `useBudgetNotifications` — пороги 80%/99%/100%/120%, дедупликация 24 ч, guard условия
- [x] ✅ `useAIInsights` — 20+ intent паттернов в `chatContext.ts` (help, recurring, anomalies, budget, balance, income, expenses, category, shift, compare, savings, forecast, goals, advice, largest, daily-avg, day-of-week, income-pattern, goals-eta, unknown)
- [x] ✅ `useReceiptScanner` — `extractAmount`, `extractDate`, `extractMerchant`
- [x] ✅ IndexedDB upgrade path v1 → v2 → v3
- [x] ✅ `getActiveBudgets` — период-граничные случаи (past, exact-now, future, empty)

---

## Риски ⚠️

| Риск | Вероятность | Влияние | Статус |
|------|-------------|---------|--------|
| Потеря данных при удалении категории с транзакциями | Высокая | 🔴 Критическое | ✅ Решён |
| Пользователь заблокирован (WebAuthn fallback) | Средняя | 🔴 Критическое | ⬜ Не решён |
| Квота IndexedDB переполнена без предупреждения | Низкая | 🟡 Высокое | ⬜ Не решён |
| OCR offline не работает (tesseract assets в manifest?) | Средняя | 🟡 Среднее | ⬜ Проверить |
| seed.ts случайно вызывается в продакшне | Низкая | 🟡 Высокое | ⬜ Не решён |
| Деградация производительности при > 5000 транзакций | Высокая | 🟡 Высокое | ⬜ Не решён |

---

## Что переписать позже (не срочно)

- **`useAIInsights`** → LLM API при появлении backend
- **Analytics layer** → SQLite WASM (PGlite) для реальных SQL агрегаций
- **Notifications** → унифицировать push API + IndexedDB
- **Multi-device** → CRDTs или cloud sync

---

## Что уже хорошо — не трогать ✅

- ✅ Архитектура слоёв `db/ → hooks/ → screens/`
- ✅ `errorHandler.ts` — кастомные типы ошибок
- ✅ `useBiometric.ts` — WebAuthn: ES256/RS256, `userVerification: 'required'`, inactivity timeout
- ✅ `ThemeContext.tsx` — правильная реализация system preference
- ✅ `BottomSheet.tsx` — drag logic с reduced motion support
- ✅ Chunk splitting в `vite.config.ts`
- ✅ `sw.ts` — CacheFirst для ML моделей, NetworkFirst для HTML
- ✅ TypeScript strict mode
- ✅ `useAnalytics.ts` — `Promise.all` + cancellation ref

---

## Прогресс

```
Quick Wins:       7 / 7   ██████████  ВСЕ ГОТОВО
Критические:      3 / 3   ██████████  ВСЕ ГОТОВО
Средние:         11 / 11  ██████████  ВСЕ ГОТОВО
Технический долг:10 / 10  ██████████  ВСЕ ГОТОВО
Тесты:           10 / 10  ██████████  ВСЕ ГОТОВО
```
