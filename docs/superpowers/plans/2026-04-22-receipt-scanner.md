# Receipt Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an offline receipt scanner to AddTransaction that uses Tesseract.js OCR to extract total amount, merchant name, and date from a photo and pre-fill the form.

**Architecture:** A lazy-loaded `useReceiptScanner` hook encapsulates all OCR and parsing logic (dynamic `import('tesseract.js')` on first use). A `ReceiptScannerModal` component shows the photo preview with editable extracted fields. AddTransaction gets a Camera icon button that triggers a hidden file input.

**Tech Stack:** `tesseract.js` v5 (OCR), Lucide React (`Camera` icon), existing `parseDateInputValue` util, Vitest + Testing Library for tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/hooks/useReceiptScanner.ts` | Create | OCR execution, regex parsing, state |
| `src/app/hooks/useReceiptScanner.test.ts` | Create | Unit tests for all parser functions |
| `src/app/components/ReceiptScannerModal.tsx` | Create | Photo preview + editable fields + confirm UI |
| `src/app/components/ReceiptScannerModal.test.tsx` | Create | Component tests: loading / success / low-confidence |
| `src/app/screens/AddTransaction.tsx` | Modify | Camera button + hook + modal integration |

---

## Task 1: Install tesseract.js

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npm install tesseract.js
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify the type definitions are available**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: no new errors (tesseract.js ships its own types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install tesseract.js for offline OCR"
```

---

## Task 2: Create receipt parsing utilities and hook

**Files:**
- Create: `src/app/hooks/useReceiptScanner.ts`
- Create: `src/app/hooks/useReceiptScanner.test.ts`

- [ ] **Step 1: Write failing tests for the three parser functions**

Create `src/app/hooks/useReceiptScanner.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractAmount, extractMerchant, extractDate } from './useReceiptScanner';

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/hooks/useReceiptScanner.test.ts
```

Expected: FAIL — `extractAmount`, `extractMerchant`, `extractDate` not found.

- [ ] **Step 3: Create the hook with exported parser functions**

Create `src/app/hooks/useReceiptScanner.ts`:

```ts
import { useState } from 'react';

export interface ReceiptData {
  amount: number | null;
  merchant: string | null;
  date: string | null; // ISO "YYYY-MM-DD"
  confidence: number; // 0–100 from Tesseract
  rawText: string;
}

export type ReceiptScanError = 'low_confidence' | 'ocr_error';

export function extractAmount(text: string): number | null {
  const keywordPattern =
    /(?:итого|total|к оплате|сумма)[^\d]*(\d[\d\s]*[.,]\d{2}|\d+)/i;
  const keywordMatch = text.match(keywordPattern);
  if (keywordMatch) {
    const val = parseFloat(
      keywordMatch[1].replace(/\s/g, '').replace(',', '.')
    );
    if (!isNaN(val)) return val;
  }
  const allNumbers = [...text.matchAll(/\d[\d\s]*[.,]\d{2}|\d{2,}/g)]
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
      const worker = await createWorker(['rus', 'eng']);
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
    } catch {
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/hooks/useReceiptScanner.test.ts
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/hooks/useReceiptScanner.ts src/app/hooks/useReceiptScanner.test.ts
git commit -m "feat: add receipt OCR hook with parser utilities"
```

---

## Task 3: Create ReceiptScannerModal component

**Files:**
- Create: `src/app/components/ReceiptScannerModal.tsx`
- Create: `src/app/components/ReceiptScannerModal.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `src/app/components/ReceiptScannerModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import type { ReceiptData, ReceiptScanError } from '../hooks/useReceiptScanner';

const mockFile = new File([''], 'receipt.jpg', { type: 'image/jpeg' });
const mockResult: ReceiptData = {
  amount: 450,
  merchant: 'Пятёрочка',
  date: '2026-04-22',
  confidence: 85,
  rawText: 'Пятёрочка\nИТОГО 450.00',
};

