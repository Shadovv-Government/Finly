import { describe, it, expect } from 'vitest';
import { linearRegression, predictWithConfidence } from './forecasting';

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

  it('handles empty historical data', () => {
    const result = predictWithConfidence([], 30);
    expect(result.points).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });
});
