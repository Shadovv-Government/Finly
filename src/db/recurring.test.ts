import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

vi.mock('./db', () => ({
  db: {
    recurringTemplates: {
      filter: vi.fn(),
      update: vi.fn(),
    },
    transaction: vi.fn(),
    tables: [],
  },
}));

vi.mock('./operations', () => ({
  addTransaction: vi.fn(),
}));

import { db } from './db';
import { addTransaction } from './operations';
import { getNextDate, getDaysUntilDue, processDueTemplates } from './recurring';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date('2026-05-15T12:00:00.000Z').getTime();

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW });
  vi.clearAllMocks();

  (db.transaction as any).mockImplementation(async (...args: unknown[]) => {
    const callback = args.at(-1) as () => Promise<unknown>;
    return callback();
  });
});
afterEach(() => vi.useRealTimers());

// ─── getNextDate ──────────────────────────────────────────────────────────────

describe('getNextDate', () => {
  const base = new Date('2026-05-01T00:00:00.000Z').getTime();

  it('advances by 1 day for daily', () => {
    const next = getNextDate(base, 'daily');
    expect(next - base).toBe(MS_PER_DAY);
  });

  it('advances by 7 days for weekly', () => {
    const next = getNextDate(base, 'weekly');
    expect(next - base).toBe(7 * MS_PER_DAY);
  });

  it('advances by 1 month for monthly', () => {
    const next = getNextDate(base, 'monthly');
    const d = new Date(next);
    expect(d.getMonth()).toBe(new Date(base).getMonth() + 1);
    expect(d.getDate()).toBe(1);
  });

  it('advances by 1 year for yearly', () => {
    const next = getNextDate(base, 'yearly');
    expect(new Date(next).getFullYear()).toBe(2027);
  });

  it('result is always greater than input', () => {
    for (const interval of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
      expect(getNextDate(base, interval)).toBeGreaterThan(base);
    }
  });
});

// ─── getDaysUntilDue ──────────────────────────────────────────────────────────

describe('getDaysUntilDue', () => {
  it('returns 1 for a date 1 day in the future', () => {
    expect(getDaysUntilDue(FIXED_NOW + MS_PER_DAY)).toBe(1);
  });

  it('returns positive value for future date', () => {
    expect(getDaysUntilDue(FIXED_NOW + 7 * MS_PER_DAY)).toBeGreaterThan(0);
  });

  it('returns negative value for past date', () => {
    expect(getDaysUntilDue(FIXED_NOW - MS_PER_DAY)).toBeLessThan(0);
  });
});

// ─── processDueTemplates ──────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<{
  id: number;
  nextDate: number;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  categoryId: string;
}> = {}) {
  return {
    id: 1,
    amount: 500,
    type: 'expense' as const,
    categoryId: 'cat-1',
    interval: 'monthly' as const,
    nextDate: FIXED_NOW - MS_PER_DAY, // 1 day overdue by default
    isActive: true,
    ...overrides,
  };
}

function setupFilterMock(templates: ReturnType<typeof makeTemplate>[]) {
  (db.recurringTemplates.filter as any).mockReturnValue({
    toArray: vi.fn().mockResolvedValue(templates),
  });
}

describe('processDueTemplates', () => {
  beforeEach(() => {
    (db.recurringTemplates.update as any).mockResolvedValue(undefined);
    (addTransaction as any).mockResolvedValue(42);
  });

  it('creates a transaction for a single overdue template', async () => {
    setupFilterMock([makeTemplate()]);

    const result = await processDueTemplates();

    expect(addTransaction).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(1);
    expect(result.transactions).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('advances nextDate beyond now after processing', async () => {
    setupFilterMock([makeTemplate({ interval: 'monthly' })]);

    await processDueTemplates();

    const updateCall = (db.recurringTemplates.update as any).mock.calls[0];
    const updatedNextDate: number = updateCall[1].nextDate;
    expect(updatedNextDate).toBeGreaterThan(FIXED_NOW);
  });

  it('backfills 3 missed monthly payments', async () => {
    // Mar 1 → Apr 1 → May 1 (all ≤ May 15); Jun 1 > May 15 → stops. Exactly 3.
    const nextDate = new Date('2026-03-01T00:00:00.000Z').getTime();
    setupFilterMock([makeTemplate({ nextDate, interval: 'monthly' })]);

    const result = await processDueTemplates();

    expect(addTransaction).toHaveBeenCalledTimes(3);
    expect(result.transactions).toHaveLength(3);
  });

  it('does nothing when no templates are due', async () => {
    setupFilterMock([]);

    const result = await processDueTemplates();

    expect(addTransaction).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
  });

  it('records error and continues when addTransaction throws', async () => {
    setupFilterMock([makeTemplate({ id: 7 })]);
    (addTransaction as any).mockRejectedValue(new Error('DB write failed'));

    const result = await processDueTemplates();

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].templateId).toBe(7);
    expect(result.errors[0].error).toContain('DB write failed');
    expect(result.processed).toBe(0);
  });

  it('passes correct fields to addTransaction', async () => {
    const template = makeTemplate({ id: 3 });
    setupFilterMock([template]);

    await processDueTemplates();

    const call = (addTransaction as any).mock.calls[0][0];
    expect(call.amount).toBe(template.amount);
    expect(call.type).toBe(template.type);
    expect(call.categoryId).toBe(template.categoryId);
    expect(call.templateId).toBe(template.id);
  });

  it('processes multiple independent templates', async () => {
    setupFilterMock([
      makeTemplate({ id: 1 }),
      makeTemplate({ id: 2, categoryId: 'cat-2' }),
    ]);

    const result = await processDueTemplates();

    expect(result.processed).toBe(2);
    expect(addTransaction).toHaveBeenCalledTimes(2);
  });
});
