# Receipt Scanner — Design Spec

**Date:** 2026-04-22  
**Status:** ✅ Реализовано. Дополнительно к OCR добавлено QR-декодирование (BarcodeDetector API + jsQR). AI-распознавание (Gemini/Claude Vision) было удалено. Итоговая реализация: `useReceiptScanner.ts`, `ReceiptScannerModal.tsx`, `imagePreprocess.ts`.

## Overview

Add an offline receipt scanner to the AddTransaction form. The user taps a camera icon, takes a photo (or picks from gallery), and the app uses Tesseract.js (client-side OCR) to extract the total amount, merchant name, and date — then pre-fills the transaction form. No backend, no external APIs.

## Goals

- Extract: total amount, merchant name, date from a receipt photo
- Pre-fill AddTransaction form fields automatically
- Work fully offline
- Not increase initial bundle size (lazy-load Tesseract.js)

## Out of Scope

- Line-item extraction (individual products)
- Multi-receipt batch scanning
- Receipt image storage/history
- Auto-assigning categories (existing ML model handles this)

## Architecture

### New Files

```
src/app/hooks/useReceiptScanner.ts
src/app/components/ReceiptScannerModal.tsx
```

### Modified Files

```
src/app/screens/AddTransaction.tsx   — camera icon + modal integration
```

### No DB Changes

The scanner is a UI-layer feature only. No new Dexie tables, no schema migration, no changes to `db/types.ts`.

## Data Flow

```
User taps Camera icon in AddTransaction
  → <input type="file" accept="image/*" capture="environment"> opens
  → File passed to useReceiptScanner.scan(file)
  → Dynamic import of tesseract.js (lazy, first use only)
  → Tesseract recognises text from image
  → Regex extractors parse: amount / merchant / date
  → ReceiptScannerModal opens with photo preview + editable fields
  → User edits if needed → confirms
  → AddTransaction fields: amount, comment (merchant), date filled
```

## `useReceiptScanner` Hook

```ts
interface ReceiptData {
  amount: number | null
  merchant: string | null
  date: string | null      // ISO: "YYYY-MM-DD"
  confidence: number       // 0–100 from Tesseract
  rawText: string
}

const { scan, result, isLoading, error, reset } = useReceiptScanner()
// error values: "low_confidence" | "parse_failed" | "ocr_error"
```

### Parsing Logic

| Field    | Strategy |
|----------|----------|
| Amount   | Search for keyword patterns: `ИТОГО`, `TOTAL`, `К ОПЛАТЕ`, `СУММА`; fall back to largest number in document |
| Merchant | First 1–2 non-empty lines of recognised text |
| Date     | Match formats: `DD.MM.YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD` |

**Low confidence handling:** if `confidence < 40` or amount not found → `error: "low_confidence"`. Modal still opens and allows manual correction — scanning never silently fails.

## `ReceiptScannerModal` Component

**Props:** `file: File`, `result: ReceiptData | null`, `isLoading: boolean`, `error: string | null`, `onConfirm: (data: ReceiptData) => void`, `onClose: () => void`

**States:**
1. **Loading** — photo preview + spinner + "Распознаю чек..."
2. **Success** — photo preview + three editable fields (amount / merchant / date) + "Использовать" / "Отмена"
3. **Low confidence** — same as success + yellow warning banner "Распознано с низкой точностью, проверь данные"

All three fields are editable in the modal before confirming.

## AddTransaction Changes

- Add `Camera` (Lucide) icon button next to the amount field
- On tap: trigger hidden `<input type="file" accept="image/*" capture="environment">`  
  → opens camera directly on mobile, file picker on desktop
- On confirm from modal: set `amount`, `comment` (merchant name), `date` in form state
- Category field untouched — user selects manually (ML auto-suggest already exists)

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Tesseract fails to load | Toast error, modal closes |
| Image unreadable | `error: "ocr_error"`, modal shows error state with retry |
| Confidence < 40 | Yellow warning, user can still confirm with manual edits |
| Amount not found | Same as low confidence |

## Testing

- Unit tests for regex parsers in `useReceiptScanner.test.ts` with fixture strings
- Component test for `ReceiptScannerModal` covering loading / success / low-confidence states
- No E2E tests needed (camera access not available in test env)

## Bundle Impact

Tesseract.js core (~30MB wasm) is loaded via dynamic import on first scanner use only. Users who never use the scanner pay zero cost. Subsequent uses in the same session reuse the loaded instance.
