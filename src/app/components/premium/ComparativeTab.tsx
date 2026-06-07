import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import {
  getYoYComparison, getCalendarYearData, getForecastData,
  type YoYResult, type CalendarDay,
} from '../../../db/premium';
import {
  getSpendByDayOfWeek, getLargestTransactions, getAllBudgetsProgress,
  type DayOfWeekSpend, type TransactionSummary, type BudgetProgress,
} from '../../../db/analytics';
import { decompose } from '../../../lib/seasonality';
import { CalendarHeatmap } from './CalendarHeatmap';
import { TrendDecomposition } from './TrendDecomposition';
import { DayOfWeekChart } from './DayOfWeekChart';
import { TopTransactions } from './TopTransactions';
import { BudgetVsActual } from './BudgetVsActual';
import { EmptyState } from '../../components/EmptyState';
import { getPeriodRange, type Period } from '../../../lib/period';

function formatShort(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(0);
}

interface ComparativeTabProps {
  period: Period;
}

export const ComparativeTab = ({ period }: ComparativeTabProps) => {
  const [yoy, setYoY] = useState<YoYResult | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [decomposition, setDecomposition] = useState<ReturnType<typeof decompose> | null>(null);
  const [dowData, setDowData] = useState<DayOfWeekSpend[]>([]);
  const [topTx, setTopTx] = useState<TransactionSummary[]>([]);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { start, end } = getPeriodRange(period);
      const year = new Date().getFullYear();

      const [yoyData, calData, histData, dow, top, budg] = await Promise.all([
        getYoYComparison(),
        getCalendarYearData(year),
        getForecastData(90),
        getSpendByDayOfWeek(start, end),
        getLargestTransactions(10, start, end),
        getAllBudgetsProgress(start, end),
      ]);

      if (cancelled) return;

      setYoY(yoyData);
      setCalendarData(calData);
      setDecomposition(decompose(histData));
      setDowData(dow);
      setTopTx(top);
      setBudgets(budg);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day of Week */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <DayOfWeekChart data={dowData} />
        </div>
      </motion.div>

      {/* YoY */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-3">Год к году</h3>
          {yoy && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Этот месяц</div>
                  <div className="text-lg font-bold">{Math.round(yoy.thisMonth).toLocaleString('ru-RU')} ₽</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Год назад</div>
                  <div className="text-lg font-bold">{Math.round(yoy.lastYearMonth).toLocaleString('ru-RU')} ₽</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Разница</div>
                  <div className={`text-lg font-bold ${yoy.deltaPercent >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {yoy.deltaPercent >= 0 ? '+' : ''}{Math.round(yoy.deltaPercent)}%
                  </div>
                </div>
              </div>
              {yoy.byCategory.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={yoy.byCategory.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 4, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={10} tickFormatter={formatShort} />
                    <YAxis type="category" dataKey="categoryName" fontSize={11} width={90} />
                    <Tooltip
                      formatter={(v: number) => [`${Math.round(v).toLocaleString('ru-RU')} ₽`, '']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="thisMonth" name="Этот месяц" fill="#a855f7" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="lastYearMonth" name="Прошлый год" fill="#d4d4d8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Budget vs Actual */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-premium p-5">
          <BudgetVsActual budgets={budgets} />
        </div>
      </motion.div>

      {/* Calendar Heatmap */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="card-premium p-5">
          <CalendarHeatmap year={new Date().getFullYear()} data={calendarData} />
        </div>
      </motion.div>

      {/* Top Transactions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-premium p-5">
          <TopTransactions transactions={topTx} />
        </div>
      </motion.div>

      {/* Trend Decomposition */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="card-premium p-5">
          {decomposition ? (
            <TrendDecomposition data={decomposition} />
          ) : (
            <EmptyState icon="Activity" title="Нет данных для декомпозиции" description="Нужно минимум 7 дней с транзакциями" />
          )}
        </div>
      </motion.div>
    </div>
  );
};
