import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatCompletion } from './aiClient';

const SYSTEM = 'You are a helpful assistant.';
const MESSAGES = [{ role: 'user' as const, content: 'Hello' }];

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOk(content: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ content }),
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
    const result = await chatCompletion(SYSTEM, MESSAGES);
    expect(result).toBe('Привет!');
  });

  it('calls the proxy endpoint', async () => {
    mockOk('ok');
    await chatCompletion(SYSTEM, MESSAGES);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/ai-chat');
  });

  it('sends systemPrompt and messages in request body', async () => {
    mockOk('ok');
    await chatCompletion(SYSTEM, MESSAGES);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.systemPrompt).toBe(SYSTEM);
    expect(body.messages).toEqual(MESSAGES);
  });

  it('throws AIClientError with type auth on 500 (proxy auth failed)', async () => {
    mockStatus(500);
    await expect(chatCompletion(SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'auth' });
  });

  it('throws AIClientError with type rate_limit on 503', async () => {
    mockStatus(503);
    await expect(chatCompletion(SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'rate_limit' });
  });

  it('throws AIClientError with type network when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
    await expect(chatCompletion(SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'network' });
  });

  it('throws AIClientError with type unknown on empty content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: '' }),
    });
    await expect(chatCompletion(SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'unknown' });
  });

  it('throws AIClientError when proxy returns an error field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ error: 'something went wrong' }),
    });
    await expect(chatCompletion(SYSTEM, MESSAGES))
      .rejects.toMatchObject({ type: 'unknown' });
  });
});
