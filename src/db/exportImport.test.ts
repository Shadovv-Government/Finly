import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({
  db: {
    transactions: {
      toArray: vi.fn(),
      add: vi.fn(),
    },
    categories: {
      toArray: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
    },
    budgets: {
      add: vi.fn(),
    },
    goals: {
      add: vi.fn(),
    },
    recurringTemplates: {
      add: vi.fn(),
    },
    settings: {
      put: vi.fn(),
      get: vi.fn(),
    },
    aiPatterns: {
      add: vi.fn(),
    },
    transaction: vi.fn(),
  },
}));

vi.mock('./validators', () => ({
  validateTransaction: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  validateCategory: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  validateBudget: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  validateGoal: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  validateRecurringTemplate: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  validateAIPattern: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
}));

import { db } from './db';
import { exportToCSV, importData, importFromFile } from './exportImport';

describe('exportImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (db.transaction as any).mockImplementation(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      return callback();
    });
  });

  it('sanitizes CSV cells that could trigger spreadsheet formulas', async () => {
    (db.transactions.toArray as any).mockResolvedValue([
      {
        id: 1,
        amount: 1200,
        type: 'expense',
        categoryId: 'cat-1',
        date: Date.parse('2026-04-22T10:00:00Z'),
        comment: '=cmd|\' /C calc\'!A0',
        currency: 'RUB',
        rate: 1,
        createdAt: Date.now(),
      },
    ]);
    (db.categories.toArray as any).mockResolvedValue([
      {
        id: 'cat-1',
        name: '+Danger',
      },
    ]);

    const csv = await exportToCSV();

    expect(csv).toContain('"'+ "'+Danger" +'"');
    expect(csv).toContain('"'+ "'=cmd|' /C calc'!A0" +'"');
  });

  it('wraps import in a transaction and reports failure without partial success counts', async () => {
    (db.categories.toArray as any).mockResolvedValue([]);
    (db.categories.add as any).mockResolvedValue(undefined);
    (db.categories.get as any).mockResolvedValue({
      id: 'cat-1',
      name: 'Продукты',
    });
    (db.transactions.add as any).mockRejectedValue(new Error('write failed'));

    const result = await importData({
      version: '1.0',
      exportedAt: Date.now(),
      categories: [
        {
          id: 'cat-1',
          name: 'Продукты',
          type: 'expense',
          icon: 'ShoppingCart',
          color: '#22c55e',
          isSystem: false,
        },
      ],
      transactions: [
        {
          amount: 100,
          type: 'expense',
          categoryId: 'cat-1',
          date: Date.now(),
          currency: 'RUB',
          rate: 1,
          createdAt: Date.now(),
        },
      ],
      budgets: [],
      goals: [],
      recurringTemplates: [],
      settings: [],
      aiPatterns: [],
    });

    expect(db.transaction).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.imported.categories).toBe(0);
    expect(result.imported.transactions).toBe(0);
    expect(result.errors.some(error => error.includes('write failed'))).toBe(true);
  });

  it('rejects oversized import files before reading them', async () => {
    const file = new File(['{}'], 'large.json', { type: 'application/json' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

    const result = await importFromFile(file);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('File is too large');
  });
});
