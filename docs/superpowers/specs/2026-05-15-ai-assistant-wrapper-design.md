# AI Assistant Wrapper — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

## Overview

Add a conversational AI chat interface to the existing `AIAssistant` screen. The AI answers financial questions using the user's real data, delivered via OpenRouter (OpenAI-compatible API). When offline or the API is unavailable, the local regex-based engine (`chatContext.ts`) serves as fallback.

## Architecture

### New Files

```
src/services/ai/
  contextBuilder.ts   — builds a financial snapshot from IndexedDB
  aiClient.ts         — HTTP client for OpenRouter API

src/app/hooks/
  useAIChat.ts        — chat session state, sends messages, handles fallback
```

### Modified Files

- `src/app/screens/AIAssistant.tsx` — adds chat UI below existing insights block

### Data Flow

```
User types message
  → useAIChat.sendMessage(text)
    → contextBuilder.buildSnapshot()       ← reads IndexedDB
    → aiClient.chat(systemPrompt, history, text)
        → POST openrouter.ai/api/v1/chat/completions   (online)
        → answerQuery(text, chatCtx)                   (fallback if fetch fails)
  → messages state updated → UI re-renders
```

---

## Module Specs

### `contextBuilder.ts`

Gathers a 30-day financial snapshot and serializes it to a plain-text string for the AI system prompt.

**Collected data:**
- Current balance, monthly income, monthly expenses
- Top 5 spending categories (name + amount)
- All active budgets: spent / limit + over-budget flag
- Active savings goals: current / target + percent
- Next 3 recurring payments (label + days until due)

**Output example:**
```
Финансовый профиль пользователя (май 2026):
Баланс: 45 200 ₽
Доходы за месяц: 80 000 ₽ | Расходы: 34 800 ₽
Топ категории: Продукты 12 400 ₽, Транспорт 5 200 ₽, Кафе 4 100 ₽
Бюджеты: Продукты 12 400/15 000 ₽ ✅, Кафе 4 100/4 000 ₽ ❌
Цели: "Отпуск" 18 000/60 000 ₽ (30%)
Ближайшие платежи: Spotify 299 ₽ (сегодня), Аренда 30 000 ₽ (через 12 дн.)
```

**Interface:**
```ts
export async function buildFinancialSnapshot(): Promise<string>
```

---

### `aiClient.ts`

Pure HTTP client — no state, no DB access.

**Config (injected, not hardcoded):**
```ts
export interface AIClientConfig {
  apiKey: string;       // OpenRouter API key — provided by caller
  model: string;        // e.g. "openai/gpt-4o-mini"
  baseUrl?: string;     // default: "https://openrouter.ai/api/v1"
}
```

**Request shape:** OpenAI chat completions format
```ts
{ model, messages: [{ role, content }], temperature: 0.7, max_tokens: 800 }
```

**Interface:**
```ts
export async function chatCompletion(
  config: AIClientConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string>   // returns assistant reply text, throws on error
```

**Error handling:** throws `AIClientError` with `type: 'network' | 'auth' | 'rate_limit' | 'unknown'` so `useAIChat` can decide whether to fallback or surface the error.

---

### `useAIChat.ts`

React hook — owns session state.

**State:**
```ts
interface ChatMessage { role: 'user' | 'assistant'; content: string }
const [messages, setMessages] = useState<ChatMessage[]>([])
const [isLoading, setIsLoading] = useState(false)
const [isOffline, setIsOffline] = useState(false)
```

**`sendMessage(text: string)`:**
1. Append user message to history
2. Set `isLoading = true`
3. Call `buildFinancialSnapshot()` — get context string
4. Build system prompt: persona + context string
5. Try `chatCompletion(config, systemPrompt, messages)`
6. On success: append assistant message, `isOffline = false`
7. On `AIClientError` or any network error: call `answerQuery(text, chatCtx)` from `chatContext.ts`, append result, set `isOffline = true`
8. `isLoading = false`

**Config source:** `import.meta.env.VITE_OPENROUTER_API_KEY` and `VITE_AI_MODEL`. Stub values (`""` / `"openai/gpt-4o-mini"`) are fine until the user adds them — the hook falls back to local engine when key is empty.

**Interface:**
```ts
export function useAIChat(): {
  messages: ChatMessage[];
  isLoading: boolean;
  isOffline: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
}
```

---

### `AIAssistant.tsx` — UI changes

**Layout:**
```
┌─────────────────────────────────────┐
│  Header (gradient, unchanged)       │
├─────────────────────────────────────┤
│  Insights block (unchanged)         │
├─────────────────────────────────────┤
│  Chat section header: "Спросить AI" │
│  ┌───────────────────────────────┐  │
│  │  message bubbles (scrollable) │  │
│  └───────────────────────────────┘  │
│  [  Введите вопрос...    ] [Send]   │
└─────────────────────────────────────┘
```

- User bubbles: right-aligned, violet background
- Assistant bubbles: left-aligned, card background
- Loading state: animated dots or Loader2 spinner
- Offline badge: small amber indicator when `isOffline = true`
- Suggestion chips (quick questions): shown when history is empty, sourced from a static list

---

## System Prompt

```
Ты финансовый ассистент приложения Finly. Отвечай кратко и по делу на русском языке.
Используй данные пользователя ниже для точных ответов. Не придумывай цифры.

{financialSnapshot}
```

---

## Environment Variables

```
VITE_OPENROUTER_API_KEY=   # empty stub — user fills in
VITE_AI_MODEL=openai/gpt-4o-mini
```

---

## What Is NOT in Scope

- Streaming (SSE) — add later as enhancement
- Persisting chat history to IndexedDB — in-session only
- Voice input — separate feature
- Fine-tuning or custom model hosting
