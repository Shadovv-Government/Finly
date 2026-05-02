import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBudgetNotifications } from './useBudgetNotifications';
import { getActiveBudgets } from '../../db/operations/budgets';
import { getExpensesByCategory } from '../../db/analytics';
import { getCategoriesByType } from '../../db/operations/categories';
import { addNotification, getAllNotifications } from '../../db/operations/notifications';
import {
  sendBudgetOverrunNotification,
  sendBudgetWarningNotification,
  hasPermission,
} from '../utils/notifications';
import { getPeriodRange } from './useAnalytics';

vi.mock('../../db/operations/budgets');
vi.mock('../../db/analytics');
vi.mock('../../db/operations/categories');
vi.mock('../../db/operations/notifications');
vi.mock('../utils/notifications');
vi.mock('./useAnalytics');

const mockHasPermission         = hasPermission            as ReturnType<typeof vi.fn>;
const mockGetActiveBudgets      = getActiveBudgets         as ReturnType<typeof vi.fn>;
const mockGetPeriodRange        = getPeriodRange           as ReturnType<typeof vi.fn>;
const mockGetExpensesByCategory = getExpensesByCategory    as ReturnType<typeof vi.fn>;
const mockGetCategoriesByType   = getCategoriesByType      as ReturnType<typeof vi.fn>;
const mockGetAllNotifications   = getAllNotifications       as ReturnType<typeof vi.fn>;
const mockAddNotification       = addNotification          as ReturnType<typeof vi.fn>;
const mockSendWarning           = sendBudgetWarningNotification as ReturnType<typeof vi.fn>;
const mockSendOverrun           = sendBudgetOverrunNotification as ReturnType<typeof vi.fn>;

const FROZEN = new Date('2026-05-01T12:00:00.000Z').getTime();
const BUDGET_AMOUNT = 10000;
const BUDGET = { id: 1, categoryId: 'cat-food', amount: BUDGET_AMOUNT, period: 'month', startDate: FROZEN - 1000 };
const CATEGORY = { id: 'cat-food', name: 'Еда', type: 'expense', icon: '🍔', color: '#f00', isSystem: false };

function setupMocks(spent: number, existingNotifications: object[] = []) {
  mockHasPermission.mockReturnValue(true);
  mockGetActiveBudgets.mockResolvedValue([BUDGET]);
  mockGetPeriodRange.mockReturnValue({ start: FROZEN - 30 * 86400000, end: FROZEN });
  mockGetExpensesByCategory.mockResolvedValue([
    { categoryId: 'cat-food', amount: spent, categoryName: 'Еда', percent: 100, icon: '🍔', color: '#f00' },
  ]);
  mockGetCategoriesByType.mockResolvedValue([CATEGORY]);
  mockGetAllNotifications.mockResolvedValue(existingNotifications);
  mockAddNotification.mockResolvedValue(1);
}

async function callCheckBudgets() {
  const { result } = renderHook(() => useBudgetNotifications());
  await act(() => result.current.checkBudgets());
}

describe('useBudgetNotifications — пороги срабатывания', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('ничего не делает если потрачено < 80%', async () => {
    setupMocks(7999); // 79.99%
    await callCheckBudgets();
    expect(mockSendWarning).not.toHaveBeenCalled();
    expect(mockSendOverrun).not.toHaveBeenCalled();
    expect(mockAddNotification).not.toHaveBeenCalled();
  });

  it('шлёт предупреждение при ровно 80%', async () => {
    setupMocks(8000); // 80%
    await callCheckBudgets();
    expect(mockSendWarning).toHaveBeenCalledOnce();
    expect(mockSendOverrun).not.toHaveBeenCalled();
    const saved = mockAddNotification.mock.calls[0][0];
    expect(saved.type).toBe('budget-warning');
    expect(saved.data.categoryId).toBe('cat-food');
  });

  it('шлёт предупреждение при 99%', async () => {
    setupMocks(9900);
    await callCheckBudgets();
    expect(mockSendWarning).toHaveBeenCalledOnce();
    expect(mockSendOverrun).not.toHaveBeenCalled();
  });

  it('шлёт перерасход при ровно 100%', async () => {
    setupMocks(10000);
    await callCheckBudgets();
    expect(mockSendOverrun).toHaveBeenCalledOnce();
    expect(mockSendWarning).not.toHaveBeenCalled();
    const saved = mockAddNotification.mock.calls[0][0];
    expect(saved.type).toBe('budget-overrun');
    expect(saved.data.categoryId).toBe('cat-food');
  });

  it('шлёт перерасход при > 100%', async () => {
    setupMocks(12000);
    await callCheckBudgets();
    expect(mockSendOverrun).toHaveBeenCalledOnce();
  });

  it('сохраняет in-app уведомление с нужными полями', async () => {
    setupMocks(10001);
    await callCheckBudgets();
    const saved = mockAddNotification.mock.calls[0][0];
    expect(saved.type).toBe('budget-overrun');
    expect(saved.title).toContain('превышен');
    expect(saved.read).toBe(false);
    expect(typeof saved.createdAt).toBe('number');
    expect(typeof saved.expiresAt).toBe('number');
  });
});

describe('useBudgetNotifications — дедупликация', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN);
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('не шлёт повторное уведомление если уже было за последние 24 ч', async () => {
    const recent = {
      type: 'budget-warning',
      data: { categoryId: 'cat-food' },
      createdAt: FROZEN - 3600000, // 1 час назад
    };
    setupMocks(8500, [recent]);
    await callCheckBudgets();
    expect(mockSendWarning).not.toHaveBeenCalled();
    expect(mockAddNotification).not.toHaveBeenCalled();
  });

  it('шлёт уведомление если последнее было > 24 ч назад', async () => {
    const old = {
      type: 'budget-warning',
      data: { categoryId: 'cat-food' },
      createdAt: FROZEN - 25 * 3600000, // 25 часов назад
    };
    setupMocks(8500, [old]);
    await callCheckBudgets();
    expect(mockSendWarning).toHaveBeenCalledOnce();
  });
});

describe('useBudgetNotifications — guard условия', () => {
  beforeEach(() => vi.clearAllMocks());

  it('не запрашивает бюджеты если нет разрешения на уведомления', async () => {
    mockHasPermission.mockReturnValue(false);
    await callCheckBudgets();
    expect(mockGetActiveBudgets).not.toHaveBeenCalled();
  });

  it('ничего не делает если нет активных бюджетов', async () => {
    mockHasPermission.mockReturnValue(true);
    mockGetActiveBudgets.mockResolvedValue([]);
    mockGetPeriodRange.mockReturnValue({ start: 0, end: FROZEN });
    mockGetExpensesByCategory.mockResolvedValue([]);
    mockGetCategoriesByType.mockResolvedValue([]);
    await callCheckBudgets();
    expect(mockSendWarning).not.toHaveBeenCalled();
    expect(mockSendOverrun).not.toHaveBeenCalled();
  });
});
