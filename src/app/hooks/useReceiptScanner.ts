import { useState } from 'react';
import { preprocessReceiptImage, toGrayscaleContrast, boxBlur3x3 } from '../utils/imagePreprocess';

export interface ReceiptData {
  amount: number | null;
  merchant: string | null;
  date: string | null; // ISO "YYYY-MM-DD"
  confidence: number; // 0–100
  rawText: string;
  currency?: string | null;
  categoryHint?: string | null;
  items?: string[];
  engine?: 'qr' | 'tesseract';
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

// Maximum dimension for QR scanning bitmaps.
// Phone cameras produce 12–48MP photos — loading those at full resolution
// exhausts mobile browser memory and makes QR modules too sparse to detect.
// 2048px keeps a ~4MP RGBA bitmap (~16 MB), well within mobile limits,
// while preserving enough module density for reliable detection.
const QR_MAX_DIM = 2048;

// NOTE: We intentionally omit `imageOrientation` from createImageBitmap options.
// The option was added in Chrome 93 and caused TypeError on Chrome 88-99
// (unrecognized options threw instead of being ignored). Modern browsers
// default to 'from-image' anyway; BarcodeDetector and jsQR detect QR codes
// in any orientation, so orientation correction is unimportant for QR scanning.
async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, {
    resizeWidth: QR_MAX_DIM,
    resizeHeight: QR_MAX_DIM,
  });
}

// Load a File as HTMLImageElement via blob URL — the most compatible approach
// across all browsers and file formats. Image elements respect EXIF orientation
// automatically and support HEIC/HEIF on iOS Safari.
function imageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image decode failed')); };
    img.src = url;
  });
}

async function tryQrCode(file: File): Promise<ReceiptData | null> {
  // Try native BarcodeDetector first (fast, Chrome/Edge/Safari 17.4+).
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  if (hasBarcodeDetector) {
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const bitmap = await bitmapFromFile(file);
      const codes = await detector.detect(bitmap);
      bitmap.close();
      if (codes.length) {
        const result = parseFiscalQr(codes[0].rawValue);
        if (result) return result;
      }
    } catch {
      // BarcodeDetector failed — fall through to jsQR.
      // Common causes: unsupported image format, memory pressure, or the
      // imageOrientation option rejection in Chrome <100.
    }
  }

  // Universal fallback: jsQR — pure JS, works in any browser including Firefox.
  // Uses Image element for decoding (more compatible than createImageBitmap).
  return tryQrCodeJsQR(file);
}

// Quick pre-filter: a Russian ФНС fiscal QR always has t=, s=, fn=.
// Avoids calling parseFiscalQr on promo/loyalty/URL QR codes.
function isFiscalQrString(str: string): boolean {
  return str.includes('t=') && str.includes('s=') && str.includes('fn=');
}

async function tryQrCodeJsQR(file: File): Promise<ReceiptData | null> {
  try {
    const { default: jsQR } = await import('jsqr');

    // Use Image element for decoding — more compatible than createImageBitmap
    // across mobile browsers. Image handles EXIF, HEIC, and unusual JPEG variants.
    const img = await imageFromFile(file);
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // Upscale narrow images so QR modules have at least ~3px each.
    // We anchor on the SHORT side: receipts are portrait, so width limits module density.
    // DNS receipt at 250px → 800px (3.2×), Пятёрочка at 607px → 800px (1.3×).
    const MIN_SHORT = 800;
    let w = srcW;
    let h = srcH;
    const shortSide = Math.min(w, h);
    if (shortSide < MIN_SHORT) {
      const scale = MIN_SHORT / shortSide;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    // Downscale large photos — phone cameras produce 12–48MP images (e.g. 4032×3024).
    // Without a cap, the canvas + 6× getImageData calls consume ~290 MB on mobile,
    // triggering OOM. Capping the long side at QR_MAX_DIM (2048px) keeps memory
    // under ~75 MB while preserving enough density for reliable QR detection.
    const longSide = Math.max(w, h);
    if (longSide > QR_MAX_DIM) {
      const scale = QR_MAX_DIM / longSide;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    // willReadFrequently keeps the canvas in CPU memory — without it each getImageData
    // triggers a GPU→CPU transfer, which is slow when we call it 3 times per scan.
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);

    // Attempt jsQR on a region. Each call gets a fresh ImageData copy so
    // toGrayscaleContrast mutations in one pass don't affect others.
    const tryRegion = (sx: number, sy: number, sw: number, sh: number, _label: string): ReceiptData | null => {
      const data = ctx.getImageData(sx, sy, sw, sh);
      // Grayscale + percentile contrast stretch: jsQR reads only the R byte,
      // so we need true luma and high contrast before handing off.
      toGrayscaleContrast(data.data);
      const code = jsQR(data.data, sw, sh, { inversionAttempts: 'attemptBoth' });
      if (!code || !isFiscalQrString(code.data)) return null;
      return parseFiscalQr(code.data);
    };

    // Pass 1: full image
    const full = tryRegion(0, 0, w, h, 'полное изображение');
    if (full) return full;

    // Pass 2: bottom 30% — ФНС QR is almost always in the bottom strip of a receipt.
    // Scanning a sub-region dramatically improves module density ratio for jsQR.
    const y30 = Math.floor(h * 0.7);
    const roi30 = tryRegion(0, y30, w, h - y30, `нижние 30% (y=${y30})`);
    if (roi30) return roi30;

    // Pass 3: bottom 50% — wider net for short receipts or unusual layouts.
    const y50 = Math.floor(h * 0.5);
    const roi50 = tryRegion(0, y50, w, h - y50, `нижние 50% (y=${y50})`);
    if (roi50) return roi50;

    // ── Monitor/screen scan fallback ───────────────────────────────────
    // Photographing a screen creates moiré patterns (camera sensor grid ×
    // monitor pixel grid) — high-frequency noise that confuses QR detectors.
    // A 3×3 box blur acts as a low-pass filter: kills moiré while preserving
    // QR module edges (modules are ≥3px after our upscale).
    //
    // We blur the canvas in-place and re-run all three regions.
    // The blur is cheap — <5ms on a 2000px canvas.
    const fullImage = ctx.getImageData(0, 0, w, h);
    toGrayscaleContrast(fullImage.data);
    boxBlur3x3(fullImage.data, w, h);
    ctx.putImageData(fullImage, 0, 0);

    const bFull = tryRegion(0, 0, w, h, 'blur: полное изображение');
    if (bFull) return bFull;

    const by30 = tryRegion(0, y30, w, h - y30, `blur: нижние 30% (y=${y30})`);
    if (by30) return by30;

    const by50 = tryRegion(0, y50, w, h - y50, `blur: нижние 50% (y=${y50})`);
    if (by50) return by50;

    return null;
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
  const i  = p.get('i');  // document number

  // Need a sum + at least two fiscal identifiers to avoid false positives on promo QRs.
  // Accepted combos: (fn+fp), (fn+i), (fn+t), (fp+t)
  const fiscalCount = [fn, fp, i, t].filter(Boolean).length;
  if (!s || fiscalCount < 2) return null;

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

      // No QR found — fall back to Tesseract OCR.
      setStatusMessage('QR не найден, запускаю OCR...');
      const preprocessed = await preprocessReceiptImage(file);

      setStatusMessage('OCR-распознавание...');
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['rus', 'eng'], 1, getReceiptScannerWorkerOptions());
      // PSM 6 = single uniform block — handles mixed font sizes on receipts.
      // preserve_interword_spaces keeps "1 250,00" intact for amount patterns.
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
