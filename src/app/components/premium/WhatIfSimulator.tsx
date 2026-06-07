import { useState, useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import type { CategoryAnalytics } from '../../../db/analytics';

interface WhatIfSimulatorProps {
  categories: CategoryAnalytics[];
  totalIncome: number;
  totalExpenses: number;
}

const PRESETS = [
  { label: 'Правило 50/30/20', key: '5030' },
  { label: 'Режим экономии −20%', key: '-20' },
  { label: 'Сброс', key: 'reset' },
] as const;

export const WhatIfSimulator = ({ categories, totalIncome, totalExpenses }: WhatIfSimulatorProps) => {
  const topCategories = categories.slice(0, 4);
  const [reductions, setReductions] = useState<Record<string, number>>(
    Object.fromEntries(topCategories.map(c => [c.categoryId, 0]))
  );

  function applyPreset(key: string) {
    if (key === 'reset') {
      setReductions(Object.fromEntries(topCategories.map(c => [c.categoryId, 0])));
      return;
    }
    if (key === '-20') {
      setReductions(Object.fromEntries(topCategories.map(c => [c.categoryId, 20])));
      return;
    }
    if (key === '5030') {
      // Compute reduction needed to hit 20% savings rate: targetExpenses = 0.8 * income
      if (totalIncome <= 0 || totalExpenses <= 0) return;
      const targetExpenses = 0.8 * totalIncome;
      const rawPct = ((totalExpenses - targetExpenses) / totalExpenses) * 100;
      const pct = Math.max(0, Math.min(100, Math.round(rawPct / 5) * 5));
      setReductions(Object.fromEntries(topCategories.map(c => [c.categoryId, pct])));
    }
  }

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Что если сократить расходы?</h3>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/50 hover:bg-muted active:scale-95 transition-all"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-5 mb-6">
        {topCategories.map(cat => {
          const reduction = reductions[cat.categoryId] || 0;
          const newAmount = Math.round(cat.amount * (1 - reduction / 100));
          return (
            <div key={cat.categoryId}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{cat.categoryName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(cat.amount).toLocaleString('ru-RU')} →{' '}
                  <span className={reduction > 0 ? 'text-emerald-500 font-semibold' : ''}>
                    {newAmount.toLocaleString('ru-RU')} ₽
                  </span>
                </span>
              </div>
              <Slider.Root
                value={[reduction]}
                min={0}
                max={100}
                step={5}
                onValueChange={([val]) =>
                  setReductions(prev => ({ ...prev, [cat.categoryId]: val }))
                }
                className="relative flex items-center w-full h-5 cursor-pointer select-none touch-none"
              >
                <Slider.Track className="relative bg-muted rounded-full h-2 flex-1">
                  <Slider.Range className="absolute bg-primary rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white dark:bg-zinc-100 rounded-full shadow-md border border-border/50 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-transform" />
              </Slider.Root>
              <div className="text-xs text-muted-foreground text-right mt-0.5">
                −{reduction}%
              </div>
            </div>
          );
        })}
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
