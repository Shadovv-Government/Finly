# Chat Upgrade: Intent Registry + Follow-up Suggestions

**Date:** 2026-05-04  
**Status:** ✅ Реализовано. `chatContext.ts` рефакторен в intent-реестр с 15+ интентами и follow-up suggestions. Протестирован: 26 тестов, все интенты покрыты.

## Problem

`chatContext.ts` is a single function with 20+ chained `if-else` blocks. Adding a new question type requires inserting another `if` in the right place. No follow-up guidance leaves users unsure what to ask next.

## Solution

1. Refactor `answerQuery` into an **intent registry** — an array of self-contained intent objects
2. Every answer returns **2–3 follow-up suggestion chips** rendered as clickable buttons in the UI

---

## Architecture

### Intent interface

```ts
interface Intent {
  id: string
  patterns: RegExp[]
  handler: (q: string, ctx: ChatCtx, period: Period) => Promise<string>
  suggestions: string[]
}
```

`answerQuery` iterates `INTENTS`, finds first match, calls `handler`, returns `{ answer, newCtx, suggestions }`.

Period-shift ("а в прошлом?") stays at the top before intent matching — behavior unchanged.

### Return type

```ts
// Before
{ answer: string; newCtx: ChatCtx }
// After
{ answer: string; newCtx: ChatCtx; suggestions: string[] }
```

### Intents (all existing topics preserved)

| id | suggestions |
|---|---|
| help | ["Расходы за месяц", "Баланс", "Мои цели"] |
| recurring | ["Бюджеты", "Прогноз до конца месяца", "Аномальные траты"] |
| income-pattern | ["Доходы за месяц", "Норма сбережений", "Баланс"] |
| anomalies | ["Крупнейшие расходы", "Расходы по категориям", "Как сэкономить?"] |
| day-of-week | ["Средний расход в день", "Расходы за неделю", "Аномальные траты"] |
| advice | ["Бюджеты", "Расходы по категориям", "Прогноз до конца месяца"] |
| largest | ["Аномальные траты", "Расходы по категориям", "А за прошлый месяц?"] |
| daily-avg | ["Прогноз до конца месяца", "Расходы за месяц", "Сравнить с прошлым"] |
| goals-timeline | ["Мои цели", "Норма сбережений", "Баланс"] |
| goals | ["Когда накоплю?", "Норма сбережений", "Баланс"] |
| budget | ["Как сэкономить?", "Расходы по категориям", "Прогноз до конца месяца"] |
| forecast | ["Средний расход в день", "Бюджеты", "Сравнить с прошлым"] |
| compare | ["Расходы за прошлый месяц", "Норма сбережений", "Баланс"] |
| savings | ["Баланс", "Как сэкономить?", "Мои цели"] |
| balance | ["Расходы за месяц", "Прогноз до конца месяца", "Норма сбережений"] |
| income | ["Баланс", "Норма сбережений", "Когда зарплата?"] |
| category | ["А за прошлый месяц?", "Расходы по категориям", "Бюджеты"] |
| expenses | ["Разбить по категориям", "Крупнейшие расходы", "Прогноз до конца месяца"] |
| fallback | ["Помощь", "Расходы за месяц", "Баланс"] |

### UI: suggestion chips (`AIAssistant.tsx`)

After each assistant message, render `suggestions` as small tappable chips. Tapping calls existing `sendMessage` handler with chip text — no new state needed.

---

## Files Changed

| File | Change |
|---|---|
| `src/app/hooks/chatContext.ts` | Refactor: intent registry replaces if-else chain |
| `src/app/screens/AIAssistant.tsx` | Render suggestion chips below assistant messages |

## Out of Scope

- LLM integration  
- Fuzzy "did you mean" fallback  
- New analytics functions
