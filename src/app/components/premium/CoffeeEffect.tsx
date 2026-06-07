import type { CoffeeEffect as CoffeeEffectData } from '../../../db/premium';

interface CoffeeEffectProps {
  effects: CoffeeEffectData[];
  avgMonthlyExpenses: number;
}

function formatRu(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}

export const CoffeeEffect = ({ effects, avgMonthlyExpenses }: CoffeeEffectProps) => {
  if (effects.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Недостаточно регулярных трат для анализа
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-1">Эффект малых привычек</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Маленькие регулярные траты, умноженные на год
      </p>
      <div className="space-y-3">
        {effects.map((e, i) => {
          const monthsEquivalent = avgMonthlyExpenses > 0
            ? e.yearlyTotal / avgMonthlyExpenses
            : 0;
          return (
            <div key={i} className="p-3 bg-muted/60 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{e.categoryName}</span>
                <span className="text-xs text-muted-foreground">{formatRu(e.dailyAvg)} ₽/день</span>
              </div>
              <div className="flex gap-4 text-xs">
                <div>
                  <div className="text-muted-foreground">В месяц</div>
                  <div className="font-semibold">{formatRu(e.monthlyAvg)} ₽</div>
                </div>
                <div>
                  <div className="text-muted-foreground">В год</div>
                  <div className="font-semibold text-amber-500">{formatRu(e.yearlyTotal)} ₽</div>
                </div>
                {monthsEquivalent >= 0.5 && (
                  <div>
                    <div className="text-muted-foreground">= месяцев расходов</div>
                    <div className="font-semibold text-orange-500">
                      {monthsEquivalent.toFixed(1)} мес.
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
