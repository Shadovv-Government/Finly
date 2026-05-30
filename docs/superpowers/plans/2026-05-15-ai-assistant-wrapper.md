# AI Assistant Wrapper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a conversational AI chat to the AIAssistant screen backed by OpenRouter, with the existing local regex engine as offline fallback.

**Architecture:** `contextBuilder.ts` assembles a financial snapshot from IndexedDB; `aiClient.ts` POSTs it to OpenRouter (OpenAI-compatible); `useAIChat.ts` owns session state and falls back to `answerQuery()` on any network/auth failure; `AIAssistant.tsx` gets a chat UI below the existing insights block.

**Tech Stack:** React + TypeScript, Vitest, `vi.fn` / `global.fetch` mocking, Tailwind CSS, existing Dexie analytics layer.

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `src/services/ai/contextBuilder.ts` | Create | Build plain-text financial snapshot from IndexedDB |
| `src/services/ai/contextBuilder.test.ts` | Create | Unit tests for snapshot content |
| `src/services/ai/aiClient.ts` | Create | OpenRouter HTTP client, error typing |
| `src/services/ai/aiClient.test.ts` | Create | Unit tests with mocked fetch |
| `src/app/hooks/useAIChat.ts` | Create | Chat session state, API call, fallback logic |
| `src/app/hooks/useAIChat.test.ts` | Create | Hook tests with mocked client + contextBuilder |
| `src/app/screens/AIAssistant.tsx` | Modify | Add chat section below insights |

---

## Task 1: `contextBuilder.ts` — financial snapshot

**Files:**
- Create: `src/services/ai/contextBuilder.ts`
- Create: `src/services/ai/contextBuilder.test.ts`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Users/alexander/Documents/Finly/src/services/ai
```

- [ ] **Step 2: Write the failing test**

Create `src/services/ai/contextBuilder.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildFinancialSnapshot } from './contextBuilder';
import * as analytics from '../../db/analytics';

vi.mock('../../db/analytics', () => ({
  getBalanceByPeriod:    vi.fn(),
  getExpensesByCategory: vi.fn(),
  getAllBudgetsProgress:  vi.fn(),
  getGoalsProgress:      vi.fn(),
  getRecurringUpcoming:  vi.fn(),
  getSavingsRate:        vi.fn(),
}));

const m = analytics as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  m.getBalanceByPeriod.mockResolvedValue({
    income: 80000, expenses: 34800, balance: 45200,
    periodStart: 0, periodEnd: 1,
  });
  m.getExpensesByCategory.mockResolvedValue([
    { categoryId: '1', categoryName: 'Продукты', amount: 12400, percent: 35, icon: '🛒', color: '#f00' },
    { categoryId: '2', categoryName: 'Транспорт', amount: 5200, percent: 15, icon: '🚗', color: '#0f0' },
  ]);
  m.getAllBudgetsProgress.mockResolvedValue([
    { categoryId: '1', categoryName: 'Продукты', spent: 12400, limit: 15000, percent: 83, isOverBudget: false, icon: '🛒', color: '#f00' },
    { categoryId: '3', categoryName: 'Кафе', spent: 4100, limit: 4000, percent: 102, isOverBudget: true, icon: '☕', color: '#00f' },
  ]);
  m.getGoalsProgress.mockResolvedValue([
    { id: 1, name: 'Отпуск', targetAmount: 60000, currentAmount: 18000, percent: 30, remaining: 42000, icon: '✈️', color: '#00f', isActive: true },
  ]);
  m.getRecurringUpcoming.mockResolvedValue([
    { label: 'Spotify', amount: 299, daysUntil: 0 },
    { label: 'Аренда', amount: 30000, daysUntil: 12 },
  ]);
  m.getSavingsRate.mockResolvedValue({ income: 80000, expenses: 34800, saved: 45200, savingsRate: 56.5 });
});

