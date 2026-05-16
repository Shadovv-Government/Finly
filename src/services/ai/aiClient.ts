const PROXY_URL = '/api/ai-chat';

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
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'AIClientError';
  }
}

export async function chatCompletion(
  systemPrompt: string,
  messages: AIMessage[],
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, messages }),
    });
  } catch {
    throw new AIClientError('Network request failed', 'network');
  }

  if (res.status === 500) throw new AIClientError('Invalid API key', 'auth');
  if (res.status === 503) throw new AIClientError('Rate limit exceeded', 'rate_limit');
  if (!res.ok) throw new AIClientError(`HTTP ${res.status}`, 'unknown');

  const data = (await res.json()) as { content?: string; error?: string };
  if (data.error) throw new AIClientError(data.error, 'unknown');
  if (!data.content?.trim()) throw new AIClientError('Empty response', 'unknown');

  return data.content;
}
