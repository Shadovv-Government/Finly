import { useState } from 'react';
import { preprocessReceiptImage, fileToBase64 } from '../utils/imagePreprocess';
import { parseReceiptWithGemini, getGeminiApiKey } from '../lib/geminiReceiptParser';
import { parseReceiptWithClaude, getAnthropicApiKey } from '../lib/claudeReceiptParser';

export interface ReceiptData {
  amount: number | null;
  merchant: string | null;
  date: string | null; // ISO "YYYY-MM-DD"
  confidence: number; // 0–100
  rawText: string;
  currency?: string | null;
  categoryHint?: string | null;
  items?: string[];
  engine?: 'qr' | 'gemini' | 'claude' | 'tesseract';
}

export type ReceiptScanError = 'low_confidence' | 'ocr_error';

export function getRequiredReceiptScannerCoreAssets() {
  return [
    'tesseract-core.wasm.js',
    'tesseract-core.wasm',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-simd.wasm',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-lstm.wasm',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm',
    'tesseract-core-relaxedsimd.wasm.js',
    'tesseract-core-relaxedsimd.wasm',
    'tesseract-core-relaxedsimd-lstm.wasm.js',
    'tesseract-core-relaxedsimd-lstm.wasm',
  ];
}

export function getReceiptScannerWorkerOptions() {
  return {
    workerPath: '/tesseract/worker.min.js',
    workerBlobURL: false,
    corePath: '/tesseract-core',
    langPath: '/tessdata/4.0.0_best_int',
    gzip: true,
  };
}

// ---------------------------------------------------------------------------
// QR-code path: Russian ФНС fiscal receipts encode all key data in a QR.
// Uses the built-in BarcodeDetector API (Chrome 88+, Safari 17.4+, Edge 88+).
// Format: t=YYYYMMDDTHHmmss&s=1234.56&fn=...&i=...&fp=...&n=1
// ---------------------------------------------------------------------------

declare class BarcodeDetector {
  constructor(opts: { formats: string[] });
  detect(img: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}

async function tryQrCode(file: File): Promise<ReceiptData | null> {
  // Try native BarcodeDetector first (fast, Chrome/Edge/Safari 17.4+).
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      bitmap.close();
      if (codes.length) {
        const result = parseFiscalQr(codes[0].rawValue);
        if (result) return result;
      }
    } catch {
      // fall through to jsQR
    }
  }

  // Universal fallback: jsQR — pure JS, works in any browser including Firefox.
  // Downscale to ≤1000px so jsQR stays fast even on large photos.
  return tryQrCodeJsQR(file);
}

async function tryQrCodeJsQR(file: File): Promise<ReceiptData | null> {
  try {
    const { default: jsQR } = await import('jsqr');

    const bitmap = await createImageBitmap(file);
    const MAX = 1000;
    let w = bitmap.width;
    let h = bitmap.height;
    if (Math.max(w, h) > MAX) {
      const s = MAX / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (!code) return null;
    return parseFiscalQr(code.data);
  } catch {
    return null;
  }
}

function parseFiscalQr(raw: string): ReceiptData | null {
  // Handle both bare query-string and full URL formats.
  const qs = raw.includes('?') ? raw.split('?')[1] : raw;
  const p = new URLSearchParams(qs);

  const s = p.get('s');
  const t = p.get('t');
  const fn = p.get('fn'); // fiscal drive number
  const fp = p.get('fp'); // fiscal sign

  // Require both a sum AND at least one fiscal identifier (fn or fp).
  // This prevents misreading promo/URL QR codes that happen to have an "s" param.
  if (!s || (!fn && !fp)) return null;

  const amount = parseFloat(s.replace(',', '.'));
  if (isNaN(amount) || amount <= 0) return null;

  let date: string | null = null;
  if (t) {
    const m = t.match(/^(\d{4})(\d{2})(\d{2})T/);
    if (m) date = `${m[1]}-${m[2]}-${m[3]}`;
  }

  return { amount, merchant: null, date, confidence: 99, rawText: raw, engine: 'qr' };
}

// ---------------------------------------------------------------------------
// Fixes common Tesseract character-substitution errors in numeric strings.
// Cyrillic letters that look like digits appear in amounts when OCR is uncertain.
function normalizeOcrDigits(text: string): string {
  return text
    .replace(/[ОоO]/g, (_m, offset, str) => {
      const prev = str[offset - 1] ?? '';
      const next = str[offset + 1] ?? '';
      const inNumericCtx = /[\d.,\s]/.test(prev) || /[\d.,\s]/.test(next);
      return inNumericCtx ? '0' : _m;
    })
    .replace(/З/g, (_m, offset, str) => (/\d/.test(str[offset - 1] ?? '') ? '3' : _m))
    .replace(/з/g, (_m, offset, str) => (/\d/.test(str[offset - 1] ?? '') ? '3' : _m))
    .replace(/[lI|]/g, (_m, offset, str) => {
      const prev = str[offset - 1] ?? '';
      const next = str[offset + 1] ?? '';
      return /\d/.test(prev) || /\d/.test(next) ? '1' : _m;
    });
}

// Keywords marking the final total line across many languages/formats.
const TOTAL_KEYWORD_RE =
  /(?:итого к оплате|к оплате|итоговая сумма|сумма к оплате|итого|grand total|total due|total amount|amount due|balance due|amount payable|montant total|gesamtbetrag|importe total|총합계|合計|総合計|총액|합계|total)/i;

function parseLocalNumber(s: string): number {
  const clean = s.replace(/\s/g, '');
  // European: 1.250,00
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(clean))
    return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  // American: 1,250.00
  if (/^\d{1,3}(,\d{3})+\.\d+$/.test(clean))
    return parseFloat(clean.replace(/,/g, ''));
  // Comma as decimal separator: 450,00
  return parseFloat(clean.replace(',', '.'));
}

