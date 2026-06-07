import type { TransactionSummary } from '../../../db/analytics';

interface TopTransactionsProps {
  transactions: TransactionSummary[];
}

export const TopTransactions = ({ transactions }: TopTransactionsProps) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Нет транзакций за выбранный период
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-3">Крупнейшие траты</h3>
      <div className="space-y-2">
        {transactions.map((t, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.categoryName}</div>
              {t.comment && (
                <div className="text-xs text-muted-foreground truncate">{t.comment}</div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-semibold text-red-500">
                −{Math.round(t.amount).toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
