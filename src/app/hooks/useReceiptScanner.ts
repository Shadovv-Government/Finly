import { useState } from 'react';

export interface ReceiptData {
  amount: number | null;
  merchant: string | null;
  date: string | null; // ISO "YYYY-MM-DD"
  confidence: number; // 0–100 from Tesseract
  rawText: string;
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
    corePath: '/tesseract-core',
    langPath: '/tessdata/4.0.0_best_int',
    gzip: true,
  };
}

export function extractAmount(text: string): number | null {
  const keywordPattern =
    /(?:итого|total|к оплате|сумма)[^\d]*(\d[\d \t]*[.,]\d{2}|\d+)/i;
  const keywordMatch = text.match(keywordPattern);
  if (keywordMatch) {
    const val = parseFloat(
      keywordMatch[1].replace(/\s/g, '').replace(',', '.')
    );
    if (!isNaN(val)) return val;
  }
  const allNumbers = [...text.matchAll(/\d[\d \t]*[.,]\d{2}/g)]
    .map((m) => parseFloat(m[0].replace(/\s/g, '').replace(',', '.')))
    .filter((n) => !isNaN(n) && n > 0);
  if (allNumbers.length === 0) return null;
  return Math.max(...allNumbers);
}

export function extractMerchant(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[0] ?? null;
}

export function extractDate(text: string): string | null {
  const dmy = text.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return null;
}

export function useReceiptScanner() {
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ReceiptScanError | null>(null);

  const scan = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['rus', 'eng'], 1, getReceiptScannerWorkerOptions());
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const parsed: ReceiptData = {
        amount: extractAmount(data.text),
        merchant: extractMerchant(data.text),
        date: extractDate(data.text),
        confidence: data.confidence,
        rawText: data.text,
      };
      setResult(parsed);
      if (data.confidence < 40 || parsed.amount === null) {
        setError('low_confidence');
      }
    } catch (error) {
      console.error('[ReceiptScanner] OCR failed', error);
      setError('ocr_error');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return { scan, result, isLoading, error, reset };
}
