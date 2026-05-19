import { useEffect, useState } from 'react';
import { AlertTriangle, X, Sparkles, ScanText, Tag, Package } from 'lucide-react';
import type { ReceiptData, ReceiptScanError } from '../hooks/useReceiptScanner';

interface ReceiptScannerModalProps {
  file: File | null;
  result: ReceiptData | null;
  isLoading: boolean;
  error: ReceiptScanError | null;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onConfirm: (data: ReceiptData) => void;
  onClose: () => void;
}

export function ReceiptScannerModal({
  file,
  result,
  isLoading,
  error,
  errorMessage,
  statusMessage,
  onConfirm,
  onClose,
}: ReceiptScannerModalProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [showItems, setShowItems] = useState(false);
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
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
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
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
              <p className="text-muted-foreground">{statusMessage ?? 'Распознаю чек...'}</p>
            </div>
          )}

          {!isLoading && error === 'ocr_error' && !result && (
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-muted-foreground">Не удалось распознать чек. Попробуй ещё раз.</p>
              {errorMessage && (
                <p className="mt-2 break-all text-left text-xs text-muted-foreground/60">
                  {errorMessage}
                </p>
              )}
            </div>
          )}

          {!isLoading && result && (
            <>
              {/* Engine badge */}
              <div className="flex items-center justify-between">
                {result.engine === 'qr' ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                    <ScanText className="h-3 w-3" />
                    QR-код
                  </div>
                ) : result.engine === 'gemini' ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Sparkles className="h-3 w-3" />
                    Gemini AI
                  </div>
                ) : result.engine === 'claude' ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-primary/15 dark:text-violet-300">
                    <Sparkles className="h-3 w-3" />
                    Claude AI
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    <ScanText className="h-3 w-3" />
                    OCR
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {result.confidence}% уверенность
                </span>
              </div>

              {error === 'low_confidence' && (
                <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Распознано с низкой точностью, проверь данные
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-muted-foreground">Сумма</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="flex-1 rounded-xl bg-muted px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    {result.currency && (
                      <div className="flex items-center rounded-xl bg-muted px-4 text-sm font-medium text-muted-foreground">
                        {result.currency}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-muted-foreground">Магазин</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Название магазина"
                    className="rounded-xl bg-muted px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-muted-foreground">Дата</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl bg-muted px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {/* Category hint */}
                {result.categoryHint && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
                    <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Категория:</span>
                    <span className="font-medium">{result.categoryHint}</span>
                  </div>
                )}

                {/* Items list (collapsible) */}
                {result.items && result.items.length > 0 && (
                  <div className="rounded-xl bg-muted overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowItems((v) => !v)}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm"
                    >
                      <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-left font-medium">
                        Позиции ({result.items.length})
                      </span>
                      <span className="text-muted-foreground">{showItems ? '▲' : '▼'}</span>
                    </button>
                    {showItems && (
                      <ul className="border-t border-border px-4 pb-3 pt-2 space-y-1">
                        {result.items.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
            className="btn-secondary flex-1 text-center"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            aria-label="Использовать"
            className="btn-primary flex-1 text-center"
          >
            Использовать
          </button>
        </div>
      )}
    </div>
  );
}
