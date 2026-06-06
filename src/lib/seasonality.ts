// src/lib/seasonality.ts
// Декомпозиция временного ряда: тренд + сезонность (дни недели) + остаток

import { linearRegression } from './forecasting';

export interface DailyPoint {
  date: number;
  amount: number;
}

export interface DecompositionPoint {
  date: number;
  amount: number;
}

export interface DayOfWeekEffect {
  day: number;   // 0=Sunday ... 6=Saturday
  value: number; // average deviation from trend
  label: string; // human-readable
}

export interface DecompositionResult {
  data: DecompositionPoint[];
  trend: DecompositionPoint[];
  seasonal: DecompositionPoint[];
  residual: DecompositionPoint[];
  weekdayEffect: DayOfWeekEffect[];
}

const MS_PER_DAY = 86400000;
const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function decompose(points: DailyPoint[]): DecompositionResult {
  if (points.length === 0) {
    const emptyEffect = Array.from({ length: 7 }, (_, i) => ({
      day: i,
      value: 0,
      label: DAY_LABELS[i],
    }));
    return { data: [], trend: [], seasonal: [], residual: [], weekdayEffect: emptyEffect };
  }

  // 1. Compute trend (linear regression on daily amounts)
  const baseTime = points[0].date;
  const regPoints = points.map(p => ({
    x: Math.round((p.date - baseTime) / MS_PER_DAY),
    y: p.amount,
  }));
  const reg = linearRegression(regPoints);

  // 2. Compute seasonal (average day-of-week deviation from trend)
  const weekdayDeviations = new Map<number, number[]>();
  for (let i = 0; i < 7; i++) {
    weekdayDeviations.set(i, []);
  }

  const trendValues = points.map((_p, i) => {
    const x = regPoints[i].x;
    return reg.slope * x + reg.intercept;
  });

  for (let i = 0; i < points.length; i++) {
    const day = new Date(points[i].date).getDay();
    const deviation = points[i].amount - trendValues[i];
    weekdayDeviations.get(day)!.push(deviation);
  }

  const weekdayAverages = new Map<number, number>();
  for (const [day, devs] of weekdayDeviations) {
    weekdayAverages.set(day, devs.length > 0 ? devs.reduce((s, d) => s + d, 0) / devs.length : 0);
  }

  // Build result arrays
  const data: DecompositionPoint[] = [];
  const trend: DecompositionPoint[] = [];
  const seasonal: DecompositionPoint[] = [];
  const residual: DecompositionPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const day = new Date(points[i].date).getDay();
    const t = trendValues[i];
    const s = weekdayAverages.get(day) ?? 0;
    const r = points[i].amount - t - s;
    data.push({ date: points[i].date, amount: points[i].amount });
    trend.push({ date: points[i].date, amount: Math.round(t * 100) / 100 });
    seasonal.push({ date: points[i].date, amount: Math.round(s * 100) / 100 });
    residual.push({ date: points[i].date, amount: Math.round(r * 100) / 100 });
  }

  const weekdayEffect: DayOfWeekEffect[] = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    value: Math.round((weekdayAverages.get(i) ?? 0) * 100) / 100,
    label: DAY_LABELS[i],
  }));

  return { data, trend, seasonal, residual, weekdayEffect };
}