// Ordered by specificity — most-specific patterns first.
const NUMBER_PATTERNS = [
  /(\d{1,3}(?:\s\d{3})+[.,]\d{2})/,   // 1 250,00  (Russian space-thousands)
  /(\d{1,3}(?:\.\d{3})+,\d{2})/,       // 1.250,00  (European)
  /(\d{1,3}(?:,\d{3})+\.\d{2})/,       // 1,250.00  (American)
  /(\d+[.,]\d{2})/,                      // 450.00 / 450,00
  /(\d{3,})/,                            // 1250  (integer fallback)
];

export function extractAmount(text: string): number | null {
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (!TOTAL_KEYWORD_RE.test(lines[i])) continue;

    // Try same line first, then the next line.
    for (const candidate of [lines[i], lines[i + 1] ?? '']) {
      for (const pat of NUMBER_PATTERNS) {
        const m = candidate.match(pat);
        if (m) {
          const val = parseLocalNumber(m[1]);
          if (!isNaN(val) && val > 0) return val;
        }
      }
    }
  }

  // Fallback: largest decimal number in the whole text.
  const all: number[] = [];
  for (const pat of NUMBER_PATTERNS.slice(0, 4)) {
    for (const m of text.matchAll(new RegExp(pat.source, 'g'))) {
      const v = parseLocalNumber(m[1]);
      if (!isNaN(v) && v > 0 && v < 10_000_000) all.push(v);
    }
  }
  return all.length > 0 ? Math.max(...all) : null;
}

// Patterns that identify non-merchant lines (tax IDs, addresses, etc.)
const SKIP_MERCHANT = [
  /^(?:ИНН|КПП|ОГРН|БИК|Р\/С|К\/С)/i,
  /^(?:кассир|касса|чек|кассовый|ккт|ФН|ФД|ФП)/i,
  /^(?:ул\.|пр\.|ш\.|просп\.|бул\.|пл\.|г\.)/i,
  /^\d+$/,
  /^\+?[\d\s()–\-]{7,}$/,
  /^(?:\d{2}[./]\d{2}[./]\d{2,4})/,
  /^(?:www\.|http)/i,
];

export function extractMerchant(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const candidates = lines.filter(
    (l) => l.length >= 3 && !SKIP_MERCHANT.some((p) => p.test(l)),
  );
  return candidates[0] ?? null;
}

const RU_MONTHS: Record<string, string> = {
  января: '01', февраля: '02', марта: '03', апреля: '04',
  мая: '05', июня: '06', июля: '07', августа: '08',
  сентября: '09', октября: '10', ноября: '11', декабря: '12',
};

const EN_MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

