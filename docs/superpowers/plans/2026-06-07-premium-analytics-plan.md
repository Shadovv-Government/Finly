# Premium Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium analytics dashboard with 11 premium features across 3 tabs (Predictive, Comparative, Financial Health) + AI insights, gated behind a lifetime purchase flag.

**Architecture:** 13 new files — 3 pure logic modules (`lib/`), 1 DB query module (`db/premium.ts`), 9 React components (`components/premium/`), 1 screen (`screens/PremiumAnalytics.tsx`). DB migrates from v3 to v4 adding `isEssential` to categories. Data flows: IndexedDB → premium.ts aggregations → lib/ computations → React components → recharts visualization. AI features use existing `api/ai-chat.ts` Vercel proxy.

**Tech Stack:** React 18, TypeScript 5.4, Dexie.js 3.2, recharts 2.15, Vitest 4.1, Testing Library 16, fake-indexeddb, motion (framer), Tailwind CSS 4.1

---

## File Structure

```
Create:  src/lib/healthScore.ts
Create:  src/lib/healthScore.test.ts
Create:  src/lib/forecasting.ts
Create:  src/lib/forecasting.test.ts
Create:  src/lib/seasonality.ts
Create:  src/lib/seasonality.test.ts
Create:  src/db/premium.ts
Create:  src/db/premium.test.ts
Create:  src/app/components/premium/PremiumGate.tsx
Create:  src/app/components/premium/PremiumGate.test.tsx
Create:  src/app/components/premium/PremiumUpsell.tsx
Create:  src/app/components/premium/HealthScoreGauge.tsx
Create:  src/app/components/premium/HealthScoreGauge.test.tsx
Create:  src/app/components/premium/WhatIfSimulator.tsx
Create:  src/app/components/premium/WhatIfSimulator.test.tsx
Create:  src/app/components/premium/CalendarHeatmap.tsx
Create:  src/app/components/premium/CalendarHeatmap.test.tsx
Create:  src/app/components/premium/TrendDecomposition.tsx
Create:  src/app/components/premium/TrendDecomposition.test.tsx
Create:  src/app/components/premium/PredictiveTab.tsx
Create:  src/app/components/premium/ComparativeTab.tsx
Create:  src/app/components/premium/HealthTab.tsx
Create:  src/app/components/premium/AIInsightsPanel.tsx
Create:  src/app/components/premium/AIInsightsPanel.test.tsx
Create:  src/app/screens/PremiumAnalytics.tsx
Create:  src/app/screens/PremiumAnalytics.test.tsx

Modify: src/db/db.ts (v3→v4 migration)
Modify: src/db/types.ts (add isEssential to Category)
Modify: src/app/routes.tsx (add /premium route)
Modify: src/app/components/BottomNav.tsx (add premium nav item)
```

---

## Phase 1: Foundation — DB Migration + Pure Logic

### Task 1: DB Schema Migration v3 → v4

**Files:**
- Modify: `src/db/types.ts`
- Modify: `src/db/db.ts`

- [ ] **Step 1: Add `isEssential` to Category type**

In `src/db/types.ts`, modify the Category interface:

```typescript
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isSystem: boolean;
  parentId?: string;
  isEssential?: boolean; // ← новое поле для премиум-аналитики
}
```

- [ ] **Step 2: Add version 4 migration to db.ts**

In `src/db/db.ts`, add a new version after the existing `this.version(3).stores(...)`:

```typescript
this.version(4).stores({
  transactions: '++id, date, categoryId, type, createdAt',
  categories: 'id, type, isSystem',
  budgets: '++id, categoryId, period, startDate',
  goals: '++id, isActive, deadline',
  recurringTemplates: '++id, nextDate, isActive',
  settings: 'key',
  aiPatterns: '++id, pattern, categoryId',
  users: 'id, createdAt',
  notifications: '++id, type, read, createdAt, expiresAt',
}).upgrade(async tx => {
  const ESSENTIAL_KEYWORDS = ['продукт', 'жиль', 'коммуналь', 'транспорт', 'здоров', 'аптек', 'связ', 'интернет'];
  const sysCats = await tx.table('categories').where('isSystem').equals(1).toArray();
  for (const cat of sysCats) {
    const isEssential = ESSENTIAL_KEYWORDS.some(kw => (cat.name || '').toLowerCase().includes(kw));
    await tx.table('categories').update(cat.id, { isEssential });
  }
});
```

- [ ] **Step 3: Verify DB upgrade test passes**

Run: `npx vitest run src/db/db.upgrade.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/db/types.ts src/db/db.ts
git commit -m "feat: add isEssential field to Category, migrate DB to v4"
```

---

### Task 2: Health Score Library

**Files:**
- Create: `src/lib/healthScore.ts`
- Create: `src/lib/healthScore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/healthScore.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateHealthScore, type HealthScoreInput, type MetricResult } from './healthScore';

describe('calculateHealthScore', () => {
  const baseInput: HealthScoreInput = {
    totalIncome: 100_000,
    totalExpenses: 70_000,
    essentialExpenses: 35_000,
    monthlyIncomes: [100_000, 100_000, 100_000, 100_000, 100_000, 100_000],
    freeBalance: 420_000,
    avgMonthlyExpenses: 70_000,
    categoryExpenses: [
      { categoryId: 'food', amount: 20_000 },
      { categoryId: 'transport', amount: 15_000 },
      { categoryId: 'entertainment', amount: 10_000 },
      { categoryId: 'rent', amount: 25_000 },
    ],
    debtExpenses: 0,
  };

  it('returns score between 0 and 100', () => {
    const result = calculateHealthScore(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns 6 metrics', () => {
    const result = calculateHealthScore(baseInput);
    expect(result.metrics).toHaveLength(6);
    result.metrics.forEach(m => {
      expect(m.subscore).toBeGreaterThanOrEqual(0);
      expect(m.subscore).toBeLessThanOrEqual(100);
      expect(m.weight).toBeGreaterThan(0);
    });
  });

  it('weights sum to 100', () => {
    const result = calculateHealthScore(baseInput);
    const totalWeight = result.metrics.reduce((sum, m) => sum + m.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('gives perfect score for ideal finances', () => {
    const input: HealthScoreInput = {
      totalIncome: 100_000,
      totalExpenses: 50_000,        // 50% savings rate
      essentialExpenses: 25_000,    // 50% of expenses
      monthlyIncomes: [100_000, 100_000, 100_000, 100_000, 100_000, 100_000], // CV=0
      freeBalance: 600_000,          // 8.5 months reserve
      avgMonthlyExpenses: 70_000,
      categoryExpenses: [
        { categoryId: 'a', amount: 12500 },
        { categoryId: 'b', amount: 12500 },
        { categoryId: 'c', amount: 12500 },
        { categoryId: 'd', amount: 12500 },
      ],
      debtExpenses: 0,
    };
    const result = calculateHealthScore(input);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('gives low score for poor finances', () => {
    const input: HealthScoreInput = {
      totalIncome: 100_000,
      totalExpenses: 95_000,        // 5% savings
      essentialExpenses: 80_000,    // 84% essential
      monthlyIncomes: [100_000, 50_000, 150_000, 0, 200_000, 100_000], // high CV
      freeBalance: 10_000,           // < 1 month reserve
      avgMonthlyExpenses: 95_000,
      categoryExpenses: [
        { categoryId: 'a', amount: 90000 },
        { categoryId: 'b', amount: 5000 },
      ],
      debtExpenses: 40_000,         // 40% debt load
    };
    const result = calculateHealthScore(input);
    expect(result.score).toBeLessThan(50);
  });

  it('handles zero income gracefully', () => {
    const input: HealthScoreInput = {
      ...baseInput,
      totalIncome: 0,
      monthlyIncomes: [0, 0, 0, 0, 0, 0],
    };
    const result = calculateHealthScore(input);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles no expenses (all income)', () => {
    const input: HealthScoreInput = {
      ...baseInput,
      totalExpenses: 0,
      essentialExpenses: 0,
      categoryExpenses: [],
      avgMonthlyExpenses: 0,
    };
    const result = calculateHealthScore(input);
    expect(result.score).toBeGreaterThanOrEqual(80); // great savings, no debt
  });

  it('no debt categories = perfect debt subscore', () => {
    const result = calculateHealthScore(baseInput);
    const debtMetric = result.metrics.find(m => m.name === 'Долговая нагрузка')!;
    expect(debtMetric.subscore).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/healthScore.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement healthScore.ts**

Create `src/lib/healthScore.ts`:

```typescript
export interface MetricResult {
  name: string;
  value: number;       // raw calculated value
  weight: number;      // percentage weight (0-100)
  subscore: number;    // 0-100
  label: string;       // human-readable description
  status: 'good' | 'warning' | 'bad';
}

export interface HealthScoreInput {
  totalIncome: number;
  totalExpenses: number;
  essentialExpenses: number;
  monthlyIncomes: number[];       // last 6 months
  freeBalance: number;            // from getBalanceWithSavings()
  avgMonthlyExpenses: number;     // 6-month average
  categoryExpenses: { categoryId: string; amount: number }[];
  debtExpenses: number;           // total spent in debt-tagged categories
}

