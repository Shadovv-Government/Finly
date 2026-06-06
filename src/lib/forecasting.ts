// src/lib/forecasting.ts
// ML-прогнозирование расходов: линейная регрессия + доверительные интервалы

export interface DataPoint {
  date: number;   // timestamp
  amount: number;
}

export interface ForecastPoint {
  date: number;       // timestamp
  predicted: number;
  lower: number;      // lower bound of CI
  upper: number;      // upper bound of CI
}

export interface ForecastResult {
  points: ForecastPoint[];
  confidence: number; // R² of the fit
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

const MS_PER_DAY = 86400000;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y, r2: 0 };

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const xMean = mean(xs);
  const yMean = mean(ys);

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  // R²
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i] - (slope * xs[i] + intercept)) ** 2;
    ssTot += (ys[i] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
}

export function predictWithConfidence(
  historical: DataPoint[],
  daysAhead: number,
): ForecastResult {
  if (historical.length === 0) {
    return { points: [], confidence: 0 };
  }

  // Aggregate by day
  const byDay = new Map<number, number>();
  for (const p of historical) {
    const day = new Date(p.date).setHours(0, 0, 0, 0);
    byDay.set(day, (byDay.get(day) || 0) + p.amount);
  }

  const sorted = Array.from(byDay.entries()).sort((a, b) => a[0] - b[0]);
  const baseTime = sorted[0]?.[0] ?? Date.now();

  // Build regression points: x = day index, y = amount
  const regPoints = sorted.map(([ts, amount]) => ({
    x: Math.round((ts - baseTime) / MS_PER_DAY),
    y: amount,
  }));

  const reg = linearRegression(regPoints);

  // Calculate residuals for CI
  const residuals = regPoints.map(p =>
    Math.abs(p.y - (reg.slope * p.x + reg.intercept))
  );
  const rmse = Math.sqrt(mean(residuals.map(r => r * r)));

  // Predict
  const lastIdx = regPoints.length > 0 ? regPoints[regPoints.length - 1].x : 0;
  const lastDate = sorted.length > 0 ? sorted[sorted.length - 1][0] : Date.now();

  const points: ForecastPoint[] = [];
  for (let i = 1; i <= daysAhead; i++) {
    const x = lastIdx + i;
    const predicted = reg.slope * x + reg.intercept;
    const ciMultiplier = Math.sqrt(i);
    const ci = rmse * ciMultiplier;
    const date = lastDate + i * MS_PER_DAY;
    points.push({
      date,
      predicted: Math.max(0, Math.round(predicted * 100) / 100),
      lower: Math.max(0, Math.round((predicted - ci) * 100) / 100),
      upper: Math.max(0, Math.round((predicted + ci) * 100) / 100),
    });
  }

  return { points, confidence: reg.r2 };
}
