import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Line, ComposedChart } from 'recharts';
import { motion } from 'motion/react';
import { getForecastData, getCashFlowForecast, getCoffeeEffects, type CashFlowPoint, type CoffeeEffect as CoffeeEffectData } from '../../../db/premium';
import { getExpensesByCategory, getBalanceByPeriod } from '../../../db/analytics';
import { predictWithConfidence } from '../../../lib/forecasting';
import { WhatIfSimulator } from './WhatIfSimulator';
import { CoffeeEffect } from './CoffeeEffect';
import { EmptyState } from '../../components/EmptyState';
import type { CategoryAnalytics } from '../../../db/analytics';
import { getPeriodRange, type Period } from '../../../lib/period';

interface ForecastChartPoint {
  date: string;
  amount: number;
  upper?: number;
  lower?: number;
  type: 'actual' | 'predicted';
}

interface ForecastState {
  chartData: ForecastChartPoint[];
  confidence: number;
}

function formatShort(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(0);
}

interface PredictiveTabProps {
  period: Period;
}

export const PredictiveTab = ({ period }: PredictiveTabProps) => {
  const [forecast, setForecast] = useState<ForecastState | null>(null);
  const [cashFlow, setCashFlow] = useState<(CashFlowPoint & { label: string })[]>([]);
  const [categories, setCategories] = useState<CategoryAnalytics[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [avgMonthlyExpenses, setAvgMonthlyExpenses] = useState(0);
  const [coffeeEffects, setCoffeeEffects] = useState<CoffeeEffectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { start, end } = getPeriodRange(period);
      const now = Date.now();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

      const [histData, cashFlowData, catData, balanceData, coffeeData, periodBalance] = await Promise.all([
        getForecastData(90),
        getCashFlowForecast(3),
        getExpensesByCategory(monthStart, now),
        getBalanceByPeriod(monthStart, now),
        getCoffeeEffects(start, end),
        getBalanceByPeriod(start, end),
      ]);

      if (cancelled) return;

      const fc = predictWithConfidence(histData, 30);

      const combinedForecast: ForecastChartPoint[] = [
        ...histData.map(d => ({
          date: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
          amount: Math.round(d.amount * 100) / 100,
          type: 'actual' as const,
        })),
        ...fc.points.map(p => ({
          date: new Date(p.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
          amount: Math.round(p.predicted * 100) / 100,
          upper: Math.round(p.upper * 100) / 100,
          lower: Math.round(p.lower * 100) / 100,
          type: 'predicted' as const,
        })),
      ];

      setForecast({ chartData: combinedForecast, confidence: fc.confidence });
      setCashFlow(cashFlowData.map(cf => ({
        ...cf,
        label: new Date(cf.date).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
      })));
      setCategories(catData);
      setTotalIncome(balanceData.income);
      const days = Math.max(1, (end - start) / 86400000);
      setAvgMonthlyExpenses((periodBalance.expenses / days) * 30);
      setCoffeeEffects(coffeeData);

      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ML Forecast */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-1">ML-Прогноз расходов на 30 дней</h3>
          {forecast !== null && (
            <p className="text-xs text-muted-foreground mb-3">
              Точность: {(forecast.confidence * 100).toFixed(0)}% (R²)
              {forecast.confidence < 0.5 && ' — низкая, нужно больше данных'}
            </p>
          )}
          {forecast !== null && forecast.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={forecast.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" fontSize={10} tick={{ fontSize: 10 }} />
                <YAxis fontSize={10} tickFormatter={formatShort} width={40} />
                <Tooltip
                  formatter={(v: number) => [`${Math.round(v).toLocaleString('ru-RU')} ₽`, '']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area dataKey="amount" stroke="#a855f7" fill="url(#gPred)" strokeWidth={2} dot={false} />
                <Line dataKey="upper" stroke="#a855f7" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.45} dot={false} legendType="none" />
                <Line dataKey="lower" stroke="#a855f7" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.45} dot={false} legendType="none" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="ChartLine" title="Нет данных для прогноза" description="Добавьте транзакции за последние 90 дней" />
          )}
        </div>
      </motion.div>

      {/* Cash Flow */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-3">Прогноз баланса на 3 месяца</h3>
          {cashFlow.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={cashFlow} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={formatShort} width={40} />
                <Tooltip
                  formatter={(v: number) => [`${Math.round(v).toLocaleString('ru-RU')} ₽`, '']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="projectedBalance" stroke="#06b6d4" fill="url(#gCF)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="TrendingUp" title="Нет данных для прогноза баланса" description="Добавьте транзакции за несколько месяцев" />
          )}
        </div>
      </motion.div>

      {/* What-If */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-premium p-5">
          <WhatIfSimulator
            categories={categories}
            totalIncome={totalIncome}
            totalExpenses={categories.reduce((s, c) => s + c.amount, 0)}
          />
        </div>
      </motion.div>

      {/* Coffee Effect */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="card-premium p-5">
          <CoffeeEffect effects={coffeeEffects} avgMonthlyExpenses={avgMonthlyExpenses} />
        </div>
      </motion.div>
    </div>
  );
};