export interface HealthScoreResult {
  score: number;                  // 0-100
  metrics: MetricResult[];
  recommendations: string[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeToScore(value: number, target: number, direction: 'higher' | 'lower'): number {
  if (direction === 'higher') {
    return clamp(Math.round((value / target) * 100), 0, 100);
  }
  // lower is better: 0% of target = 100, target = 50, 2x target = 0
  if (value <= 0) return 100;
  const ratio = value / target;
  if (ratio <= 1) return clamp(Math.round(100 - ratio * 50), 50, 100);
  return clamp(Math.round(100 / (1 + ratio - 1)), 0, 50);
}

function cv(values: number[]): number {
  if (values.length < 2) return 1;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 1;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean; // coefficient of variation
}

function hhi(values: number[]): number {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return 1;
  return values.reduce((s, v) => s + (v / total) ** 2, 0);
}

function getStatus(subscore: number): 'good' | 'warning' | 'bad' {
  if (subscore >= 70) return 'good';
  if (subscore >= 40) return 'warning';
  return 'bad';
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const metrics: MetricResult[] = [];
  const recommendations: string[] = [];

  // 1. Savings Rate (25%)
  const savingsRate = input.totalIncome > 0
    ? ((input.totalIncome - input.totalExpenses) / input.totalIncome) * 100
    : 0;
  const savingsSubscore = normalizeToScore(savingsRate, 20, 'higher');
  metrics.push({
    name: 'Норма сбережений',
    value: Math.round(savingsRate),
    weight: 25,
    subscore: savingsSubscore,
    label: `${Math.round(savingsRate)}% от дохода`,
    status: getStatus(savingsSubscore),
  });
  if (savingsSubscore < 50) {
    recommendations.push('Увеличьте норму сбережений до 20% от доходов. Попробуйте правило 50/30/20.');
  }

  // 2. Essential Expenses Ratio (20%)
  const essentialRatio = input.totalExpenses > 0
    ? (input.essentialExpenses / input.totalExpenses) * 100
    : 0;
  const essentialSubscore = normalizeToScore(essentialRatio, 50, 'lower');
  metrics.push({
    name: 'Обязательные расходы',
    value: Math.round(essentialRatio),
    weight: 20,
    subscore: essentialSubscore,
    label: `${Math.round(essentialRatio)}% от расходов`,
    status: getStatus(essentialSubscore),
  });
  if (essentialSubscore < 50) {
    recommendations.push('Слишком высокая доля обязательных расходов. Проверьте возможность сокращения.');
  }

  // 3. Income Regularity (15%)
  const incomeCV = cv(input.monthlyIncomes);
  const regularitySubscore = normalizeToScore(incomeCV, 0.3, 'lower');
  metrics.push({
    name: 'Регулярность доходов',
    value: Math.round(incomeCV * 100) / 100,
    weight: 15,
    subscore: regularitySubscore,
    label: `CV: ${(incomeCV * 100).toFixed(0)}%`,
    status: getStatus(regularitySubscore),
  });
  if (regularitySubscore < 50) {
    recommendations.push('Доходы нерегулярны. Постарайтесь создать резервный фонд на 3-6 месяцев.');
  }

  // 4. Emergency Fund (20%)
  const monthsReserve = input.avgMonthlyExpenses > 0
    ? input.freeBalance / input.avgMonthlyExpenses
    : (input.freeBalance > 0 ? 99 : 0);
  const reserveSubscore = normalizeToScore(monthsReserve, 6, 'higher');
  metrics.push({
    name: 'Резервный фонд',
    value: Math.round(monthsReserve * 10) / 10,
    weight: 20,
    subscore: reserveSubscore,
    label: `${monthsReserve.toFixed(1)} мес. расходов`,
    status: getStatus(reserveSubscore),
  });
  if (reserveSubscore < 50) {
    recommendations.push('Создайте резервный фонд — минимум 3 месяца расходов.');
  }

  // 5. Diversification (10%)
  const amounts = input.categoryExpenses.map(c => c.amount);
  const hhiValue = hhi(amounts);
  const diversSubscore = normalizeToScore(hhiValue, 0.25, 'lower');
  metrics.push({
    name: 'Диверсификация',
    value: Math.round(hhiValue * 100) / 100,
    weight: 10,
    subscore: diversSubscore,
    label: `HHI: ${(hhiValue * 100).toFixed(0)}`,
    status: getStatus(diversSubscore),
  });
  if (diversSubscore < 50) {
    recommendations.push('Расходы сконцентрированы в нескольких категориях. Проверьте баланс трат.');
  }

  // 6. Debt Load (10%)
  const debtRatio = input.totalIncome > 0
    ? (input.debtExpenses / input.totalIncome) * 100
    : 0;
  const debtSubscore = debtRatio > 0
    ? normalizeToScore(debtRatio, 30, 'lower')
    : 100; // no debt = perfect
  metrics.push({
    name: 'Долговая нагрузка',
    value: Math.round(debtRatio),
    weight: 10,
    subscore: debtSubscore,
    label: debtRatio > 0 ? `${Math.round(debtRatio)}% от дохода` : 'Нет долгов',
    status: getStatus(debtSubscore),
  });
  if (debtSubscore < 50) {
    recommendations.push('Высокая долговая нагрузка. Приоритет — погашение долгов.');
  }

  const totalWeights = metrics.reduce((s, m) => s + m.weight, 0);
  const score = Math.round(
    metrics.reduce((s, m) => s + m.subscore * m.weight, 0) / totalWeights
  );

  return { score, metrics, recommendations };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/healthScore.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/healthScore.ts src/lib/healthScore.test.ts
git commit -m "feat: add health score calculation library with 6 metrics"
```

---

### Task 3: Forecasting Library

**Files:**
- Create: `src/lib/forecasting.ts`
- Create: `src/lib/forecasting.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/forecasting.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { linearRegression, predictWithConfidence, type ForecastPoint } from './forecasting';

describe('linearRegression', () => {
  it('fits simple linear trend', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];
    const { slope, intercept, r2 } = linearRegression(points);
    expect(slope).toBeCloseTo(1, 5);
    expect(intercept).toBeCloseTo(0, 5);
    expect(r2).toBeCloseTo(1, 5);
  });

  it('fits flat line', () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ];
    const { slope } = linearRegression(points);
    expect(slope).toBeCloseTo(0, 5);
  });

  it('handles single point', () => {
    const { slope, intercept } = linearRegression([{ x: 0, y: 10 }]);
    expect(slope).toBe(0);
    expect(intercept).toBe(10);
  });

  it('handles empty array', () => {
    const { slope, intercept, r2 } = linearRegression([]);
    expect(slope).toBe(0);
    expect(intercept).toBe(0);
    expect(r2).toBe(0);
  });
});