describe('ReceiptScannerModal', () => {
  it('shows spinner while loading', () => {
    render(
      <ReceiptScannerModal
        file={mockFile}
        result={null}
        isLoading={true}
        error={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Распознаю чек...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /использовать/i })).toBeNull();
  });

  it('shows editable fields with parsed values on success', () => {
    render(
      <ReceiptScannerModal
        file={mockFile}
        result={mockResult}
        isLoading={false}
        error={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('450')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Пятёрочка')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-04-22')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /использовать/i })).toBeInTheDocument();
  });

  it('shows low confidence warning when error is low_confidence', () => {
    render(
      <ReceiptScannerModal
        file={mockFile}
        result={mockResult}
        isLoading={false}
        error={'low_confidence' as ReceiptScanError}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/низкой точностью/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /использовать/i })).toBeInTheDocument();
  });

  it('calls onConfirm with edited data when user changes amount', () => {
    const onConfirm = vi.fn();
    render(
      <ReceiptScannerModal
        file={mockFile}
        result={mockResult}
        isLoading={false}
        error={null}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    );
    const amountInput = screen.getByDisplayValue('450');
    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /использовать/i }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 500 })
    );
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(
      <ReceiptScannerModal
        file={mockFile}
        result={mockResult}
        isLoading={false}
        error={null}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /отмена/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/components/ReceiptScannerModal.test.tsx
```

Expected: FAIL — `ReceiptScannerModal` not found.

- [ ] **Step 3: Create the modal component**

Create `src/app/components/ReceiptScannerModal.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { ReceiptData, ReceiptScanError } from '../hooks/useReceiptScanner';

interface Props {
  file: File | null;
  result: ReceiptData | null;
  isLoading: boolean;
  error: ReceiptScanError | null;
  onConfirm: (data: ReceiptData) => void;
  onClose: () => void;
}

export function ReceiptScannerModal({ file, result, isLoading, error, onConfirm, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const previewUrl = file ? URL.createObjectURL(file) : null;

  useEffect(() => {
    if (result) {
      setAmount(result.amount !== null ? String(result.amount) : '');
      setMerchant(result.merchant ?? '');
      setDate(result.date ?? '');
    }
  }, [result]);

  const handleConfirm = () => {
    if (!result) return;
    onConfirm({
      ...result,
      amount: amount ? parseFloat(amount) : null,
      merchant: merchant || null,
      date: date || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="px-4 py-4 flex items-center justify-between border-b border-border bg-card">
        <h2 className="text-lg font-bold">Сканер чека</h2>
        <button
          aria-label="Закрыть сканер"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {previewUrl && (
          <div className="rounded-xl overflow-hidden bg-muted max-h-48 flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Фото чека"
              className="max-h-48 object-contain w-full"
            />
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Распознаю чек...</p>
          </div>
        )}

        {!isLoading && result && (
          <>
            {error === 'low_confidence' && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl text-yellow-800 dark:text-yellow-200 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Распознано с низкой точностью, проверь данные
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-muted-foreground">Сумма</label>
                <input
                  type="tel"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="px-4 py-3 bg-muted rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-muted-foreground">Магазин</label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Название магазина"
                  className="px-4 py-3 bg-muted rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-muted-foreground">Дата</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-4 py-3 bg-muted rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                />
              </div>
            </div>
          </>
        )}

        {!isLoading && error === 'ocr_error' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-muted-foreground">Не удалось распознать чек. Попробуй ещё раз.</p>
          </div>
        )}
      </div>

      {!isLoading && result && (
        <div className="px-4 py-4 bg-card border-t border-border pb-[calc(1rem+env(safe-area-inset-bottom))] flex gap-3">
          <button
            onClick={onClose}
            aria-label="Отмена"
            className="flex-1 py-4 bg-muted rounded-xl font-semibold"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            aria-label="Использовать"
            className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold"
          >
            Использовать
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/components/ReceiptScannerModal.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/ReceiptScannerModal.tsx src/app/components/ReceiptScannerModal.test.tsx
git commit -m "feat: add ReceiptScannerModal component"
```

---

## Task 4: Integrate scanner into AddTransaction

**Files:**
- Modify: `src/app/screens/AddTransaction.tsx`

- [ ] **Step 1: Add imports and state**

At the top of `AddTransaction.tsx`, add the `Camera` icon and the new imports:

```ts
// Change this line:
import { X, Calendar, MessageSquare, Mic, MicOff, Sparkles, Wallet } from 'lucide-react';
// To:
import { X, Calendar, MessageSquare, Mic, MicOff, Sparkles, Wallet, Camera } from 'lucide-react';

// Add after the existing imports:
import { useReceiptScanner } from '../hooks/useReceiptScanner';
import type { ReceiptData } from '../hooks/useReceiptScanner';
import { ReceiptScannerModal } from '../components/ReceiptScannerModal';
// Note: parseDateInputValue is already imported from '../utils/formatCurrency' — no change needed there
```

- [ ] **Step 2: Add scanner hook and file state inside the component**

Inside `AddTransaction` component body, after the existing hook calls (around line 35):

```ts
const scanner = useReceiptScanner();
const [receiptFile, setReceiptFile] = useState<File | null>(null);
const [showReceiptModal, setShowReceiptModal] = useState(false);
```

- [ ] **Step 3: Add the handler for file selection and confirm**

Inside the component, after `handleSave`:

```ts
const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setReceiptFile(file);
  setShowReceiptModal(true);
  scanner.scan(file);
  // Reset input so the same file can be selected again
  e.target.value = '';
};

const handleReceiptConfirm = (data: ReceiptData) => {
  if (data.amount !== null) setAmount(String(data.amount));
  if (data.merchant) setComment(data.merchant);
  if (data.date) setSelectedDate(parseDateInputValue(data.date));
  setShowReceiptModal(false);
  scanner.reset();
  setReceiptFile(null);
};

const handleReceiptClose = () => {
  setShowReceiptModal(false);
  scanner.reset();
  setReceiptFile(null);
};
```

- [ ] **Step 4: Add Camera button and hidden file input to the JSX**

In the JSX, find the quick input icons section (around line 162, the `div` with `className="absolute right-3 ..."`). Add the Camera button and hidden file input alongside the existing Sparkles and Mic buttons:

```tsx
<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
  {/* Camera button — new */}
  <label aria-label="Сканировать чек" className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
    <Camera className="w-5 h-5" />
    <input
      type="file"
      accept="image/*"
      capture="environment"
      className="sr-only"
      onChange={handleReceiptFile}
    />
  </label>
  {/* Existing Sparkles button */}
  <button
    onClick={() => processText(quickInput)}
    aria-label="Распознать быстрый ввод"
    disabled={isProcessingQuickInput || !quickInput.trim()}
    className="text-violet-600 hover:text-violet-700 disabled:text-muted-foreground transition-colors"
    title="Распознать"
  >
    <Sparkles className="w-5 h-5" />
  </button>
  {/* Existing Mic button — unchanged */}
  {speech.supported && (
    <button
      type="button"
      aria-label={speech.state === 'listening' ? 'Остановить запись' : 'Голосовой ввод'}
      onClick={() => speech.start((transcript) => {
        setQuickInput(transcript);
        processText(transcript);
      })}
      className={`transition-colors ${
        speech.state === 'listening'
          ? 'text-red-500 animate-pulse'
          : speech.state === 'error'
          ? 'text-amber-500'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {speech.state === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  )}
</div>
```

- [ ] **Step 5: Add the modal to the JSX**

At the very end of the returned JSX, just before the closing `</div>` of the root element:

```tsx
{showReceiptModal && (
  <ReceiptScannerModal
    file={receiptFile}
    result={scanner.result}
    isLoading={scanner.isLoading}
    error={scanner.error}
    onConfirm={handleReceiptConfirm}
    onClose={handleReceiptClose}
  />
)}
```

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all existing tests PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/app/screens/AddTransaction.tsx
git commit -m "feat: add receipt scanner camera button to AddTransaction"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open the app and navigate to Add Transaction**

Open `http://localhost:5173` and tap the `+` button.

- [ ] **Step 3: Verify Camera icon is visible**

The quick input bar should show three icons on the right: Camera, Sparkles, Mic.

- [ ] **Step 4: Test on desktop with a receipt image**

Click the Camera icon → file picker opens → select a receipt photo → `ReceiptScannerModal` appears with a spinner, then shows extracted fields.

- [ ] **Step 5: Confirm and verify form fills**

Click "Использовать" → modal closes → amount, comment (merchant), and date fields in the form are filled with extracted values.

- [ ] **Step 6: Test low-confidence path**

Select a blurry or low-quality image → verify the yellow warning banner appears but the modal still shows fields and allows confirmation.

- [ ] **Step 7: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: zero warnings, clean build.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: receipt scanner — offline OCR for AddTransaction"
```

---

## Known Limitation

On first use of the scanner, Tesseract.js downloads `~12MB` of language data for `rus` + `eng` from its CDN. After the first download, Workbox (the PWA service worker) caches these assets and subsequent uses work fully offline. This means the very first scan requires a network connection.

---

## Implementation Status: ✅ Завершено

План реализован полностью. Дополнительно к описанному добавлены:
- QR-декодирование фискальных чеков (BarcodeDetector API + jsQR fallback) — `useReceiptScanner.ts`
- AI-распознавание чеков через Gemini 2.5 Flash и Claude Vision — `src/lib/geminiReceiptParser.ts`, `src/lib/claudeReceiptParser.ts`
- Предобработка изображений для улучшения точности OCR — `src/app/utils/imagePreprocess.ts`
