import { useState, useMemo } from 'react';
import type { CategoryAnalytics } from '../../../db/analytics';

interface WhatIfSimulatorProps {
  categories: CategoryAnalytics[];
  totalIncome: number;
  totalExpenses: number;
}

export const WhatIfSimulator = ({ categories, totalIncome, totalExpenses }: WhatIfSimulatorProps) => {
  const topCategories = categories.slice(0, 4);
  const [reductions, setReductions] = useState<Record<string, number>>(
    Object.fromEntries(topCategories.map(c => [c.categoryId, 0]))
  );

  const totalMonthlySaving = useMemo(() => {
    return topCategories.reduce((sum, c) => {
      const reduction = reductions[c.categoryId] || 0;
      return sum + c.amount * (reduction / 100);
    }, 0);
  }, [topCategories, reductions]);

  const yearlySaving = totalMonthlySaving * 12;
  const newSavingsRate = totalIncome > 0
    ? ((totalIncome - totalExpenses + totalMonthlySaving) / totalIncome) * 100
    : 0;
  const currentSavingsRate = totalIncome > 0
    ? ((totalIncome - totalExpenses) / totalIncome) * 100
    : 0;

  if (topCategories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Недостаточно данных для симулятора
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-4">Что если сократить расходы?</h3>

      <div className="space-y-4 mb-6">
        {topCategories.map(cat => (
          <div key={cat.categoryId}>
            <div className="flex justify-between text-sm mb-1">
              <span>{cat.categoryName}</span>
              <span className="font-medium">
                {Math.round(cat.amount).toLocaleString('ru-RU')} ₽ →{' '}
                {Math.round(cat.amount * (1 - (reductions[cat.categoryId] || 0) / 100)).toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={reductions[cat.categoryId] || 0}
              onChange={e => setReductions(prev => ({ ...prev, [cat.categoryId]: Number(e.target.value) }))}
              className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
            />
            <div className="text-xs text-muted-foreground text-right">
              −{reductions[cat.categoryId] || 0}%
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 bg-muted rounded-xl">
        <div>
          <div className="text-xs text-muted-foreground">Экономия в месяц</div>
          <div className="text-lg font-bold text-emerald-500">
            +{Math.round(totalMonthlySaving).toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Экономия в год</div>
          <div className="text-lg font-bold text-emerald-500">
            +{Math.round(yearlySaving).toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-xs text-muted-foreground">Норма сбережений</div>
          <div className="text-lg font-bold">
            <span className={currentSavingsRate < newSavingsRate ? 'text-primary' : 'text-muted-foreground'}>
              {currentSavingsRate.toFixed(1)}% → {newSavingsRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
