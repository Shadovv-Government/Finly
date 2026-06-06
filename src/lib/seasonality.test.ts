import { describe, it, expect } from 'vitest';
import { decompose } from './seasonality';

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
