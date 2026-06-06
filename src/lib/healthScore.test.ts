import { describe, it, expect } from 'vitest';
import { calculateHealthScore, type HealthScoreInput } from './healthScore';

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
      totalExpenses: 50_000,
      essentialExpenses: 25_000,
      monthlyIncomes: [100_000, 100_000, 100_000, 100_000, 100_000, 100_000],
      freeBalance: 600_000,
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
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('gives low score for poor finances', () => {
    const input: HealthScoreInput = {
      totalIncome: 100_000,
      totalExpenses: 95_000,
      essentialExpenses: 80_000,
      monthlyIncomes: [100_000, 50_000, 150_000, 0, 200_000, 100_000],
      freeBalance: 10_000,
      avgMonthlyExpenses: 95_000,
      categoryExpenses: [
        { categoryId: 'a', amount: 90000 },
        { categoryId: 'b', amount: 5000 },
      ],
      debtExpenses: 40_000,
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
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('no debt categories = perfect debt subscore', () => {
    const result = calculateHealthScore(baseInput);
    const debtMetric = result.metrics.find(m => m.name === 'Долговая нагрузка')!;
    expect(debtMetric.subscore).toBe(100);
  });
});
