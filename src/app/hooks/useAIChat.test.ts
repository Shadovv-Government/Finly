import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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
import { buildFinancialSnapshot } from '../../services/ai/contextBuilder';

const mockCompletion = chatCompletion as ReturnType<typeof vi.fn>;
const mockAnswerQuery = answerQuery as ReturnType<typeof vi.fn>;
const mockSnapshot = buildFinancialSnapshot as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockSnapshot.mockResolvedValue('Баланс: 45 000 ₽');
  mockAnswerQuery.mockResolvedValue({
    answer: 'Локальный ответ',
    newCtx: {},
    suggestions: [],
  });
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
    mockSnapshot.mockResolvedValue('context');

    const { result } = renderHook(() => useAIChat());

    act(() => { result.current.sendMessage('test'); });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    resolve('done');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
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
