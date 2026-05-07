import type { ReceiptData } from '../hooks/useReceiptScanner';

// Comprehensive prompt: works for any receipt format, language, or orientation.
const CLAUDE_PROMPT = `Parse this receipt/check image and extract all financial data.

Return ONLY a raw JSON object (no markdown, no code blocks):
{
  "amount": <final total as number, or null>,
  "merchant": <store/business name as string, or null>,
  "date": <"YYYY-MM-DD" or null>,
  "currency": <ISO code: "RUB"|"USD"|"EUR"|"GBP"|"CNY"|"KZT"|"UAH"|"BYN" or null>,
  "categoryHint": <"Продукты"|"Ресторан/Кафе"|"Транспорт"|"Здоровье"|"Шопинг"|"Развлечения"|"Коммунальные"|"АЗС" or null>,
  "items": [<up to 5 main items as short strings>],
  "confidence": <integer 0-100>
}

Rules:
- amount: the FINAL amount paid (after discounts/taxes), NOT a subtotal
- merchant: proper-cased business name only — no address, tax IDs, or phone numbers
- currency: infer from symbols (₽=RUB, $=USD, €=EUR, £=GBP, ¥=CNY, ₸=KZT)
- categoryHint: pick the single best matching category
- confidence: your overall parsing confidence

Handle any language, print quality, orientation, or receipt format worldwide.`;

export interface ParsedReceiptAI extends ReceiptData {
  currency: string | null;
  categoryHint: string | null;
  items: string[];
  engine: 'claude';
}

export async function parseReceiptWithClaude(
  imageBase64: string,
  apiKey: string,
): Promise<ParsedReceiptAI> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
            },
            { type: 'text', text: CLAUDE_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const json = await res.json();
  const text: string = json.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error('Invalid JSON from Claude');
  }

  return {
    amount: typeof parsed.amount === 'number' ? parsed.amount : null,
    merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
    date: typeof parsed.date === 'string' ? parsed.date : null,
    currency: typeof parsed.currency === 'string' ? parsed.currency : null,
    categoryHint: typeof parsed.categoryHint === 'string' ? parsed.categoryHint : null,
    items: Array.isArray(parsed.items) ? (parsed.items as unknown[]).map(String) : [],
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 85,
    rawText: text,
    engine: 'claude',
  };
}

export function getAnthropicApiKey(): string | null {
  try {
    return localStorage.getItem('finly-anthropic-key');
  } catch {
    return null;
  }
}

export function setAnthropicApiKey(key: string | null): void {
  try {
    if (key?.trim()) {
      localStorage.setItem('finly-anthropic-key', key.trim());
    } else {
      localStorage.removeItem('finly-anthropic-key');
    }
  } catch {
    // localStorage unavailable (e.g. private mode)
  }
}