describe('buildFinancialSnapshot', () => {
  it('includes balance line', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('45 200');
  });

  it('includes income and expenses', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('80 000');
    expect(snap).toContain('34 800');
  });

  it('includes savings rate', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('57%');
  });

  it('includes top spending categories', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('Продукты');
    expect(snap).toContain('Транспорт');
  });

  it('marks over-budget categories with ❌', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('Кафе');
    expect(snap).toContain('❌');
  });

  it('includes active goals', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('Отпуск');
    expect(snap).toContain('30%');
  });

  it('formats upcoming payments with today label', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('Spotify');
    expect(snap).toContain('сегодня');
  });

  it('omits goals section when no active goals', async () => {
    m.getGoalsProgress.mockResolvedValue([]);
    const snap = await buildFinancialSnapshot();
    expect(snap).not.toContain('Цели');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/alexander/Documents/Finly && npx vitest run src/services/ai/contextBuilder.test.ts
```

Expected: FAIL — `contextBuilder` module not found.

- [ ] **Step 4: Create `contextBuilder.ts`**

Create `src/services/ai/contextBuilder.ts`:

```typescript
import {
  getBalanceByPeriod,
  getExpensesByCategory,
  getAllBudgetsProgress,
  getGoalsProgress,
  getRecurringUpcoming,
  getSavingsRate,
} from '../../db/analytics';

const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');

export async function buildFinancialSnapshot(): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = now.getTime();

  const [balance, categories, budgets, goals, upcoming, savings] = await Promise.all([
    getBalanceByPeriod(monthStart, end),
    getExpensesByCategory(monthStart, end),
    getAllBudgetsProgress(monthStart, end),
    getGoalsProgress(),
    getRecurringUpcoming(30),
    getSavingsRate(monthStart, end),
  ]);

  const monthName = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  const lines: string[] = [
    `Финансовый профиль пользователя (${monthName}):`,
    `Баланс: ${fmt(balance.balance)} ₽`,
    `Доходы за месяц: ${fmt(balance.income)} ₽ | Расходы: ${fmt(balance.expenses)} ₽`,
  ];

  if (savings.income > 0) {
    lines.push(`Норма сбережений: ${Math.round(savings.savingsRate)}%`);
  }

  if (categories.length > 0) {
    const top = categories.slice(0, 5)
      .map(c => `${c.categoryName} ${fmt(c.amount)} ₽`)
      .join(', ');
    lines.push(`Топ категории расходов: ${top}`);
  }

  if (budgets.length > 0) {
    const budgetStr = budgets
      .map(b => {
        const flag = b.isOverBudget ? '❌' : b.percent >= 80 ? '⚠️' : '✅';
        return `${b.categoryName} ${fmt(b.spent)}/${fmt(b.limit)} ₽ ${flag}`;
      })
      .join(', ');
    lines.push(`Бюджеты: ${budgetStr}`);
  }

  const activeGoals = goals.filter(g => g.isActive && g.percent < 100);
  if (activeGoals.length > 0) {
    const goalStr = activeGoals
      .slice(0, 3)
      .map(g => `"${g.name}" ${fmt(g.currentAmount)}/${fmt(g.targetAmount)} ₽ (${Math.round(g.percent)}%)`)
      .join(', ');
    lines.push(`Цели накопления: ${goalStr}`);
  }

  if (upcoming.length > 0) {
    const payStr = upcoming
      .slice(0, 3)
      .map(r => {
        const when =
          r.daysUntil <= 0 ? 'сегодня' :
          r.daysUntil === 1 ? 'завтра' :
          `через ${r.daysUntil} дн.`;
        return `${r.label} ${fmt(r.amount)} ₽ (${when})`;
      })
      .join(', ');
    lines.push(`Ближайшие платежи: ${payStr}`);
  }

  return lines.join('\n');
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/alexander/Documents/Finly && npx vitest run src/services/ai/contextBuilder.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/ai/contextBuilder.ts src/services/ai/contextBuilder.test.ts
git commit -m "feat: add AI financial snapshot context builder"
```

---

## Task 2: `aiClient.ts` — OpenRouter HTTP client

**Files:**
- Create: `src/services/ai/aiClient.ts`
- Create: `src/services/ai/aiClient.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/ai/aiClient.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatCompletion, AIClientError } from './aiClient';
import type { AIClientConfig } from './aiClient';

const CONFIG: AIClientConfig = {
  apiKey: 'test-key',
  model: 'openai/gpt-4o-mini',
};

const SYSTEM = 'You are a helpful assistant.';
const MESSAGES = [{ role: 'user' as const, content: 'Hello' }];

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOk(content: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

function mockStatus(status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({}),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('chatCompletion', () => {
  it('returns assistant text on success', async () => {
    mockOk('Привет!');
    const result = await chatCompletion(CONFIG, SYSTEM, MESSAGES);
    expect(result).toBe('Привет!');
  });

  it('sends system prompt + messages in request body', async () => {
    mockOk('ok');
    await chatCompletion(CONFIG, SYSTEM, MESSAGES);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.messages[0]).toEqual({ role: 'system', content: SYSTEM });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' });
  });

  it('uses openrouter.ai base URL by default', async () => {
    mockOk('ok');
    await chatCompletion(CONFIG, SYSTEM, MESSAGES);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('openrouter.ai');
  });

  it('uses custom baseUrl when provided', async () => {
    mockOk('ok');
    await chatCompletion({ ...CONFIG, baseUrl: 'https://my.proxy.dev/v1' }, SYSTEM, MESSAGES);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('my.proxy.dev');
  });

  it('throws AIClientError with type auth on 401', async () => {
    mockStatus(401);
    await expect(chatCompletion(CONFIG, SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'auth' });
  });

  it('throws AIClientError with type rate_limit on 429', async () => {
    mockStatus(429);
    await expect(chatCompletion(CONFIG, SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'rate_limit' });
  });

  it('throws AIClientError with type network when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
    await expect(chatCompletion(CONFIG, SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'network' });
  });

  it('throws AIClientError with type unknown on empty choices', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    });
    await expect(chatCompletion(CONFIG, SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'unknown' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/alexander/Documents/Finly && npx vitest run src/services/ai/aiClient.test.ts
```

Expected: FAIL — `aiClient` module not found.

- [ ] **Step 3: Create `aiClient.ts`**

Create `src/services/ai/aiClient.ts`:

```typescript
export interface AIClientConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly type: 'network' | 'auth' | 'rate_limit' | 'unknown',
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

export async function chatCompletion(
  config: AIClientConfig,
  systemPrompt: string,
  messages: AIMessage[],
): Promise<string> {
  const url = `${config.baseUrl ?? 'https://openrouter.ai/api/v1'}/chat/completions`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://finly.app',
        'X-Title': 'Finly',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
  } catch {
    throw new AIClientError('Network request failed', 'network');
  }

  if (res.status === 401) throw new AIClientError('Invalid API key', 'auth');
  if (res.status === 429) throw new AIClientError('Rate limit exceeded', 'rate_limit');
  if (!res.ok) throw new AIClientError(`HTTP ${res.status}`, 'unknown');

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AIClientError('Empty response from API', 'unknown');

  return content;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/alexander/Documents/Finly && npx vitest run src/services/ai/aiClient.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/aiClient.ts src/services/ai/aiClient.test.ts
git commit -m "feat: add OpenRouter AI client with typed errors"
```

---

## Task 3: `useAIChat.ts` — chat hook

**Files:**
- Create: `src/app/hooks/useAIChat.ts`
- Create: `src/app/hooks/useAIChat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/hooks/useAIChat.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIChat } from './useAIChat';

vi.mock('../../services/ai/contextBuilder', () => ({
  buildFinancialSnapshot: vi.fn().mockResolvedValue('Баланс: 45 000 ₽'),
}));

vi.mock('../../services/ai/aiClient', () => ({
  chatCompletion: vi.fn(),
  AIClientError: class AIClientError extends Error {
    constructor(message: string, public type: string) { super(message); }
  },
}));

vi.mock('./chatContext', () => ({
  answerQuery: vi.fn().mockResolvedValue({
    answer: 'Локальный ответ',
    newCtx: {},
    suggestions: [],
  }),
}));

// Silence import.meta.env in tests
vi.stubEnv('VITE_OPENROUTER_API_KEY', 'test-key');
vi.stubEnv('VITE_AI_MODEL', 'openai/gpt-4o-mini');

import { chatCompletion } from '../../services/ai/aiClient';
import { answerQuery } from './chatContext';

const mockCompletion = chatCompletion as ReturnType<typeof vi.fn>;
const mockAnswerQuery = answerQuery as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAIChat', () => {
  it('appends user message immediately on sendMessage', async () => {
    mockCompletion.mockResolvedValue('AI ответ');
    const { result } = renderHook(() => useAIChat());

    await act(async () => { await result.current.sendMessage('Баланс?'); });

    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'Баланс?' });
  });

  it('appends assistant reply after successful API call', async () => {
    mockCompletion.mockResolvedValue('Ваш баланс 45 000 ₽');
    const { result } = renderHook(() => useAIChat());

    await act(async () => { await result.current.sendMessage('Баланс?'); });

    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: 'Ваш баланс 45 000 ₽' });
    expect(result.current.isOffline).toBe(false);
  });

  it('falls back to local answerQuery when API throws', async () => {
    mockCompletion.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useAIChat());

    await act(async () => { await result.current.sendMessage('Баланс?'); });

    expect(mockAnswerQuery).toHaveBeenCalledWith('Баланс?', {});
    expect(result.current.messages[1].content).toBe('Локальный ответ');
    expect(result.current.isOffline).toBe(true);
  });

  it('sets isLoading true during request then false after', async () => {
    let resolve!: (v: string) => void;
    mockCompletion.mockReturnValue(new Promise<string>(r => { resolve = r; }));

    const { result } = renderHook(() => useAIChat());
    const promise = act(async () => { result.current.sendMessage('test'); });
    
    expect(result.current.isLoading).toBe(true);
    resolve('done');
    await promise;
    expect(result.current.isLoading).toBe(false);
  });

  it('clearHistory resets messages and offline state', async () => {
    mockCompletion.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAIChat());

    await act(async () => { await result.current.sendMessage('test'); });
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => { result.current.clearHistory(); });
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isOffline).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/alexander/Documents/Finly && npx vitest run src/app/hooks/useAIChat.test.ts
```

Expected: FAIL — `useAIChat` module not found.

- [ ] **Step 3: Create `useAIChat.ts`**

Create `src/app/hooks/useAIChat.ts`:

```typescript
import { useState, useCallback, useRef } from 'react';
import { chatCompletion, type AIClientConfig, type AIMessage } from '../../services/ai/aiClient';
import { buildFinancialSnapshot } from '../../services/ai/contextBuilder';
import { answerQuery, type ChatCtx } from './chatContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isOffline?: boolean;
}

