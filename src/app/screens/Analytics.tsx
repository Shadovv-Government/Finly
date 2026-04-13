import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAnalytics, getPeriodRange, PeriodType } from '../hooks/useAnalytics';
import { useTransactions } from '../hooks/useTransactions';
import { BottomSheet } from '../components/BottomSheet';

const PERIOD_LABELS: Record<PeriodType, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  custom: 'Период',
};

function formatShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}K`;
  return value.toFixed(0);
}

function formatDateRange(start: number, end: number): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sameYear = s.getFullYear() === e.getFullYear();

  if (sameMonth) {
    return `${s.getDate()} — ${e.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${e.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric',
  })}`;
}

export const Analytics = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState<number>(getPeriodRange('month').start);
  const [customEnd, setCustomEnd] = useState<number>(getPeriodRange('month').end - 1);
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);

  const { balance, expensesByCategory, loading } = useAnalytics({
    period,
    startDate: period === 'custom' ? customStart : undefined,
    endDate: period === 'custom' ? customEnd : undefined,
  });

  const periodRange = period === 'custom'
    ? { start: customStart, end: customEnd }
    : getPeriodRange(period);

  const { transactions } = useTransactions({
    period,
    startDate: periodRange.start,
    endDate: periodRange.end,
  });

  const income = balance?.income || 0;
  const expense = balance?.expenses || 0;
  const balanceAmount = income - expense;

  const weeklyData = useMemo(() => {
    const totalDays = Math.max(1, Math.ceil((periodRange.end - periodRange.start) / (24 * 60 * 60 * 1000)));
    const weeksCount = Math.min(4, Math.max(1, Math.ceil(totalDays / 7)));
    const weeks: { week: string; income: number; expense: number }[] = Array.from(
      { length: weeksCount },
      (_, i) => ({ week: `Нед ${i + 1}`, income: 0, expense: 0 })
    );
    const startTs = periodRange.start;
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    transactions.forEach(t => {
      const idx = Math.min(weeksCount - 1, Math.floor((t.date - startTs) / weekMs));
      if (idx >= 0) {
        if (t.type === 'income') weeks[idx].income += t.amount;
        else weeks[idx].expense += t.amount;
      }
    });
    return weeks;
  }, [transactions, periodRange]);

  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null);

  const pieData = useMemo(() => {
    return expensesByCategory
      .map(c => ({ name: c.categoryName, value: c.amount, color: c.color, percentage: expense > 0 ? (c.amount / expense) * 100 : 0 }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expensesByCategory, expense]);

  const periodLabel = period === 'custom'
    ? formatDateRange(customStart, customEnd)
    : (() => { const r = getPeriodRange(period); return formatDateRange(r.start, r.end - 1); })();

  const toLocalDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border sticky top-0 z-10">
        <h1 className="text-xl font-bold mb-4">Аналитика</h1>

        {/* Period Selector Button */}
        <button
          onClick={() => setIsPeriodPickerOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{periodLabel}</span>
          </div>
          <span className="text-xs text-muted-foreground">Изменить</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-muted rounded-2xl p-4 h-20 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-4">
              <p className="text-xs opacity-90 mb-1">Доходы</p>
              <p className="text-lg font-bold">+{formatShort(income)}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-2xl p-4">
              <p className="text-xs opacity-90 mb-1">Расходы</p>
              <p className="text-lg font-bold">−{formatShort(expense)}</p>
            </div>
            <div className={`bg-gradient-to-br text-white rounded-2xl p-4 ${balanceAmount >= 0 ? 'from-violet-600 to-indigo-700' : 'from-gray-600 to-gray-700'}`}>
              <p className="text-xs opacity-90 mb-1">Баланс</p>
              <p className="text-lg font-bold">
                {balanceAmount >= 0 ? '+' : '−'}{formatShort(Math.abs(balanceAmount))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="px-4 py-4">
        <h2 className="font-bold mb-4">Доходы vs Расходы</h2>
        <div className="bg-card rounded-2xl p-4 border border-border">
          {weeklyData.length > 0 && weeklyData.some(w => w.income > 0 || w.expense > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="week" stroke="currentColor" className="text-muted-foreground" fontSize={12} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={12} tickFormatter={formatShort} />
                  <Bar dataKey="income" name="Доходы" fill="#22c55e" radius={[8, 8, 0, 0]} cursor="pointer" onClick={(_, index) => setSelectedWeekIdx(index)} />
                  <Bar dataKey="expense" name="Расходы" fill="#ef4444" radius={[8, 8, 0, 0]} cursor="pointer" onClick={(_, index) => setSelectedWeekIdx(index)} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Доходы</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Расходы</span>
                </div>
              </div>

              {selectedWeekIdx !== null && weeklyData[selectedWeekIdx] && (
                <div className="mt-4 p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">{weeklyData[selectedWeekIdx].week}</span>
                    <button onClick={() => setSelectedWeekIdx(null)} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Доходы</p>
                      <p className="text-base font-bold text-green-600">+{weeklyData[selectedWeekIdx].income.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Расходы</p>
                      <p className="text-base font-bold text-red-600">−{weeklyData[selectedWeekIdx].expense.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Баланс</p>
                      <p className={`text-base font-bold ${weeklyData[selectedWeekIdx].income - weeklyData[selectedWeekIdx].expense >= 0 ? 'text-violet-600' : 'text-gray-500'}`}>
                        {weeklyData[selectedWeekIdx].income - weeklyData[selectedWeekIdx].expense >= 0 ? '+' : '−'}
                        {Math.abs(weeklyData[selectedWeekIdx].income - weeklyData[selectedWeekIdx].expense).toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">Нет данных за период</p>
          )}
        </div>
      </div>

      {/* Pie Chart */}
      <div className="px-4 py-4">
        <h2 className="font-bold mb-4">Структура расходов</h2>
        <div className="bg-card rounded-2xl p-4 border border-border">
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {pieData.slice(0, 5).map(category => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{category.value.toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">Нет данных</p>
          )}
        </div>
      </div>

      {/* Top Categories */}
      <div className="px-4 pb-4">
        <h2 className="font-bold mb-4">Топ категорий</h2>
        {pieData.length > 0 ? (
          <div className="bg-card rounded-2xl p-4 border border-border space-y-4">
            {pieData.slice(0, 5).map((category, index) => (
              <div key={category.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{category.value.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-xs text-muted-foreground">{category.percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${category.percentage}%`, backgroundColor: category.color }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-8 border border-border text-center text-muted-foreground">Нет данных</div>
        )}
      </div>

      {/* Period Picker BottomSheet */}
      <BottomSheet
        isOpen={isPeriodPickerOpen}
        onClose={() => setIsPeriodPickerOpen(false)}
        title="Период"
        side="top"
      >
        <div className="flex flex-col pb-4">
          {/* Быстрый выбор */}
          <div className="px-4 py-4">
            <label className="text-sm font-medium mb-3 block">Быстрый выбор</label>
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              {(['day', 'week', 'month'] as PeriodType[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setIsPeriodPickerOpen(false); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    period === p && period !== 'custom'
                      ? 'bg-white dark:bg-card shadow-sm text-violet-600 dark:text-violet-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Свой период */}
          <div className="px-4 py-4">
            <label className="text-sm font-medium mb-3 block">Свой период</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-xl">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="date"
                  value={toLocalDate(customStart)}
                  onChange={e => { setCustomStart(new Date(e.target.value).getTime()); setPeriod('custom'); }}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              <span className="text-muted-foreground self-center">—</span>
              <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-xl">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="date"
                  value={toLocalDate(customEnd)}
                  onChange={e => {
                    const d = new Date(e.target.value);
                    setCustomEnd(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime());
                    setPeriod('custom');
                  }}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Применить свой период */}
          {period === 'custom' && (
            <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)]">
              <button
                onClick={() => setIsPeriodPickerOpen(false)}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold"
              >
                Применить
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
