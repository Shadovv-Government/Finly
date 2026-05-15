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