const AI_CONFIG: AIClientConfig = {
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? '',
  model: import.meta.env.VITE_AI_MODEL ?? 'openai/gpt-4o-mini',
};

const SYSTEM_PERSONA =
  'Ты финансовый ассистент приложения Finly. Отвечай кратко и по делу на русском языке.\n' +
  'Используй данные пользователя ниже для точных ответов. Не придумывай цифры.';

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const localCtxRef = useRef<ChatCtx>({});

  const sendMessage = useCallback(async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const snapshot = await buildFinancialSnapshot();
      const systemPrompt = `${SYSTEM_PERSONA}\n\n${snapshot}`;

      const history: AIMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      const reply = await chatCompletion(AI_CONFIG, systemPrompt, history);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setIsOffline(false);
    } catch {
      const { answer, newCtx } = await answerQuery(text, localCtxRef.current);
      localCtxRef.current = newCtx;
      setMessages(prev => [...prev, { role: 'assistant', content: answer, isOffline: true }]);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localCtxRef.current = {};
    setIsOffline(false);
  }, []);

  return { messages, isLoading, isOffline, sendMessage, clearHistory };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/alexander/Documents/Finly && npx vitest run src/app/hooks/useAIChat.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/hooks/useAIChat.ts src/app/hooks/useAIChat.test.ts
