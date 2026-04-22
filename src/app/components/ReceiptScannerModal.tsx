import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ReceiptData, ReceiptScanError } from '../hooks/useReceiptScanner';

interface ReceiptScannerModalProps {
  file: File | null;
  result: ReceiptData | null;
  isLoading: boolean;
  error: ReceiptScanError | null;
  errorMessage?: string | null;
  onConfirm: (data: ReceiptData) => void;
  onClose: () => void;
}

export function ReceiptScannerModal({
  file,
  result,
  isLoading,
  error,
  errorMessage,
  onConfirm,
  onClose,
}: ReceiptScannerModalProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!result) return;

    setAmount(result.amount !== null ? String(result.amount) : '');
    setMerchant(result.merchant ?? '');
    setDate(result.date ?? '');
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
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <h2 className="text-lg font-bold">Сканер чека</h2>
        <button
          type="button"
          aria-label="Закрыть сканер"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {previewUrl && (
            <div className="max-h-48 overflow-hidden rounded-xl bg-muted">
              <img src={previewUrl} alt="Фото чека" className="h-full max-h-48 w-full object-contain" />
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
              <p className="text-muted-foreground">Распознаю чек...</p>
            </div>
          )}

          {!isLoading && error === 'ocr_error' && !result && (
            <div className="rounded-xl border border-border bg-card p-4 text-center text-muted-foreground">
              <p>Не удалось распознать чек. Попробуй ещё раз.</p>
              {errorMessage && (
                <p className="mt-2 break-all text-left text-xs text-muted-foreground/80">
                  {errorMessage}
                </p>
              )}
            </div>
          )}

          {!isLoading && result && (
            <>
              {error === 'low_confidence' && (
                <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
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
                    className="rounded-xl bg-muted px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-muted-foreground">Магазин</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Название магазина"
                    className="rounded-xl bg-muted px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-muted-foreground">Дата</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl bg-muted px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!isLoading && result && (
        <div className="flex gap-3 border-t border-border bg-card px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Отмена"
            className="flex-1 rounded-xl bg-muted py-4 font-semibold"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            aria-label="Использовать"
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 py-4 font-semibold text-white"
          >
            Использовать
          </button>
        </div>
      )}
    </div>
  );
}
