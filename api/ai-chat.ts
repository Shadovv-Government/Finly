import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  const body = req.body as { systemPrompt?: string; messages?: Array<{ role: string; content: string }> } | undefined;
  if (!body?.messages?.length) {
    res.status(400).json({ error: 'Missing messages' });
    return;
  }

  const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://finly.app',
        'X-Title': 'Finly',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: body.systemPrompt ?? '' }, ...body.messages],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (upstream.status === 401) {
      res.status(500).json({ error: 'Upstream auth failed' });
      return;
    }
    if (upstream.status === 429) {
      res.status(503).json({ error: 'Upstream rate limit' });
      return;
    }
    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream error ${upstream.status}` });
      return;
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';

    if (!content.trim()) {
      res.status(502).json({ error: 'Empty upstream response' });
      return;
    }

    res.status(200).json({ content });
  } catch {
    res.status(502).json({ error: 'Failed to reach upstream' });
  }
}
