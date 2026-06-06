// src/lib/healthScore.ts
// Расчёт композитного Financial Health Score (0-100) из 6 метрик

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
  return Math.sqrt(variance) / mean;
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
