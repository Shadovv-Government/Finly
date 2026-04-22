import { describe, it, expect } from 'vitest';
import {
  extractAmount,
  extractMerchant,
  extractDate,
  getReceiptScannerWorkerOptions,
  getRequiredReceiptScannerCoreAssets,
} from './useReceiptScanner';

describe('extractAmount', () => {
  it('extracts amount after ИТОГО keyword', () => {
    expect(extractAmount('Хлеб 50.00\nМолоко 89.00\nИТОГО 139.00')).toBe(139);
  });

  it('extracts amount after TOTAL keyword', () => {
    expect(extractAmount('Bread 1.50\nTOTAL 1.50')).toBe(1.5);
  });

  it('extracts amount after К ОПЛАТЕ keyword', () => {
    expect(extractAmount('К ОПЛАТЕ 450,00')).toBe(450);
  });

  it('falls back to largest number when no keyword found', () => {
    expect(extractAmount('Товар 1\n50.00\n20.00\n100.50')).toBe(100.5);
  });

  it('returns null for empty text', () => {
    expect(extractAmount('')).toBeNull();
  });

  it('handles numbers with spaces as thousand separators', () => {
    expect(extractAmount('ИТОГО 1 250,00')).toBe(1250);
  });
});

describe('extractMerchant', () => {
  it('returns first non-empty line', () => {
    expect(extractMerchant('\nПятёрочка\nул. Ленина 5\n')).toBe('Пятёрочка');
  });

  it('returns null for empty text', () => {
    expect(extractMerchant('')).toBeNull();
  });

  it('skips blank leading lines', () => {
    expect(extractMerchant('\n\nМагнит')).toBe('Магнит');
  });
});

describe('extractDate', () => {
  it('parses DD.MM.YYYY format', () => {
    expect(extractDate('Дата: 22.04.2026')).toBe('2026-04-22');
  });

  it('parses DD/MM/YYYY format', () => {
    expect(extractDate('22/04/2026')).toBe('2026-04-22');
  });

  it('parses ISO YYYY-MM-DD format', () => {
    expect(extractDate('2026-04-22 14:30')).toBe('2026-04-22');
  });

  it('returns null when no date found', () => {
    expect(extractDate('no date here')).toBeNull();
  });
});

describe('getReceiptScannerWorkerOptions', () => {
  it('uses local worker, core, and language assets', () => {
    expect(getReceiptScannerWorkerOptions()).toEqual({
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract-core',
      langPath: '/tessdata/4.0.0_best_int',
      gzip: true,
    });
  });
});

describe('getRequiredReceiptScannerCoreAssets', () => {
  it('includes relaxedsimd core variants for browsers that support them', () => {
    expect(getRequiredReceiptScannerCoreAssets()).toEqual([
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
    ]);
  });
});
