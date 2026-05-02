import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fmt, extractPeriod, shiftPeriodBack, MS_PER_DAY } from './nlpParser';

// Fixed reference time: 2026-05-15 12:00:00 UTC (Friday, mid-month)
const FIXED_NOW = new Date('2026-05-15T12:00:00.000Z').getTime();

beforeEach(() => vi.useFakeTimers({ now: FIXED_NOW }));
afterEach(() => vi.useRealTimers());

// ─── fmt ──────────────────────────────────────────────────────────────────────

// Normalize Unicode space variants (e.g. narrow no-break space U+202F from ru-RU locale)
const norm = (s: string) => s.replace(/\s/g, ' ');

describe('fmt', () => {
  it('formats integers with Russian locale separators', () => {
    expect(norm(fmt(1234567))).toBe('1 234 567');
  });

  it('rounds to zero decimal places', () => {
    expect(norm(fmt(1234.9))).toBe('1 235');
  });

  it('formats zero', () => {
    expect(fmt(0)).toBe('0');
  });
});

// ─── extractPeriod ────────────────────────────────────────────────────────────

describe('extractPeriod', () => {
  const now = new Date(FIXED_NOW);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  it('returns today for "сегодня"', () => {
    const p = extractPeriod('сколько потратил сегодня');
    expect(p.key).toBe('today');
    expect(p.start).toBe(todayStart);
    expect(p.label).toBe('Сегодня');
  });

  it('returns yesterday for "вчера"', () => {
    const p = extractPeriod('расходы вчера');
    expect(p.key).toBe('yesterday');
    expect(p.start).toBe(todayStart - MS_PER_DAY);
    expect(p.end).toBe(todayStart - 1);
    expect(p.label).toBe('Вчера');
  });

  it('returns last-week for "прошлой неделе"', () => {
    const p = extractPeriod('расходы на прошлой неделе');
    expect(p.key).toBe('last-week');
    expect(p.label).toBe('На прошлой неделе');
  });

  it('returns week for "за неделю"', () => {
    const p = extractPeriod('расходы за неделю');
    expect(p.key).toBe('week');
    expect(p.label).toBe('За неделю');
  });

  it('returns week for "последнюю неделю"', () => {
    const p = extractPeriod('за последнюю неделю');
    expect(p.key).toBe('week');
  });

  it('returns 3m for "3 месяца"', () => {
    const p = extractPeriod('за 3 месяца');
    expect(p.key).toBe('3m');
    expect(p.label).toBe('За 3 месяца');
  });

  it('returns 3m for "квартал"', () => {
    const p = extractPeriod('за квартал');
    expect(p.key).toBe('3m');
  });

  it('returns 6m for "6 месяцев"', () => {
    const p = extractPeriod('за 6 месяцев');
    expect(p.key).toBe('6m');
    expect(p.label).toBe('За 6 месяцев');
  });

  it('returns 6m for "полгода"', () => {
    const p = extractPeriod('за полгода');
    expect(p.key).toBe('6m');
  });

  it('returns last-month for "в прошлом месяце"', () => {
    const p = extractPeriod('расходы в прошлом месяце');
    expect(p.key).toBe('last-month');
    expect(p.label).toBe('В прошлом месяце');
    expect(p.end).toBe(monthStart - 1);
  });

  it('returns last-month for "прошлого месяца"', () => {
    const p = extractPeriod('расходы прошлого месяца');
    expect(p.key).toBe('last-month');
  });

  it('defaults to current month when no period keyword present', () => {
    const p = extractPeriod('сколько я потратил');
    expect(p.key).toBe('month');
    expect(p.start).toBe(monthStart);
    expect(p.label).toBe('В этом месяце');
  });

  it('start < end for all patterns', () => {
    const queries = [
      'сегодня', 'вчера', 'прошлой неделе', 'за неделю',
      '3 месяца', '6 месяцев', 'в прошлом месяце', 'сколько потратил',
    ];
    for (const q of queries) {
      const p = extractPeriod(q);
      expect(p.start).toBeLessThan(p.end);
    }
  });
});

// ─── shiftPeriodBack ──────────────────────────────────────────────────────────

describe('shiftPeriodBack', () => {
  it('shifts today → day-before (позавчера)', () => {
    const today = extractPeriod('сегодня');
    const shifted = shiftPeriodBack(today);
    expect(shifted.key).toBe('day-before');
    expect(shifted.label).toBe('Позавчера');
  });

  it('shifts yesterday → day-before', () => {
    const yesterday = extractPeriod('вчера');
    const shifted = shiftPeriodBack(yesterday);
    expect(shifted.key).toBe('day-before');
  });

  it('shifts week → last-week', () => {
    const week = extractPeriod('за неделю');
    const shifted = shiftPeriodBack(week);
    expect(shifted.key).toBe('last-week');
    expect(shifted.label).toBe('На прошлой неделе');
  });

  it('shifts month → last-month', () => {
    const month = extractPeriod('сколько потратил');
    const shifted = shiftPeriodBack(month);
    expect(shifted.key).toBe('last-month');
    expect(shifted.label).toBe('В прошлом месяце');
  });

  it('shifts last-month → 2m-ago', () => {
    const lastMonth = extractPeriod('в прошлом месяце');
    const shifted = shiftPeriodBack(lastMonth);
    expect(shifted.key).toBe('2m-ago');
    expect(shifted.label).toBe('Два месяца назад');
  });

  it('passes through unknown keys unchanged', () => {
    const custom = extractPeriod('за 3 месяца'); // key = '3m', no shift rule
    const shifted = shiftPeriodBack(custom);
    expect(shifted.key).toBe('3m');
    expect(shifted.start).toBe(custom.start);
  });

  it('shifted period has start < end', () => {
    const queries = ['сегодня', 'вчера', 'за неделю', 'сколько потратил', 'в прошлом месяце'];
    for (const q of queries) {
      const p = shiftPeriodBack(extractPeriod(q));
      expect(p.start).toBeLessThan(p.end);
    }
  });
});