describe('predictWithConfidence', () => {
  it('returns 30 forecast points', () => {
    const historical = Array.from({ length: 90 }, (_, i) => ({
      date: Date.now() - (90 - i) * 86400000,
      amount: 1000 + i * 2 + Math.random() * 200,
    }));
    const result = predictWithConfidence(historical, 30);
    expect(result.points).toHaveLength(30);
  });

  it('each point has lower <= predicted <= upper', () => {
    const historical = Array.from({ length: 90 }, (_, i) => ({
      date: Date.now() - (90 - i) * 86400000,
      amount: 1000 + Math.random() * 500,
    }));
    const result = predictWithConfidence(historical, 30);
    for (const p of result.points) {
      expect(p.lower).toBeLessThanOrEqual(p.predicted);
      expect(p.predicted).toBeLessThanOrEqual(p.upper);
    }
  });

  it('wider CI for noisy data', () => {
    const stable = Array.from({ length: 90 }, (_, i) => ({
      date: Date.now() - (90 - i) * 86400000,
      amount: 1000 + i * 2,
    }));
    const noisy = Array.from({ length: 90 }, (_, i) => ({
      date: Date.now() - (90 - i) * 86400000,
      amount: 1000 + Math.random() * 2000,
    }));
    const stableResult = predictWithConfidence(stable, 30);
    const noisyResult = predictWithConfidence(noisy, 30);
    const stableAvgWidth = stableResult.points.reduce((s, p) => s + (p.upper - p.lower), 0) / 30;
    const noisyAvgWidth = noisyResult.points.reduce((s, p) => s + (p.upper - p.lower), 0) / 30;
    expect(noisyAvgWidth).toBeGreaterThan(stableAvgWidth);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/forecasting.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement forecasting.ts**

Create `src/lib/forecasting.ts`:

```typescript
import { MS_PER_DAY } from '../app/constants';

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
  trendLine: { slope: number; intercept: number };
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

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
    return { points: [], confidence: 0, trendLine: { slope: 0, intercept: 0 } };
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
    // CI widens with distance
    const ciMultiplier = Math.sqrt(i); // wider CI further out
    const ci = rmse * ciMultiplier;
    const date = lastDate + i * MS_PER_DAY;
    points.push({
      date,
      predicted: Math.max(0, predicted),
      lower: Math.max(0, predicted - ci),
      upper: Math.max(0, predicted + ci),
    });
  }

  return { points, confidence: reg.r2, trendLine: { slope: reg.slope, intercept: reg.intercept } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/forecasting.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/forecasting.ts src/lib/forecasting.test.ts
git commit -m "feat: add forecasting library with linear regression and confidence intervals"
```

---

### Task 4: Seasonality Library

**Files:**
- Create: `src/lib/seasonality.ts`
- Create: `src/lib/seasonality.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/seasonality.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { decompose, type DecompositionResult } from './seasonality';

describe('decompose', () => {
  const days = Array.from({ length: 90 }, (_, i) => ({
    date: new Date(2026, 0, i + 1).getTime(),
    amount: 1000 + i * 2 + (i % 7 === 5 ? 500 : 0), // trend + Saturday spike
  }));

  it('returns trend, seasonal, and residual arrays same length as input', () => {
    const result = decompose(days);
    expect(result.trend).toHaveLength(days.length);
    expect(result.seasonal).toHaveLength(days.length);
    expect(result.residual).toHaveLength(days.length);
    expect(result.data).toHaveLength(days.length);
  });

  it('residual + trend + seasonal ≈ original', () => {
    const result = decompose(days);
    for (let i = 0; i < days.length; i++) {
      const reconstructed = result.trend[i].amount + result.seasonal[i].amount + result.residual[i].amount;
      expect(reconstructed).toBeCloseTo(days[i].amount, 0);
    }
  });

  it('handles empty array', () => {
    const result = decompose([]);
    expect(result.trend).toHaveLength(0);
    expect(result.seasonal).toHaveLength(0);
    expect(result.residual).toHaveLength(0);
    expect(result.weekdayEffect).toHaveLength(7);
  });

  it('weekdayEffect has 7 entries', () => {
    const result = decompose(days);
    expect(result.weekdayEffect).toHaveLength(7);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result.weekdayEffect.forEach(e => {
      expect(e.day).toBeGreaterThanOrEqual(0);
      expect(e.day).toBeLessThanOrEqual(6);
    });
  });

  it('detects weekend effect when Saturdays spike', () => {
    const result = decompose(days);
    const saturday = result.weekdayEffect.find(e => e.day === 5)!; // JS: 5=Saturday
    const monday = result.weekdayEffect.find(e => e.day === 1)!;
    // Saturday should have higher seasonal value than Monday
    expect(saturday.value).toBeGreaterThan(monday.value);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seasonality.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seasonality.ts**

Create `src/lib/seasonality.ts`:

```typescript
import { linearRegression } from './forecasting';
import { MS_PER_DAY } from '../app/constants';

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
  data: DecompositionPoint[];       // original data
  trend: DecompositionPoint[];      // linear trend component
  seasonal: DecompositionPoint[];   // day-of-week component
  residual: DecompositionPoint[];   // what's left
  weekdayEffect: DayOfWeekEffect[]; // average effect per day
}

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

  const trendValues = points.map((p, i) => {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/seasonality.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/seasonality.ts src/lib/seasonality.test.ts
git commit -m "feat: add seasonality decomposition library"
```

---

### Task 5: Premium DB Queries

**Files:**
- Create: `src/db/premium.ts`
- Create: `src/db/premium.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/db/premium.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { seedTestData } from './seed';
import {
  getHealthScoreData,
  getForecastData,
  getYoYComparison,
  getCalendarYearData,
  getCashFlowForecast,
  buildAIContext,
  getGrowingCategories,
  getProblemDetectorIssues,
} from './premium';

describe('premium.ts', () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterEach(async () => {
    await db.transactions.clear();
  });

  describe('getHealthScoreData', () => {
    it('returns all fields needed for health score', async () => {
      const data = await getHealthScoreData();
      expect(data).toHaveProperty('totalIncome');
      expect(data).toHaveProperty('totalExpenses');
      expect(data).toHaveProperty('essentialExpenses');
      expect(data).toHaveProperty('monthlyIncomes');
      expect(data).toHaveProperty('freeBalance');
      expect(data).toHaveProperty('avgMonthlyExpenses');
      expect(data).toHaveProperty('categoryExpenses');
      expect(data).toHaveProperty('debtExpenses');
    });
  });

  describe('getForecastData', () => {
    it('returns daily expense points', async () => {
      const data = await getForecastData(90);
      expect(Array.isArray(data)).toBe(true);
      for (const p of data) {
        expect(p).toHaveProperty('date');
        expect(p).toHaveProperty('amount');
      }
    });
  });

  describe('getYoYComparison', () => {
    it('returns thisMonth and lastYearMonth', async () => {
      const result = await getYoYComparison();
      expect(result).toHaveProperty('thisMonth');
      expect(result).toHaveProperty('lastYearMonth');
      expect(result).toHaveProperty('delta');
      expect(result).toHaveProperty('deltaPercent');
      expect(result).toHaveProperty('byCategory');
    });
  });

  describe('getCalendarYearData', () => {
    it('returns array of { date, amount }', async () => {
      const data = await getCalendarYearData(2026);
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('date');
        expect(data[0]).toHaveProperty('amount');
      }
    });
  });

  describe('getCashFlowForecast', () => {
    it('returns array of points with balance projections', async () => {
      const data = await getCashFlowForecast(3);
      expect(Array.isArray(data)).toBe(true);
      for (const p of data) {
        expect(p).toHaveProperty('date');
        expect(p).toHaveProperty('projectedBalance');
        expect(p).toHaveProperty('expectedIncome');
        expect(p).toHaveProperty('expectedExpenses');
      }
    });
  });

  describe('getGrowingCategories', () => {
    it('returns categories sorted by growth rate', async () => {
      const data = await getGrowingCategories();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('getProblemDetectorIssues', () => {
    it('returns array of detected issues', async () => {
      const issues = await getProblemDetectorIssues();
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('buildAIContext', () => {
    it('returns aggregated data for AI', async () => {
      const ctx = await buildAIContext();
      expect(ctx).toHaveProperty('period');
      expect(ctx).toHaveProperty('balance');
      expect(ctx).toHaveProperty('savingsRate');
      expect(ctx).toHaveProperty('topExpenseCategories');
      expect(ctx).toHaveProperty('momChanges');
      expect(ctx).toHaveProperty('anomalies');
      expect(ctx).toHaveProperty('healthScore');
      expect(ctx).toHaveProperty('forecast');
      expect(ctx).toHaveProperty('upcomingRecurring');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/premium.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement premium.ts**

Create `src/db/premium.ts`:

```typescript
import { db } from './db';
import { MS_PER_DAY, MS_PER_MONTH } from '../app/constants';
import { getBalanceByPeriod, getExpensesByCategory, getCategoryMoMDelta, getAnomalousTransactions, getRecurringUpcoming, getMonthForecast, getBalanceWithSavings } from './analytics';
import { calculateHealthScore, type HealthScoreInput } from '../lib/healthScore';
import type { CategoryAnalytics, BalanceSummary } from './analytics';

// ==================== Health Score Data ====================

export async function getHealthScoreData(): Promise<HealthScoreInput> {
  const now = Date.now();
  const sixMonthsAgo = now - 6 * MS_PER_MONTH;

  // Monthly incomes for CV calculation
  const transactions = await db.transactions.where('date').above(sixMonthsAgo).toArray();
  const incomeTx = transactions.filter(t => t.type === 'income');
  const expenseTx = transactions.filter(t => t.type === 'expense');

  // Group incomes by month
  const monthlyIncomeMap = new Map<string, number>();
  for (const t of incomeTx) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyIncomeMap.set(key, (monthlyIncomeMap.get(key) || 0) + t.amount * t.rate);
  }
  const monthlyIncomes = Array.from(monthlyIncomeMap.values());

  // Total for 6 months
  const totalIncome = incomeTx.reduce((s, t) => s + t.amount * t.rate, 0);
  const totalExpenses = expenseTx.reduce((s, t) => s + t.amount * t.rate, 0);

  // Essential expenses
  const categories = await db.categories.toArray();
  const essentialCatIds = new Set(
    categories.filter(c => c.isEssential).map(c => c.id)
  );
  const essentialExpenses = expenseTx
    .filter(t => t.categoryId && essentialCatIds.has(t.categoryId))
    .reduce((s, t) => s + t.amount * t.rate, 0);

  // Free balance
  const balanceData = await getBalanceWithSavings();
  const freeBalance = balanceData.freeBalance;

  // Average monthly expenses
  const months = Math.max(1, Math.ceil((now - sixMonthsAgo) / MS_PER_MONTH));
  const avgMonthlyExpenses = totalExpenses / months;

  // Category expenses for HHI
  const catExpenseMap = new Map<string, number>();
  for (const t of expenseTx) {
    const cid = t.categoryId || 'other';
    catExpenseMap.set(cid, (catExpenseMap.get(cid) || 0) + t.amount * t.rate);
  }
  const categoryExpenses = Array.from(catExpenseMap.entries()).map(([categoryId, amount]) => ({
    categoryId,
    amount,
  }));

  // Debt expenses (categories with debt keywords in name)
  const DEBT_KEYWORDS = ['долг', 'кредит', 'ипотека', 'заём', 'заем', 'рассрочк'];
  const debtCatIds = new Set(
    categories.filter(c => DEBT_KEYWORDS.some(kw => c.name.toLowerCase().includes(kw))).map(c => c.id)
  );
  const debtExpenses = expenseTx
    .filter(t => t.categoryId && debtCatIds.has(t.categoryId))
    .reduce((s, t) => s + t.amount * t.rate, 0);

  return {
    totalIncome,
    totalExpenses,
    essentialExpenses,
    monthlyIncomes: monthlyIncomes.length >= 6 ? monthlyIncomes : [...monthlyIncomes, ...Array(6 - monthlyIncomes.length).fill(0)],
    freeBalance,
    avgMonthlyExpenses,
    categoryExpenses,
    debtExpenses,
  };
}

// ==================== Forecast Data ====================

export async function getForecastData(days: number): Promise<{ date: number; amount: number }[]> {
  const now = Date.now();
  const start = now - days * MS_PER_DAY;
  const transactions = await db.transactions
    .where('date').between(start, now)
    .filter(t => t.type === 'expense')
    .toArray();

  // Aggregate by day
  const byDay = new Map<number, number>();
  for (const t of transactions) {
    const day = new Date(t.date).setHours(0, 0, 0, 0);
    byDay.set(day, (byDay.get(day) || 0) + t.amount * t.rate);
  }

  return Array.from(byDay.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date - b.date);
}

// ==================== YoY Comparison ====================

export interface YoYResult {
  thisMonth: number;
  lastYearMonth: number;
  delta: number;
  deltaPercent: number;
  byCategory: {
    categoryName: string;
    thisMonth: number;
    lastYearMonth: number;
    delta: number;
    deltaPercent: number;
  }[];
}

export async function getYoYComparison(): Promise<YoYResult> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthEnd = now.getTime();
  const lastYearMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1).getTime();
  const lastYearMonthEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const [thisData, lastYearData] = await Promise.all([
    getExpensesByCategory(thisMonthStart, thisMonthEnd),
    getExpensesByCategory(lastYearMonthStart, lastYearMonthEnd),
  ]);

  const thisTotal = thisData.reduce((s, c) => s + c.amount, 0);
  const lastTotal = lastYearData.reduce((s, c) => s + c.amount, 0);
  const delta = thisTotal - lastTotal;
  const deltaPercent = lastTotal > 0 ? (delta / lastTotal) * 100 : (thisTotal > 0 ? 100 : 0);

  const lastYearMap = new Map(lastYearData.map(c => [c.categoryName, c.amount]));
  const byCategory = thisData.map(c => {
    const lastAmt = lastYearMap.get(c.categoryName) || 0;
    const catDelta = c.amount - lastAmt;
    return {
      categoryName: c.categoryName,
      thisMonth: c.amount,
      lastYearMonth: lastAmt,
      delta: catDelta,
      deltaPercent: lastAmt > 0 ? (catDelta / lastAmt) * 100 : 100,
    };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { thisMonth: thisTotal, lastYearMonth: lastTotal, delta, deltaPercent, byCategory };
}

// ==================== Calendar Year Data ====================

export interface CalendarDay {
  date: number;
  amount: number;
}

export async function getCalendarYearData(year: number): Promise<CalendarDay[]> {
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();

  const transactions = await db.transactions
    .where('date').between(yearStart, yearEnd)
    .filter(t => t.type === 'expense')
    .toArray();

  const byDay = new Map<number, number>();
  for (const t of transactions) {
    const day = new Date(t.date).setHours(0, 0, 0, 0);
    byDay.set(day, (byDay.get(day) || 0) + t.amount * t.rate);
  }

  return Array.from(byDay.entries()).map(([date, amount]) => ({ date, amount }));
}

// ==================== Cash Flow Forecast ====================

export interface CashFlowPoint {
  date: number;
  projectedBalance: number;
  expectedIncome: number;
  expectedExpenses: number;
}

export async function getCashFlowForecast(months: number): Promise<CashFlowPoint[]> {
  const now = Date.now();
  const sixMonthsAgo = now - 6 * MS_PER_MONTH;

  // Compute average monthly income/expense from last 6 months
  const transactions = await db.transactions.where('date').above(sixMonthsAgo).toArray();
  const monthsWithData = Math.max(1, Math.ceil((now - sixMonthsAgo) / MS_PER_MONTH));
  const avgIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount * t.rate, 0) / monthsWithData;
  const avgExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount * t.rate, 0) / monthsWithData;

  // Current balance
  const balanceData = await getBalanceWithSavings();
  let runningBalance = balanceData.totalBalance;

  const result: CashFlowPoint[] = [];
  for (let m = 1; m <= months; m++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + m);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();

    // Adjust for known recurring
    const templates = await db.recurringTemplates
      .filter(t => t.isActive && t.nextDate <= monthStart + 31 * MS_PER_DAY)
      .toArray();
    const recurringImpact = templates.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

    const expectedIncome = avgIncome + recurringImpact * 0.1;
    const expectedExpenses = avgExpenses;

    runningBalance += expectedIncome - expectedExpenses;

    result.push({
      date: monthStart,
      projectedBalance: Math.round(runningBalance * 100) / 100,
      expectedIncome: Math.round(expectedIncome * 100) / 100,
      expectedExpenses: Math.round(expectedExpenses * 100) / 100,
    });
  }

  return result;
}

// ==================== Growing Categories (Problem Detector) ====================

export interface GrowingCategory {
  categoryName: string;
  currentMonth: number;
  prevMonth: number;
  growthPercent: number;
  icon: string;
  color: string;
}

export async function getGrowingCategories(): Promise<GrowingCategory[]> {
  const momDeltas = await getCategoryMoMDelta();
  return momDeltas
    .filter(d => d.deltaPercent > 10 && d.thisMonth > 0)
    .map(d => ({
      categoryName: d.categoryName,
      currentMonth: d.thisMonth,
      prevMonth: d.lastMonth,
      growthPercent: d.deltaPercent,
      icon: d.icon,
      color: d.color,
    }))
    .sort((a, b) => b.growthPercent - a.growthPercent);
}

// ==================== Problem Detector ====================

export interface DetectedIssue {
  type: 'growing_category' | 'no_budget_overspend' | 'subscription_like' | 'low_savings';
  severity: 'warning' | 'danger';
  title: string;
  description: string;
  data?: Record<string, unknown>;
}

export async function getProblemDetectorIssues(): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  // Growing categories
  const growing = await getGrowingCategories();
  for (const g of growing.slice(0, 3)) {
    issues.push({
      type: 'growing_category',
      severity: g.growthPercent > 50 ? 'danger' : 'warning',
      title: `Растущая категория: ${g.categoryName}`,
      description: `Расходы на "${g.categoryName}" выросли на ${Math.round(g.growthPercent)}% по сравнению с прошлым месяцем (${Math.round(g.prevMonth)} → ${Math.round(g.currentMonth)} ₽)`,
      data: { categoryName: g.categoryName, growthPercent: g.growthPercent },
    });
  }

  // Low savings
  const sixMonthsAgo = Date.now() - 6 * MS_PER_MONTH;
  const summary = await getBalanceByPeriod(sixMonthsAgo, Date.now());
  const savingsRate = summary.income > 0 ? ((summary.income - summary.expenses) / summary.income) * 100 : 0;
  if (savingsRate < 5) {
    issues.push({
      type: 'low_savings',
      severity: 'danger',
      title: 'Критически низкая норма сбережений',
      description: `За последние 6 месяцев вы сохранили всего ${savingsRate.toFixed(1)}% дохода. Рекомендуется откладывать минимум 10-20%.`,
      data: { savingsRate },
    });
  }

  // No budget overspend
  const budgets = await db.budgets.filter(b => b.startDate > sixMonthsAgo).toArray();
  if (budgets.length === 0) {
    issues.push({
      type: 'no_budget_overspend',
      severity: 'warning',
      title: 'У вас нет активных бюджетов',
      description: 'Бюджеты помогают контролировать расходы по категориям. Создайте бюджет для ключевых категорий.',
    });
  }

  return issues;
}

// ==================== AI Context Builder ====================

export interface AIAnalyticsContext {
  period: { start: number; end: number };
  balance: { income: number; expenses: number; net: number };
  savingsRate: number;
  topExpenseCategories: { name: string; amount: number; percent: number }[];
  momChanges: { name: string; delta: number; deltaPercent: number }[];
  anomalies: { name: string; amount: number; ratio: number }[];
  healthScore: number;
  forecast: { dailyRate: number; projectedMonthEnd: number };
  upcomingRecurring: { label: string; amount: number; daysUntil: number }[];
}

export async function buildAIContext(): Promise<AIAnalyticsContext> {
  const now = Date.now();
  const weekAgo = now - 7 * MS_PER_DAY;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const [balance, expenses, momChanges, anomalies, upcoming, forecast, healthData] = await Promise.all([
    getBalanceByPeriod(weekAgo, now),
    getExpensesByCategory(monthStart, now),
    getCategoryMoMDelta(),
    getAnomalousTransactions(monthStart, now),
    getRecurringUpcoming(14),
    getMonthForecast(),
    getHealthScoreData(),
  ]);

  const totalExpenses = expenses.reduce((s, c) => s + c.amount, 0);
  const topExpenseCategories = expenses
    .slice(0, 5)
    .map(c => ({
      name: c.categoryName,
      amount: c.amount,
      percent: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
    }));

  const savingsRate = balance.income > 0 ? ((balance.income - balance.expenses) / balance.income) * 100 : 0;
  const healthResult = calculateHealthScore(healthData);

  return {
    period: { start: weekAgo, end: now },
    balance: { income: balance.income, expenses: balance.expenses, net: balance.balance },
    savingsRate: Math.round(savingsRate * 10) / 10,
    topExpenseCategories,
    momChanges: momChanges.slice(0, 5).map(m => ({
      name: m.categoryName,
      delta: m.delta,
      deltaPercent: m.deltaPercent,
    })),
    anomalies: anomalies.map(a => ({
      name: a.categoryName,
      amount: a.amount,
      ratio: a.ratio,
    })),
    healthScore: healthResult.score,
    forecast: {
      dailyRate: forecast.dailyRate,
      projectedMonthEnd: forecast.forecastTotal,
    },
    upcomingRecurring: upcoming.map(u => ({
      label: u.label,
      amount: u.amount,
      daysUntil: u.daysUntil,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/db/premium.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/premium.ts src/db/premium.test.ts
git commit -m "feat: add premium DB queries — health data, forecast, YoY, calendar, cashflow, AI context"
```

---

## Phase 2: Premium Gate + Upsell Components

### Task 6: PremiumGate Component

**Files:**
- Create: `src/app/components/premium/PremiumGate.tsx`
- Create: `src/app/components/premium/PremiumGate.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/premium/PremiumGate.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PremiumGate } from './PremiumGate';
import 'fake-indexeddb/auto';
import { db } from '../../../db/db';

describe('PremiumGate', () => {
  beforeEach(async () => {
    await db.settings.clear();
  });

  it('shows children when premium is true', async () => {
    await db.settings.put({ key: 'premium', value: true });
    render(
      <PremiumGate>
        <div data-testid="premium-content">Premium Content</div>
      </PremiumGate>
    );
    // Wait for async check
    const content = await screen.findByTestId('premium-content');
    expect(content).toBeDefined();
  });

  it('shows upsell when premium is false', async () => {
    await db.settings.put({ key: 'premium', value: false });
    render(
      <PremiumGate>
        <div data-testid="premium-content">Premium Content</div>
      </PremiumGate>
    );
    const upsell = await screen.findByText(/Premium/i);
    expect(upsell).toBeDefined();
    expect(screen.queryByTestId('premium-content')).toBeNull();
  });

  it('shows upsell when premium key is missing', async () => {
    render(
      <PremiumGate>
        <div data-testid="premium-content">Premium Content</div>
      </PremiumGate>
    );
    const upsell = await screen.findByText(/Premium/i);
    expect(upsell).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/components/premium/PremiumGate.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement PremiumGate.tsx**

Create `src/app/components/premium/PremiumGate.tsx`:

```typescript
import { type ReactNode } from 'react';
import { usePremium } from '../../hooks/usePremium';
import { PremiumUpsell } from './PremiumUpsell';

interface PremiumGateProps {
  children: ReactNode;
}

export const PremiumGate = ({ children }: PremiumGateProps) => {
  const { isPremium, loading } = usePremium();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isPremium) {
    return <PremiumUpsell />;
  }

  return <>{children}</>;
};
```

- [ ] **Step 4: Run test to verify it passes**

Note: This test requires the `usePremium` hook and `PremiumUpsell` component. The test will fail until both exist. We'll create the hook first, then run.

- [ ] **Step 5: Create usePremium hook**

Create `src/app/hooks/usePremium.ts`:

```typescript
import { useState, useEffect } from 'react';
import { db } from '../../db/db';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const setting = await db.settings.get('premium');
        if (!cancelled) {
          setIsPremium(setting?.value === true);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { isPremium, loading };
}
```

- [ ] **Step 6: Create minimal PremiumUpsell for tests**

Create `src/app/components/premium/PremiumUpsell.tsx`:

```typescript
export const PremiumUpsell = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔮</div>
        <h1 className="text-2xl font-bold mb-4">Premium Аналитика</h1>
        <p className="text-muted-foreground mb-6">
          Разблокируйте 11 мощных функций аналитики: прогнозы, сравнения, 
          финансовое здоровье и AI-инсайты. Единоразовая покупка — навсегда.
        </p>
        <div className="grid grid-cols-2 gap-3 text-left mb-8">
          {[
            '🔮 ML-Прогнозы', '📊 Year-over-Year',
            '💚 Health Score', '🤖 AI-Отчёты',
            '📅 Calendar Heatmap', '🔄 What-If Симулятор',
            '📈 Тренды с сезонностью', '⚠️ Детектор проблем',
            '💰 Cash Flow прогноз', '💡 План улучшения',
            '🗣️ Спроси о финансах', '',
          ].filter(Boolean).map((f, i) => (
            <div key={i} className="text-sm flex items-center gap-1">
              <span>{f}</span>
            </div>
          ))}
        </div>
        <button className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-amber-600 transition-colors">
          Купить Premium — навсегда
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Единоразовый платёж. Без подписок. Все будущие обновления включены.
        </p>
      </div>
    </div>
  );
};
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/app/components/premium/PremiumGate.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/app/hooks/usePremium.ts src/app/components/premium/PremiumGate.tsx src/app/components/premium/PremiumGate.test.tsx src/app/components/premium/PremiumUpsell.tsx
git commit -m "feat: add PremiumGate component with usePremium hook and upsell page"
```

---

## Phase 3: Visualization Components

### Task 7: HealthScoreGauge Component

**Files:**
- Create: `src/app/components/premium/HealthScoreGauge.tsx`
- Create: `src/app/components/premium/HealthScoreGauge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/premium/HealthScoreGauge.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthScoreGauge } from './HealthScoreGauge';

describe('HealthScoreGauge', () => {
  it('displays the score number', () => {
    render(<HealthScoreGauge score={75} metrics={[]} />);
    expect(screen.getByText('75')).toBeDefined();
  });

  it('clamps score between 0 and 100', () => {
    render(<HealthScoreGauge score={150} metrics={[]} />);
    // Should display clamped value
    const el = screen.getByText('100');
    expect(el).toBeDefined();
  });

  it('shows label for score range', () => {
    const { rerender } = render(<HealthScoreGauge score={85} metrics={[]} />);
    expect(screen.getByText(/Отлично/i)).toBeDefined();

    rerender(<HealthScoreGauge score={55} metrics={[]} />);
    expect(screen.getByText(/Средне/i)).toBeDefined();

    rerender(<HealthScoreGauge score={25} metrics={[]} />);
    expect(screen.getByText(/Требует/i)).toBeDefined();
  });

  it('shows metric breakdown when metrics provided', () => {
    const metrics = [
      { name: 'Сбережения', value: 20, weight: 25, subscore: 80, label: '20%', status: 'good' as const },
      { name: 'Резерв', value: 3, weight: 20, subscore: 50, label: '3 мес.', status: 'warning' as const },
    ];
    render(<HealthScoreGauge score={68} metrics={metrics} />);
    expect(screen.getByText('Сбережения')).toBeDefined();
    expect(screen.getByText('Резерв')).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement HealthScoreGauge.tsx**

Create `src/app/components/premium/HealthScoreGauge.tsx`:

```typescript
import type { MetricResult } from '../../../lib/healthScore';

interface HealthScoreGaugeProps {
  score: number;
  metrics: MetricResult[];
}

function getLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'Отлично', color: 'text-emerald-500' };
  if (score >= 60) return { text: 'Хорошо', color: 'text-green-500' };
  if (score >= 40) return { text: 'Средне', color: 'text-amber-500' };
  if (score >= 20) return { text: 'Требует внимания', color: 'text-orange-500' };
  return { text: 'Критично', color: 'text-red-500' };
}

export const HealthScoreGauge = ({ score, metrics }: HealthScoreGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const label = getLabel(clamped);
  const angle = (clamped / 100) * 180; // 0..180 degrees (half circle)

  const statusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'bad': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Half-circle gauge */}
      <div className="relative w-48 h-24 overflow-hidden mb-2">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full"
          style={{
            background: `conic-gradient(from 180deg, #22c55e 0deg, #eab308 60deg, #f97316 120deg, #ef4444 180deg)`,
            mask: 'radial-gradient(circle at 50% 100%, transparent 55%, black 55%)',
            WebkitMask: 'radial-gradient(circle at 50% 100%, transparent 55%, black 55%)',
          }}
        />
        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-20 bg-white shadow-md origin-bottom transition-transform duration-700"
          style={{ transform: `translateX(-50%) rotate(${angle - 90}deg)` }}
        />
        {/* Center circle */}
        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow" />
      </div>

      <div className={`text-3xl font-bold ${label.color}`}>{clamped}</div>
      <div className={`text-sm font-medium ${label.color} mb-4`}>{label.text}</div>

      {/* Metric breakdown */}
      {metrics.length > 0 && (
        <div className="w-full space-y-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor(m.status)} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground truncate">{m.name}</span>
                  <span className="font-medium flex-shrink-0 ml-1">{m.subscore}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${statusColor(m.status)}`}
                    style={{ width: `${m.subscore}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/app/components/premium/HealthScoreGauge.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/components/premium/HealthScoreGauge.tsx src/app/components/premium/HealthScoreGauge.test.tsx
git commit -m "feat: add HealthScoreGauge component with half-circle gauge visualization"
```

---

### Task 8: WhatIfSimulator Component

**Files:**
- Create: `src/app/components/premium/WhatIfSimulator.tsx`
- Create: `src/app/components/premium/WhatIfSimulator.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/premium/WhatIfSimulator.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WhatIfSimulator } from './WhatIfSimulator';
import type { CategoryAnalytics } from '../../../db/analytics';

const mockCategories: CategoryAnalytics[] = [
  { categoryId: '1', categoryName: 'Кафе', amount: 15000, percent: 30, icon: 'Coffee', color: '#FF5722' },
  { categoryId: '2', categoryName: 'Продукты', amount: 25000, percent: 50, icon: 'ShoppingCart', color: '#4CAF50' },
  { categoryId: '3', categoryName: 'Транспорт', amount: 10000, percent: 20, icon: 'Bus', color: '#2196F3' },
];

describe('WhatIfSimulator', () => {
  it('renders sliders for top categories', () => {
    render(<WhatIfSimulator categories={mockCategories} totalIncome={100000} totalExpenses={50000} />);
    expect(screen.getByText('Кафе')).toBeDefined();
    expect(screen.getByText('Продукты')).toBeDefined();
    expect(screen.getByText('Транспорт')).toBeDefined();
  });

  it('shows monthly savings by default', () => {
    render(<WhatIfSimulator categories={mockCategories} totalIncome={100000} totalExpenses={50000} />);
    expect(screen.getByText(/Экономия/)).toBeDefined();
  });

  it('handles empty categories', () => {
    render(<WhatIfSimulator categories={[]} totalIncome={100000} totalExpenses={50000} />);
    expect(screen.getByText(/нет данных/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement WhatIfSimulator.tsx**

Create `src/app/components/premium/WhatIfSimulator.tsx`:

```typescript
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
              −{(reductions[cat.categoryId] || 0)}%
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
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
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/app/components/premium/WhatIfSimulator.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/components/premium/WhatIfSimulator.tsx src/app/components/premium/WhatIfSimulator.test.tsx
git commit -m "feat: add WhatIfSimulator component with interactive expense reduction sliders"
```

---

### Task 9: CalendarHeatmap Component

**Files:**
- Create: `src/app/components/premium/CalendarHeatmap.tsx`
- Create: `src/app/components/premium/CalendarHeatmap.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/premium/CalendarHeatmap.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarHeatmap } from './CalendarHeatmap';

const mockData = [
  { date: new Date(2026, 0, 1).getTime(), amount: 500 },
  { date: new Date(2026, 5, 15).getTime(), amount: 1500 },
  { date: new Date(2026, 11, 25).getTime(), amount: 3000 },
];

describe('CalendarHeatmap', () => {
  it('renders without crashing', () => {
    const { container } = render(<CalendarHeatmap year={2026} data={mockData} />);
    expect(container.querySelector('svg') || container.querySelector('div')).toBeTruthy();
  });

  it('shows year in title', () => {
    render(<CalendarHeatmap year={2026} data={mockData} />);
    expect(screen.getByText(/2026/)).toBeDefined();
  });

  it('handles empty data', () => {
    const { container } = render(<CalendarHeatmap year={2026} data={[]} />);
    expect(container).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement CalendarHeatmap.tsx**

Create `src/app/components/premium/CalendarHeatmap.tsx`:

```typescript
import { useMemo } from 'react';
import type { CalendarDay } from '../../../db/premium';

interface CalendarHeatmapProps {
  year: number;
  data: CalendarDay[];
}

const DAY_LABELS = ['', 'Пн', '', 'Ср', '', 'Пт', ''];
const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function getColor(amount: number, maxAmount: number): string {
  if (amount === 0) return 'bg-muted';
  const intensity = maxAmount > 0 ? amount / maxAmount : 0;
  if (intensity <= 0.25) return 'bg-emerald-200 dark:bg-emerald-900';
  if (intensity <= 0.5) return 'bg-emerald-400 dark:bg-emerald-700';
  if (intensity <= 0.75) return 'bg-emerald-600';
  return 'bg-emerald-800 dark:bg-emerald-400';
}

export const CalendarHeatmap = ({ year, data }: CalendarHeatmapProps) => {
  const { weeks, maxAmount } = useMemo(() => {
    const dataMap = new Map<number, number>();
    for (const d of data) {
      const day = new Date(d.date).setHours(0, 0, 0, 0);
      dataMap.set(day, (dataMap.get(day) || 0) + d.amount);
    }

    const maxA = Math.max(1, ...dataMap.values());

    // Build week grid for the year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const weeks: { label: string; days: { date: number; amount: number; inMonth: boolean }[] }[] = [];

    // Start from first Monday on or before Jan 1
    const startDay = yearStart.getDay(); // 0=Sun, 1=Mon...6=Sat
    const cursor = new Date(yearStart);
    cursor.setDate(cursor.getDate() - (startDay === 0 ? 6 : startDay - 1)); // Go back to Monday

    while (cursor.getTime() < yearEnd.getTime()) {
      const week: { label: string; days: { date: number; amount: number; inMonth: boolean }[] } = [];
      for (let d = 0; d < 7; d++) {
        const ts = cursor.getTime();
        week.push({
          date: ts,
          amount: dataMap.get(ts) || 0,
          inMonth: cursor.getMonth() === new Date(ts).getMonth() && cursor.getFullYear() === year,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push({ label: '', days: week });
    }

    return { weeks, maxAmount: maxA };
  }, [year, data]);

  return (
    <div>
      <h3 className="font-semibold mb-3">Расходы за {year}</h3>

      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="w-6 h-3 text-[10px] text-muted-foreground flex items-center justify-center">
              {l}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.days.map((day, di) => (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm ${getColor(day.inMonth ? day.amount : 0, maxAmount)}`}
                    title={day.inMonth
                      ? `${new Date(day.date).toLocaleDateString('ru-RU')}: ${Math.round(day.amount).toLocaleString('ru-RU')} ₽`
                      : ''}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Month labels */}
          <div className="flex gap-1 mt-1">
            {(() => {
              // Simplified: show month markers
              const labels: { text: string; offset: number }[] = [];
              for (let m = 0; m < 12; m++) {
                const firstDay = new Date(year, m, 1);
                const jan1 = new Date(year, 0, 1);
                const jan1Dow = jan1.getDay();
                const mondayOffset = jan1Dow === 0 ? 6 : jan1Dow - 1;
                const dayOfYear = Math.floor((firstDay.getTime() - jan1.getTime()) / 86400000);
                const weekIndex = Math.floor((dayOfYear + mondayOffset) / 7);
                labels.push({ text: MONTH_LABELS[m], offset: weekIndex });
              }
              return labels.map((l, i) => (
                <span
                  key={i}
                  className="text-[10px] text-muted-foreground"
                  style={{ marginLeft: i === 0 ? 0 : `${Math.max(0, (l.offset - (labels[i - 1]?.offset || 0)) * 17 - 12)}px` }}
                >
                  {l.text}
                </span>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 justify-end text-[10px] text-muted-foreground">
        <span>Меньше</span>
        <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
        <div className="w-3 h-3 rounded-sm bg-emerald-600" />
        <div className="w-3 h-3 rounded-sm bg-emerald-800 dark:bg-emerald-400" />
        <span>Больше</span>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/app/components/premium/CalendarHeatmap.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/components/premium/CalendarHeatmap.tsx src/app/components/premium/CalendarHeatmap.test.tsx
git commit -m "feat: add CalendarHeatmap component — GitHub-style expense visualization"
```

---

### Task 10: TrendDecomposition Component

**Files:**
- Create: `src/app/components/premium/TrendDecomposition.tsx`
- Create: `src/app/components/premium/TrendDecomposition.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/premium/TrendDecomposition.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendDecomposition } from './TrendDecomposition';

const mockData = {
  data: [{ date: Date.now(), amount: 1000 }],
  trend: [{ date: Date.now(), amount: 1000 }],
  seasonal: [{ date: Date.now(), amount: 50 }],
  residual: [{ date: Date.now(), amount: -50 }],
  weekdayEffect: [{ day: 0, value: 10, label: 'Вс' }],
};

describe('TrendDecomposition', () => {
  it('shows weekday effect section', () => {
    render(<TrendDecomposition data={mockData} />);
    expect(screen.getByText(/Дни недели/i)).toBeDefined();
  });

  it('handles empty data gracefully', () => {
    render(<TrendDecomposition data={{
      data: [], trend: [], seasonal: [], residual: [],
      weekdayEffect: Array.from({ length: 7 }, (_, i) => ({ day: i, value: 0, label: '' })),
    }} />);
    expect(screen.getByText(/недостаточно данных/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement TrendDecomposition.tsx**

Create `src/app/components/premium/TrendDecomposition.tsx`:

```typescript
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { DecompositionResult } from '../../../lib/seasonality';

interface TrendDecompositionProps {
  data: DecompositionResult;
}

function formatShort(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

export const TrendDecomposition = ({ data }: TrendDecompositionProps) => {
  if (data.data.length < 7) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Недостаточно данных для декомпозиции (нужно &ge; 7 дней)
      </div>
    );
  }

  const chartData = data.data.map((d, i) => ({
    date: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    Данные: Math.round(d.amount * 100) / 100,
    Тренд: Math.round(data.trend[i]?.amount * 100) / 100,
    Сезонность: Math.round((data.seasonal[i]?.amount || 0) * 100) / 100,
  }));

  return (
    <div>
      <h3 className="font-semibold mb-4">Декомпозиция тренда</h3>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gRaw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" fontSize={10} />
          <YAxis fontSize={10} tickFormatter={formatShort} width={40} />
          <Tooltip
            formatter={(v: number) => [`${Math.round(v).toLocaleString('ru-RU')} ₽`, '']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="Данные" stroke="#8884d8" fill="url(#gRaw)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="Тренд" stroke="#ef4444" fill="url(#gTrend)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Weekday effect */}
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Эффект дней недели</h4>
        <div className="flex gap-1">
          {data.weekdayEffect.map(wd => {
            const maxAbs = Math.max(...data.weekdayEffect.map(w => Math.abs(w.value)), 1);
            const barHeight = Math.max(2, (Math.abs(wd.value) / maxAbs) * 40);
            const isPositive = wd.value >= 0;
            return (
              <div key={wd.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {wd.value > 0 ? '+' : ''}{Math.round(wd.value)}
                </span>
                <div
                  className={`w-5 rounded-sm ${isPositive ? 'bg-red-400' : 'bg-green-400'}`}
                  style={{ height: `${barHeight}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{wd.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/app/components/premium/TrendDecomposition.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/components/premium/TrendDecomposition.tsx src/app/components/premium/TrendDecomposition.test.tsx
git commit -m "feat: add TrendDecomposition component with weekday effect visualization"
```

---

## Phase 4: Tab Panels + AI Panel

### Task 11: PredictiveTab Component

**Files:**
- Create: `src/app/components/premium/PredictiveTab.tsx`

- [ ] **Step 1: Implement PredictiveTab.tsx**

Create `src/app/components/premium/PredictiveTab.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Line, ComposedChart } from 'recharts';
import { motion } from 'motion/react';
import { getForecastData, getCashFlowForecast } from '../../../db/premium';
import { getExpensesByCategory } from '../../../db/analytics';
import { predictWithConfidence } from '../../../lib/forecasting';
import { WhatIfSimulator } from './WhatIfSimulator';
import type { CategoryAnalytics } from '../../../db/analytics';
import { MS_PER_DAY } from '../../constants';
import { EmptyState } from '../../components/EmptyState';

function formatShort(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(0);
}

export const PredictiveTab = () => {
  const [forecast, setForecast] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

      const [histData, cashFlowData, catData] = await Promise.all([
        getForecastData(90),
        getCashFlowForecast(3),
        getExpensesByCategory(monthStart, now),
      ]);

      if (cancelled) return;

      const fc = predictWithConfidence(histData, 30);

      const combinedForecast = [
        ...histData.map(d => ({
          date: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
          amount: Math.round(d.amount * 100) / 100,
          type: 'actual',
        })),
        ...fc.points.map(p => ({
          date: new Date(p.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
          amount: Math.round(p.predicted * 100) / 100,
          upper: Math.round(p.upper * 100) / 100,
          lower: Math.round(p.lower * 100) / 100,
          type: 'predicted',
        })),
      ];

      setForecast({ chartData: combinedForecast, confidence: fc.confidence });
      setCashFlow(cashFlowData.map(cf => ({
        ...cf,
        label: new Date(cf.date).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
      })));
      setCategories(catData);

      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. ML Forecast */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-1">ML-Прогноз расходов на 30 дней</h3>
          {forecast?.confidence !== undefined && (
            <p className="text-xs text-muted-foreground mb-3">
              Точность модели: {(forecast.confidence * 100).toFixed(0)}% (R²)
              {forecast.confidence < 0.5 && ' — низкая, нужно больше данных'}
            </p>
          )}
          {forecast?.chartData?.length > 0 ? (
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
                <Line dataKey="upper" stroke="transparent" dot={false} legendType="none" />
                <Line dataKey="lower" stroke="transparent" dot={false} legendType="none" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="ChartLine" title="Нет данных для прогноза" description="Добавьте транзакции за последние 90 дней" />
          )}
        </div>
      </motion.div>

      {/* 2. Cash Flow Forecast */}
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
            <EmptyState icon="TrendingUp" title="Нет данных для прогноза баланса" />
          )}
        </div>
      </motion.div>

      {/* 3. What-If Simulator */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-premium p-5">
          <WhatIfSimulator
            categories={categories}
            totalIncome={100000}
            totalExpenses={70000}
          />
        </div>
      </motion.div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/premium/PredictiveTab.tsx
git commit -m "feat: add PredictiveTab with ML forecast, cash flow, and what-if simulator"
```

---

### Task 12: ComparativeTab Component

**Files:**
- Create: `src/app/components/premium/ComparativeTab.tsx`

- [ ] **Step 1: Implement ComparativeTab.tsx**

Create `src/app/components/premium/ComparativeTab.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import { getYoYComparison, getCalendarYearData, type YoYResult, type CalendarDay } from '../../../db/premium';
import { getForecastData } from '../../../db/premium';
import { decompose } from '../../../lib/seasonality';
import { CalendarHeatmap } from './CalendarHeatmap';
import { TrendDecomposition } from './TrendDecomposition';
import { EmptyState } from '../../components/EmptyState';

function formatShort(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(0);
}

export const ComparativeTab = () => {
  const [yoy, setYoY] = useState<YoYResult | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [decomposition, setDecomposition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();

      const [yoyData, calData, histData] = await Promise.all([
        getYoYComparison(),
        getCalendarYearData(2026),
        getForecastData(90),
      ]);

      if (cancelled) return;

      setYoY(yoyData);
      setCalendarData(calData);
      setDecomposition(decompose(histData));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. Year-over-Year */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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

      {/* 2. Calendar Heatmap */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-premium p-5">
          <CalendarHeatmap year={2026} data={calendarData} />
        </div>
      </motion.div>

      {/* 3. Trend Decomposition */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-premium p-5">
          {decomposition ? (
            <TrendDecomposition data={decomposition} />
          ) : (
            <EmptyState icon="Activity" title="Нет данных для декомпозиции" />
          )}
        </div>
      </motion.div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/premium/ComparativeTab.tsx
git commit -m "feat: add ComparativeTab with YoY, calendar heatmap, and trend decomposition"
```

---

### Task 13: HealthTab + AIInsightsPanel Components

**Files:**
- Create: `src/app/components/premium/HealthTab.tsx`
- Create: `src/app/components/premium/AIInsightsPanel.tsx`
- Create: `src/app/components/premium/AIInsightsPanel.test.tsx`

- [ ] **Step 1: Implement HealthTab.tsx**

Create `src/app/components/premium/HealthTab.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getHealthScoreData, getProblemDetectorIssues, type DetectedIssue } from '../../../db/premium';
import { calculateHealthScore, type HealthScoreResult } from '../../../lib/healthScore';
import { HealthScoreGauge } from './HealthScoreGauge';
import { EmptyState } from '../../components/EmptyState';

export const HealthTab = () => {
  const [health, setHealth] = useState<HealthScoreResult | null>(null);
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [healthData, detectedIssues] = await Promise.all([
        getHealthScoreData(),
        getProblemDetectorIssues(),
      ]);
      if (cancelled) return;
      setHealth(calculateHealthScore(healthData));
      setIssues(detectedIssues);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. Health Score */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-4 text-center">Финансовое здоровье</h3>
          {health ? (
            <HealthScoreGauge score={health.score} metrics={health.metrics} />
          ) : (
            <EmptyState icon="Heart" title="Нет данных для расчёта" />
          )}
        </div>
      </motion.div>

      {/* 2. Recommendations */}
      {health && health.recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-premium p-5">
            <h3 className="font-semibold mb-3">План улучшения</h3>
            <div className="space-y-2">
              {health.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-muted rounded-xl">
                  <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Problem Detector */}
      {issues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card-premium p-5">
            <h3 className="font-semibold mb-3">Детектор проблем</h3>
            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border ${
                    issue.severity === 'danger'
                      ? 'border-red-500/20 bg-red-50 dark:bg-red-950/20'
                      : 'border-amber-500/20 bg-amber-50 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={issue.severity === 'danger' ? 'text-red-500' : 'text-amber-500'}>
                      {issue.severity === 'danger' ? '⚠️' : '⚡'}
                    </span>
                    <span className="font-medium text-sm">{issue.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">{issue.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Implement AIInsightsPanel.tsx**

Create `src/app/components/premium/AIInsightsPanel.tsx`:

```typescript
import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Sparkles, WifiOff } from 'lucide-react';
import { buildAIContext } from '../../../db/premium';

export const AIInsightsPanel = () => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx = await buildAIContext();
      const ctxStr = JSON.stringify(ctx, null, 2);

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Ты финансовый аналитик приложения Finly. Вот данные пользователя за неделю:\n\n${ctxStr}\n\nНапиши краткий отчёт (3-5 абзацев): главные тренды, сравнение с прошлым периодом, аномалии, предупреждения, советы по улучшению. Используй цифры из данных. Пиши на русском.`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error('AI сервис недоступен');
      const data = await response.json();
      setReport(data.content || 'Не удалось сгенерировать отчёт');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  const askQuestion = useCallback(async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const ctx = await buildAIContext();
      const ctxStr = JSON.stringify(ctx, null, 2);

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Ты финансовый аналитик. Вот данные пользователя:\n\n${ctxStr}\n\nВопрос пользователя: ${question}\n\nОтветь кратко и по делу, с конкретными цифрами. На русском.`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error('AI сервис недоступен');
      const data = await response.json();
      setAnswer(data.content || 'Не удалось получить ответ');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [question]);

  // Check online status
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    return (
      <div className="card-premium p-5 text-center">
        <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Для AI-инсайтов нужен интернет</p>
        <p className="text-xs text-muted-foreground mt-1">Остальная аналитика работает офлайн</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Report */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Еженедельный AI-отчёт
          </h3>
          {!report && !loading && (
            <button
              onClick={generateReport}
              className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
            >
              Сгенерировать отчёт
            </button>
          )}
          {loading && (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          )}
          {report && (
            <div className="prose prose-sm dark:prose-invert text-sm whitespace-pre-line">
              {report}
            </div>
          )}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      </motion.div>

      {/* Ask Question */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-3">Спроси о своих финансах</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Например: на чём я могу сэкономить?"
              className="flex-1 px-4 py-2 bg-muted rounded-xl text-sm outline-none border border-border focus:border-purple-500 transition-colors"
              onKeyDown={e => e.key === 'Enter' && askQuestion()}
            />
            <button
              onClick={askQuestion}
              disabled={loading || !question.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : '→'}
            </button>
          </div>
          {answer && (
            <div className="mt-4 p-3 bg-muted rounded-xl text-sm whitespace-pre-line">
              {answer}
            </div>
          )}
          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
```

- [ ] **Step 3: Write AIInsightsPanel test**

Create `src/app/components/premium/AIInsightsPanel.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIInsightsPanel } from './AIInsightsPanel';
import 'fake-indexeddb/auto';

describe('AIInsightsPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('shows generate report button initially', () => {
    render(<AIInsightsPanel />);
    expect(screen.getByText(/Сгенерировать отчёт/i)).toBeDefined();
  });

  it('shows question input', () => {
    render(<AIInsightsPanel />);
    expect(screen.getByPlaceholderText(/Например/i)).toBeDefined();
  });

  it('shows offline message when navigator.onLine is false', () => {
    vi.stubGlobal('navigator', { onLine: false });
    render(<AIInsightsPanel />);
    expect(screen.getByText(/нужен интернет/i)).toBeDefined();
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/components/premium/AIInsightsPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/premium/HealthTab.tsx src/app/components/premium/AIInsightsPanel.tsx src/app/components/premium/AIInsightsPanel.test.tsx
git commit -m "feat: add HealthTab and AIInsightsPanel components"
```

---

## Phase 5: Premium Analytics Screen + Routing

### Task 14: PremiumAnalytics Screen + Route

**Files:**
- Create: `src/app/screens/PremiumAnalytics.tsx`
- Create: `src/app/screens/PremiumAnalytics.test.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/components/BottomNav.tsx`

- [ ] **Step 1: Read BottomNav.tsx for navigation patterns**

Read `src/app/components/BottomNav.tsx` to understand the navigation item structure.

- [ ] **Step 2: Implement PremiumAnalytics.tsx**

Create `src/app/screens/PremiumAnalytics.tsx`:

```typescript
import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumGate } from '../components/premium/PremiumGate';
import { PredictiveTab } from '../components/premium/PredictiveTab';
import { ComparativeTab } from '../components/premium/ComparativeTab';
import { HealthTab } from '../components/premium/HealthTab';
import { AIInsightsPanel } from '../components/premium/AIInsightsPanel';

type Tab = 'predictive' | 'comparative' | 'health';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'predictive', label: 'Прогнозы', icon: '🔮' },
  { key: 'comparative', label: 'Сравнения', icon: '📊' },
  { key: 'health', label: 'Здоровье', icon: '💚' },
];

export const PremiumAnalytics = () => {
  const [tab, setTab] = useState<Tab>('predictive');
  const navigate = useNavigate();

  return (
    <PremiumGate>
      <div className="pb-28 bg-background min-h-screen">
        {/* Header */}
        <div className="px-5 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-[-0.01em] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Premium Аналитика
            </h1>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-white dark:bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5">
          {tab === 'predictive' && <PredictiveTab />}
          {tab === 'comparative' && <ComparativeTab />}
          {tab === 'health' && <HealthTab />}
        </div>

        {/* AI Insights (always visible, collapsible) */}
        <div className="px-5 mt-6">
          <AIInsightsPanel />
        </div>
      </div>
    </PremiumGate>
  );
};
```

- [ ] **Step 3: Add route**

In `src/app/routes.tsx`, add the premium route after the existing ai-assistant route:

```typescript
{ path: 'premium', lazy: lazyRoute(() => import('./screens/PremiumAnalytics'), 'PremiumAnalytics') },
```

- [ ] **Step 4: Write screen test**

Create `src/app/screens/PremiumAnalytics.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { PremiumAnalytics } from './PremiumAnalytics';

describe('PremiumAnalytics', () => {
  beforeEach(async () => {
    await db.settings.clear();
    // Enable premium for test
    await db.settings.put({ key: 'premium', value: true });
  });

  it('renders tab bar', async () => {
    render(
      <MemoryRouter>
        <PremiumAnalytics />
      </MemoryRouter>
    );
    expect(await screen.findByText('Прогнозы')).toBeDefined();
    expect(screen.getByText('Сравнения')).toBeDefined();
    expect(screen.getByText('Здоровье')).toBeDefined();
  });

  it('shows premium header', async () => {
    render(
      <MemoryRouter>
        <PremiumAnalytics />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Premium Аналитика/i)).toBeDefined();
  });
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/app/screens/PremiumAnalytics.test.tsx`
Expected: PASS

- [ ] **Step 6: Run all new tests**

Run: `npx vitest run src/lib/ src/db/premium.test.ts src/app/components/premium/ src/app/screens/PremiumAnalytics.test.tsx`
Expected: All PASS

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All existing tests still pass

- [ ] **Step 8: Commit**

```bash
git add src/app/screens/PremiumAnalytics.tsx src/app/screens/PremiumAnalytics.test.tsx src/app/routes.tsx
git commit -m "feat: add PremiumAnalytics screen with 3 tabs and routing"
```

---

### Task 15: Analytics Screen Integration

**Files:**
- Modify: `src/app/screens/Analytics.tsx`

- [ ] **Step 1: Add premium banner to Analytics screen**

In `src/app/screens/Analytics.tsx`, add a premium banner after the header section (after the period selector button) and before the summary cards:

```typescript
// Add at the top of the file:
import { usePremium } from '../hooks/usePremium';
import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles } from 'lucide-react';

// Inside the Analytics component, after existing hooks:
const { isPremium } = usePremium();
const navigate = useNavigate();
```

Add the banner component after the period selector button `</button>` and before `<motion.section custom={0}...>`:

```tsx
{/* Premium Banner */}
{!isPremium ? (
  <button
    onClick={() => navigate('/premium')}
    className="w-full mt-3 flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-colors"
  >
    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
      <Crown className="w-5 h-5 text-amber-500" />
    </div>
    <div className="flex-1 text-left">
      <div className="text-sm font-semibold">Premium Аналитика</div>
      <div className="text-xs text-muted-foreground">Прогнозы, сравнения, AI-отчёты</div>
    </div>
    <Sparkles className="w-4 h-4 text-amber-500" />
  </button>
) : (
  <button
    onClick={() => navigate('/premium')}
    className="w-full mt-3 flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-colors"
  >
    <Crown className="w-4 h-4 text-amber-500" />
    <span className="text-sm font-medium">Открыть Premium Аналитику</span>
    <span className="text-xs text-amber-600 ml-auto">🔮</span>
  </button>
)}
```

- [ ] **Step 2: Verify Analytics screen renders without errors**

Run: `npx vitest run src/app/screens/`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/screens/Analytics.tsx
git commit -m "feat: add premium analytics banner to Analytics screen"
```

---

## Verification Checklist

- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `npm run build` — production build succeeds
- [ ] `npm run lint` — no lint errors
- [ ] Manual: open browser, navigate to `/premium`, verify upsell appears
- [ ] Manual: set premium flag in IndexedDB, verify dashboard loads with 3 tabs
- [ ] Manual: verify all charts render with test data
- [ ] Manual: verify AI panel shows "generate report" button
- [ ] Manual: verify offline mode (AI panel shows offline message)