git commit -m "feat: add useAIChat hook with OpenRouter + offline fallback"
```

---

## Task 4: Update `AIAssistant.tsx` — add chat UI

**Files:**
- Modify: `src/app/screens/AIAssistant.tsx`

> Note: `useAIInsights` retains its existing `sendMessage`/`chatHistory` for now — this task adds a parallel chat section using `useAIChat`. The old chat code in `useAIInsights` becomes dead code, cleaned up in a future PR.

- [ ] **Step 1: Replace `AIAssistant.tsx` with the updated version**

```typescript
import { useEffect, useRef, useState } from 'react';
import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, TrendingUp, Loader2, Send, WifiOff } from 'lucide-react';
import { useAIInsights, type Insight } from '../hooks/useAIInsights';
import { useAIChat } from '../hooks/useAIChat';

const INSIGHT_CONFIG = {
  alert:    { Icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/40' },
  warning:  { Icon: TrendingDown,  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/40' },
  tip:      { Icon: Lightbulb,     color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },
  positive: { Icon: TrendingUp,    color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
} as const;

const SUGGESTIONS = [
  'Мой баланс',
  'Расходы за месяц',
  'Состояние бюджетов',
  'Мои цели',
  'Прогноз до конца месяца',
];

function InsightCard({ insight }: { insight: Insight }) {
  const cfg = INSIGHT_CONFIG[insight.type];
  const Icon = insight.type === 'warning' && insight.id.startsWith('cat') ? TrendingDown : cfg.Icon;

  return (
    <div className="flex gap-3 p-4 bg-card border border-border rounded-2xl">
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5">{insight.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
      </div>
    </div>
  );
}

export const AIAssistant = () => {
  const { loading, insights } = useAIInsights();
  const { messages, isLoading, isOffline, sendMessage } = useAIChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pb-20 bg-background min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Умный анализ финансов</p>
            <h1 className="text-xl font-bold">AI Ассистент</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Insights */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">Инсайты</h2>
            {!loading && insights.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {insights.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Загрузка…</span>
            </div>
          ) : (
            <div className="space-y-2">
              {insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="px-4 pt-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">Спросить AI</h2>
            {isOffline && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <WifiOff className="w-3 h-3" />
                офлайн
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 mb-3 min-h-[80px]">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border px-3 py-2 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 sticky bottom-0 pb-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите вопрос…"
              className="flex-1 text-sm px-4 py-2.5 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40 transition-opacity hover:bg-violet-700"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run the full test suite to catch regressions**

```bash
cd /Users/alexander/Documents/Finly && npm test
```

Expected: All existing tests pass, new tests pass.

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/alexander/Documents/Finly && npm run build 2>&1 | tail -20
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/screens/AIAssistant.tsx
git commit -m "feat: add AI chat UI to AIAssistant screen"
```

---

## Task 5: Add env variable stubs

**Files:**
- Modify: `.env` or `.env.local` (whichever exists)

- [ ] **Step 1: Check which env file exists**

```bash
ls /Users/alexander/Documents/Finly/.env* 2>/dev/null || echo "no env files"
```

- [ ] **Step 2: Add stub variables**

If `.env` exists, append:
```
VITE_OPENROUTER_API_KEY=
VITE_AI_MODEL=openai/gpt-4o-mini
```

If no env file exists, create `.env`:
```
VITE_OPENROUTER_API_KEY=
VITE_AI_MODEL=openai/gpt-4o-mini
```

- [ ] **Step 3: Add to `.env.example` if it exists so teammates know about it**

If `.env.example` exists, append the same two lines to it.

- [ ] **Step 4: Commit**

```bash
git add .env.example  # only if it exists
git commit -m "chore: add OpenRouter env variable stubs"
```

---

## Self-Review

## Implementation Status: ✅ Завершено

План реализован. Ключевое отличие от плана: API-ключ OpenRouter перемещён на серверную сторону. Вместо клиентского `VITE_OPENROUTER_API_KEY` используется Vercel Function (`api/ai-chat.ts`) как прокси, получающая `OPENROUTER_API_KEY` из серверных переменных окружения. Это исключает попадание ключа в клиентский JS-бандл. Клиент (`aiClient.ts`) теперь обращается к `/api/ai-chat` вместо `openrouter.ai` напрямую. Локальный `.env` с `VITE_*` переменными больше не нужен.

---

**Spec coverage check:**
- ✅ `contextBuilder.ts` — balance, income, expenses, top categories, budgets, goals, upcoming payments
- ✅ `aiClient.ts` — OpenRouter (OpenAI-compatible), `AIClientConfig`, typed errors
- ✅ `useAIChat.ts` — session-only history, `isLoading`, `isOffline`, fallback to `answerQuery`
- ✅ `AIAssistant.tsx` — chat UI below insights, user/assistant bubbles, suggestions when empty, offline badge
- ✅ System prompt — persona + snapshot injected per request
- ✅ Env vars — `VITE_OPENROUTER_API_KEY`, `VITE_AI_MODEL`
- ✅ Offline fallback — any throw → `answerQuery()`, `isOffline = true`

**Placeholder scan:** No TBDs, all code blocks are complete.

**Type consistency check:**
- `ChatMessage` in `useAIChat.ts` uses `{ role, content, isOffline? }` — consistent across hook and screen
- `AIMessage` in `aiClient.ts` uses `{ role, content }` (includes `'system'` role) — used internally only
- `buildFinancialSnapshot()` returns `Promise<string>` — consumed as string in `useAIChat` ✅
- `chatCompletion(config, systemPrompt, messages)` — called with exact same signature in `useAIChat` ✅
