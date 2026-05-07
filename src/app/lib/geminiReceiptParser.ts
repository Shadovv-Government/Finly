import type { ReceiptData } from '../hooks/useReceiptScanner';

// Gemini free tier: 15 RPM, 200 RPD — plenty for a personal receipt scanner.
// Get a free key at https://aistudio.google.com/app/apikey
const GEMINI_MODEL = 'gemini-2.0-flash';

const RECEIPT_PROMPT = `Parse this receipt/check image and extract all financial data.

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

export interface ParsedReceiptGemini extends ReceiptData {
  currency: string | null;
  categoryHint: string | null;
  items: string[];
  engine: 'gemini';
}

export async function parseReceiptWithGemini(
  imageBase64: string,
  apiKey: string,
): Promise<ParsedReceiptGemini> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            { text: RECEIPT_PROMPT },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 512 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini API ${res.status}: ${body}`);
  }

  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Gemini response');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error('Invalid JSON from Gemini');
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
    engine: 'gemini',
  };
}

export function getGeminiApiKey(): string | null {
  try {
    return localStorage.getItem('finly-gemini-key');
  } catch {
    return null;
  }
}

export function setGeminiApiKey(key: string | null): void {
  try {
    if (key?.trim()) {
      localStorage.setItem('finly-gemini-key', key.trim());
    } else {
      localStorage.removeItem('finly-gemini-key');
    }
  } catch {
    // localStorage unavailable
  }
}
