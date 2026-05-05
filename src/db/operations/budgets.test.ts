import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../db';
import { getActiveBudgets, addBudget, getBudget, deleteBudget } from './budgets';
import { Budget } from '../types';

vi.mock('../db', () => ({
  db: {
    budgets: {
      add: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      toArray: vi.fn(),
      filter: vi.fn(),
      where: vi.fn(),
    },
  },
}));

vi.mock('../validators', () => ({
  validateBudget: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  assertValid: vi.fn(),
}));

type BudgetTableMock = {
  add: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  toArray: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
};

const budgetTable = (): BudgetTableMock => db.budgets as unknown as BudgetTableMock;

// Freeze Date.now() so the predicate inside getActiveBudgets is deterministic.
const FROZEN = new Date('2026-05-01T12:00:00.000Z').getTime();

describe('getActiveBudgets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  const past: Budget   = { id: 1, categoryId: 'a', amount: 1000, period: 'month', startDate: FROZEN - 86400000, currency: 'RUB' };
  const exact: Budget  = { id: 2, categoryId: 'b', amount: 2000, period: 'month', startDate: FROZEN, currency: 'RUB' };
  const future: Budget = { id: 3, categoryId: 'c', amount: 3000, period: 'month', startDate: FROZEN + 86400000, currency: 'RUB' };

  function mockFilter(budgets: Budget[]) {
    budgetTable().filter.mockImplementation((fn: (b: Budget) => boolean) => ({
      toArray: vi.fn(() => Promise.resolve(budgets.filter(fn))),
    }));
  }

  it('возвращает бюджет со startDate в прошлом', async () => {
    mockFilter([past, future]);
    const result = await getActiveBudgets();
    expect(result.map(b => b.id)).toContain(1);
    expect(result.map(b => b.id)).not.toContain(3);
  });

  it('включает бюджет со startDate === now (граничный случай)', async () => {
    mockFilter([exact]);
    const result = await getActiveBudgets();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('исключает бюджет со startDate в будущем', async () => {
    mockFilter([past, exact, future]);
    const result = await getActiveBudgets();
    expect(result.map(b => b.id)).not.toContain(3);
  });

  it('возвращает пустой массив если нет активных бюджетов', async () => {
    mockFilter([future]);
    expect(await getActiveBudgets()).toHaveLength(0);
  });

  it('возвращает все бюджеты если все активны', async () => {
    mockFilter([past, exact]);
    const result = await getActiveBudgets();
    expect(result).toHaveLength(2);
  });
});

describe('addBudget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('сохраняет бюджет и возвращает id', async () => {
    budgetTable().add.mockResolvedValue(42);
    const budget: Omit<Budget, 'id'> = {
      categoryId: 'cat-food',
      amount: 15000,
      period: 'month',
      startDate: FROZEN,
      currency: 'RUB',
    };
    const id = await addBudget(budget);
    expect(id).toBe(42);
    expect(budgetTable().add).toHaveBeenCalledWith(budget);
  });
});

describe('getBudget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает undefined если не найден', async () => {
    budgetTable().get.mockResolvedValue(undefined);
    expect(await getBudget(999)).toBeUndefined();
  });

  it('возвращает бюджет по id', async () => {
    const budget: Budget = { id: 5, categoryId: 'cat-food', amount: 5000, period: 'month', startDate: FROZEN, currency: 'RUB' };
    budgetTable().get.mockResolvedValue(budget);
    expect(await getBudget(5)).toEqual(budget);
  });
});

describe('deleteBudget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('вызывает db.delete с нужным id', async () => {
    budgetTable().delete.mockResolvedValue(undefined);
    await deleteBudget(7);
    expect(budgetTable().delete).toHaveBeenCalledWith(7);
  });
});
