import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildFinancialSnapshot } from './contextBuilder';
import * as analytics from '../../db/analytics';

vi.mock('../../db/analytics', () => ({
  getBalanceByPeriod:    vi.fn(),
  getExpensesByCategory: vi.fn(),
  getAllBudgetsProgress:  vi.fn(),
  getGoalsProgress:      vi.fn(),
  getRecurringUpcoming:  vi.fn(),
  getSavingsRate:        vi.fn(),
}));

const m = analytics as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  m.getBalanceByPeriod.mockResolvedValue({
    income: 80000, expenses: 34800, balance: 45200,
    periodStart: 0, periodEnd: 1,
  });
  m.getExpensesByCategory.mockResolvedValue([
    { categoryId: '1', categoryName: 'Продукты', amount: 12400, percent: 35, icon: 'ShoppingBasket', color: '#f00' },
    { categoryId: '2', categoryName: 'Транспорт', amount: 5200, percent: 15, icon: 'Car', color: '#0f0' },
  ]);
  m.getAllBudgetsProgress.mockResolvedValue([
    { categoryId: '1', categoryName: 'Продукты', spent: 12400, limit: 15000, percent: 83, isOverBudget: false, icon: 'ShoppingBasket', color: '#f00' },
    { categoryId: '3', categoryName: 'Кафе', spent: 4100, limit: 4000, percent: 102, isOverBudget: true, icon: 'Coffee', color: '#00f' },
  ]);
  m.getGoalsProgress.mockResolvedValue([
    { id: 1, name: 'Отпуск', targetAmount: 60000, currentAmount: 18000, percent: 30, remaining: 42000, icon: 'Plane', color: '#00f', isActive: true },
  ]);
  m.getRecurringUpcoming.mockResolvedValue([
    { label: 'Spotify', amount: 299, daysUntil: 0 },
    { label: 'Аренда', amount: 30000, daysUntil: 12 },
  ]);
  m.getSavingsRate.mockResolvedValue({ income: 80000, expenses: 34800, saved: 45200, savingsRate: 56.5 });
});

describe('buildFinancialSnapshot', () => {
  it('includes balance line', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('45 200');
  });

  it('includes income and expenses', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('80 000');
    expect(snap).toContain('34 800');
  });

  it('includes savings rate', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('57%');
  });

  it('includes top spending categories', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('Продукты');
    expect(snap).toContain('Транспорт');
  });

  it('marks over-budget categories with [over]', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('Кафе');
    expect(snap).toContain('[over]');
  });

  it('includes active goals', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('Отпуск');
    expect(snap).toContain('30%');
  });

  it('formats upcoming payments with today label', async () => {
    const snap = await buildFinancialSnapshot();
    expect(snap).toContain('Spotify');
    expect(snap).toContain('сегодня');
  });

  it('omits goals section when no active goals', async () => {
    m.getGoalsProgress.mockResolvedValue([]);
    const snap = await buildFinancialSnapshot();
    expect(snap).not.toContain('Цели');
  });
});
