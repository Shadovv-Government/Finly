import type { BudgetProgress } from '../../../db/analytics';

interface BudgetVsActualProps {
  budgets: BudgetProgress[];
}

export const BudgetVsActual = ({ budgets }: BudgetVsActualProps) => {
  if (budgets.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Нет активных бюджетов — создайте их в разделе «Бюджеты»
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-3">Бюджет vs Факт</h3>
      <div className="space-y-3">
        {budgets.map((b, i) => {
          const pct = Math.min(b.percent, 100);
          const isOver = b.isOverBudget;
          return (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium truncate max-w-[55%]">{b.categoryName}</span>
                <span className={`font-semibold ${isOver ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {Math.round(b.spent).toLocaleString('ru-RU')} / {Math.round(b.limit).toLocaleString('ru-RU')} ₽
                  {isOver && ' ⚠️'}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                <span>{Math.round(b.percent)}%</span>
                <span>
                  {isOver
                    ? `Перерасход ${Math.round(b.spent - b.limit).toLocaleString('ru-RU')} ₽`
                    : `Осталось ${Math.round(b.limit - b.spent).toLocaleString('ru-RU')} ₽`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
