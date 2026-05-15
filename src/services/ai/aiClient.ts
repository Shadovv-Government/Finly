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
    Object.setPrototypeOf(this, new.target.prototype);
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
  if (!content?.trim()) throw new AIClientError('Empty response from API', 'unknown');

  return content;
}
