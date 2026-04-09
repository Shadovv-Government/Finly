import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChevronDown, Calendar } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useAnalytics, getPeriodRange, PeriodType } from '../hooks/useAnalytics';
import { useTransactions } from '../hooks/useTransactions';

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
  const sameMonth = s.getMonth() === e.getMonth();
  const sameYear = s.getFullYear() === e.getFullYear();
  const dayOpts: Intl.DateTimeFormatOptions = { day: 'numeric' };
  const monthOpts: Intl.DateTimeFormatOptions = { month: 'long' };
  const yearOpts: Intl.DateTimeFormatOptions = { year: 'numeric' };
  const parts = [
    s.toLocaleDateString('ru-RU', dayOpts),
    '—',
    e.toLocaleDateString('ru-RU', { ...dayOpts, ...monthOpts }),
    !sameYear ? e.getFullYear() : '',
  ].filter(Boolean);
  return parts.join(' ').trim();
}

export const Analytics = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState<number>(
    getPeriodRange('month').start
  );
  const [customEnd, setCustomEnd] = useState<number>(
    getPeriodRange('month').end
  );
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Analytics data
  const {
    balance,
    expensesByCategory,
    spendingTrend,
    incomeTrend,
    loading,
    refresh,
  } = useAnalytics({
    period,
    startDate: period === 'custom' ? customStart : undefined,
    endDate: period === 'custom' ? customEnd : undefined,
  });

  // For chart we also need raw transactions to build daily trend
  const periodRange =
    period === 'custom'
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

  // ── Bar chart: aggregate by weeks ──
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

  // ── Pie chart: expense structure ──
  const pieData = useMemo(() => {
    return expensesByCategory
      .map(c => ({
        name: c.categoryName,
        value: c.amount,
        color: c.color,
        percentage: expense > 0 ? (c.amount / expense) * 100 : 0,
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expensesByCategory, expense]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPeriodPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Period label
  const periodLabel =
    period === 'custom'
      ? formatDateRange(customStart, customEnd)
      : (() => {
          const r = getPeriodRange(period);
          return formatDateRange(r.start, r.end);
        })();

  // Custom period date inputs
  const dateFromStr = new Date(customStart).toISOString().split('T')[0];
  const dateToStr = new Date(customEnd).toISOString().split('T')[0];

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border sticky top-0 z-10">
        <h1 className="text-xl font-bold mb-4">Аналитика</h1>

        {/* Period Selector */}
        <button
          onClick={() => setIsPeriodPickerOpen(!isPeriodPickerOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{periodLabel}</span>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Period picker dropdown */}
        {isPeriodPickerOpen && (
          <div
            ref={pickerRef}
            className="mt-3 p-4 bg-muted rounded-xl space-y-3"
          >
            {/* Quick periods */}
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as PeriodType[]).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    setIsPeriodPickerOpen(false);
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    period === p && period !== 'custom'
                      ? 'bg-violet-600 text-white'
                      : 'bg-card border border-border'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Custom period */}
            <div>
              <label className="text-sm font-medium mb-2 block">Свой период</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFromStr}
                  onChange={e => {
                    setCustomStart(new Date(e.target.value).getTime());
                    setPeriod('custom');
                  }}
                  className="flex-1 px-3 py-2 bg-card rounded-lg border border-border text-sm outline-none"
                />
                <span className="text-muted-foreground self-center">—</span>
                <input
                  type="date"
                  value={dateToStr}
                  onChange={e => {
                    setCustomEnd(new Date(e.target.value).getTime() + 24 * 60 * 60 * 1000 - 1);
                    setPeriod('custom');
                  }}
                  className="flex-1 px-3 py-2 bg-card rounded-lg border border-border text-sm outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-muted rounded-2xl p-4 h-20 animate-pulse" />
            ))}
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
            <div
              className={`bg-gradient-to-br text-white rounded-2xl p-4 ${
                balanceAmount >= 0
                  ? 'from-violet-600 to-indigo-700'
                  : 'from-gray-600 to-gray-700'
              }`}
            >
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
          {weeklyData.length > 0 && (weeklyData.some(w => w.income > 0 || w.expense > 0)) ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData}>
                  <XAxis
                    dataKey="week"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={12}
                    tickFormatter={formatShort}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString('ru-RU')} ₽`,
                      name === 'income' ? 'Доходы' : 'Расходы',
                    ]}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar
                    dataKey="income"
                    name="Доходы"
                    fill="#22c55e"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="Расходы"
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                  />
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
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {pieData.slice(0, 5).map(category => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {category.value.toLocaleString('ru-RU')} ₽
                    </span>
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
                    <span className="text-lg font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {category.value.toLocaleString('ru-RU')} ₽
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${category.percentage}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-8 border border-border text-center text-muted-foreground">
            Нет данных
          </div>
        )}
      </div>
    </div>
  );
};