export function extractDate(text: string): string | null {
  // DD.MM.YYYY  DD/MM/YYYY  DD-MM-YYYY
  const dmy = text.match(/(\d{2})[./\-](\d{2})[./\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  // YYYY-MM-DD  YYYY/MM/DD
  const iso = text.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD MONTH YYYY  (Russian)
  const ruDate = text.match(
    /(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})/i,
  );
  if (ruDate) {
    return `${ruDate[3]}-${RU_MONTHS[ruDate[2].toLowerCase()]}-${ruDate[1].padStart(2, '0')}`;
  }

  // DD MONTH YYYY  (English)
  const enDate = text.match(
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
  );
  if (enDate) {
    return `${enDate[3]}-${EN_MONTHS[enDate[2].toLowerCase()]}-${enDate[1].padStart(2, '0')}`;
  }

  // DD.MM.YY short year
  const dmyShort = text.match(/(\d{2})[./](\d{2})[./](\d{2})\b/);
  if (dmyShort) {
    const year = parseInt(dmyShort[3]) > 50 ? `19${dmyShort[3]}` : `20${dmyShort[3]}`;
    return `${year}-${dmyShort[2]}-${dmyShort[1]}`;
  }

  return null;
}

export function useReceiptScanner() {
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ReceiptScanError | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const scan = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setErrorMessage(null);
    setResult(null);
    setStatusMessage('Читаю QR-код...');

    try {
      // Fastest path: read fiscal QR code (no OCR needed).
      const qrResult = await tryQrCode(file);
      if (qrResult) {
        setResult(qrResult);
        return;
      }

      setStatusMessage('Подготовка изображения...');
      const preprocessed = await preprocessReceiptImage(file);

      // Primary: Gemini Vision — free tier, no cost (15 RPM, 200 RPD)
      const geminiKey = getGeminiApiKey();
      if (geminiKey) {
        try {
          setStatusMessage('Gemini AI анализирует чек...');
          const base64 = await fileToBase64(preprocessed);
          const parsed = await parseReceiptWithGemini(base64, geminiKey);
          setResult(parsed);
          if (parsed.confidence < 60 || parsed.amount === null) {
            setError('low_confidence');
          }
          return;
        } catch (geminiErr) {
          console.warn('[ReceiptScanner] Gemini failed, trying next engine', geminiErr);
          setStatusMessage('Переключаюсь на другой движок...');
        }
      }

      // Secondary: Claude Vision (paid, higher quality)
      const anthropicKey = getAnthropicApiKey();
      if (anthropicKey) {
        try {
          setStatusMessage('Claude AI анализирует чек...');
          const base64 = await fileToBase64(preprocessed);
          const parsed = await parseReceiptWithClaude(base64, anthropicKey);
          setResult(parsed);
          if (parsed.confidence < 60 || parsed.amount === null) {
            setError('low_confidence');
          }
          return;
        } catch (claudeErr) {
          console.warn('[ReceiptScanner] Claude failed, falling back to OCR', claudeErr);
          setStatusMessage('Переключаюсь на OCR...');
        }
      }

      // Fallback: Tesseract OCR
      setStatusMessage('OCR-распознавание...');
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['rus', 'eng'], 1, getReceiptScannerWorkerOptions());
      // PSM 6 = single uniform block — handles mixed font sizes on receipts.
      // preserve_interword_spaces keeps "1 250,00" intact for amount patterns.
      // tessedit_char_whitelist limits the character set (helps legacy mode).
      await worker.setParameters({
        tessedit_pageseg_mode: '6' as never,
        preserve_interword_spaces: '1',
        tessedit_char_whitelist:
          '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
          'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя' +
          '.,: -/=*#₽$€£¥₸',
      });
      const { data } = await worker.recognize(preprocessed);
      await worker.terminate();

      const normalizedText = normalizeOcrDigits(data.text);
      const parsed: ReceiptData = {
        amount: extractAmount(normalizedText),
        merchant: extractMerchant(normalizedText),
        date: extractDate(normalizedText),
        confidence: data.confidence,
        rawText: normalizedText,
        engine: 'tesseract',
      };
      setResult(parsed);
      if (data.confidence < 40 || parsed.amount === null) {
        setError('low_confidence');
      }
    } catch (err) {
      console.error('[ReceiptScanner] failed', err);
      setError('ocr_error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setErrorMessage(null);
    setIsLoading(false);
    setStatusMessage(null);
  };

  return { scan, result, isLoading, error, errorMessage, statusMessage, reset };
}
