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
      toArray: vi.fn(),
      add: vi.fn(),
    },
    goals: {
      toArray: vi.fn(),
      add: vi.fn(),
    },
    recurringTemplates: {
      toArray: vi.fn(),
      add: vi.fn(),
    },
    settings: {
      toArray: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
    },
    aiPatterns: {
      toArray: vi.fn(),
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
import { exportData, exportToCSV, importData, importFromFile } from './exportImport';

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
    expect(result.errors[0]).toContain('Файл слишком большой');
  });
});

// ─── exportData ───────────────────────────────────────────────────────────────

describe('exportData', () => {
  beforeEach(() => {
    (db.transactions.toArray as any).mockResolvedValue([]);
    (db.categories.toArray as any).mockResolvedValue([]);
    (db.budgets.toArray as any).mockResolvedValue([]);
    (db.goals.toArray as any).mockResolvedValue([]);
    (db.recurringTemplates.toArray as any).mockResolvedValue([]);
    (db.settings.toArray as any).mockResolvedValue([]);
    (db.aiPatterns.toArray as any).mockResolvedValue([]);
  });

  it('sets version to "1.0"', async () => {
    const data = await exportData();
    expect(data.version).toBe('1.0');
  });

  it('sets exportedAt to a recent timestamp', async () => {
    const before = Date.now();
    const data = await exportData();
    expect(data.exportedAt).toBeGreaterThanOrEqual(before);
    expect(data.exportedAt).toBeLessThanOrEqual(Date.now());
  });

  it('excludes biometric settings from export', async () => {
    (db.settings.toArray as any).mockResolvedValue([
      { key: 'theme', value: 'dark' },
      { key: 'biometric_enabled', value: true },
      { key: 'biometric_credential_id', value: 'abc123' },
      { key: 'baseCurrency', value: 'RUB' },
    ]);

    const data = await exportData();
    const keys = data.settings.map(s => s.key);

    expect(keys).toContain('theme');
    expect(keys).toContain('baseCurrency');
    expect(keys).not.toContain('biometric_enabled');
    expect(keys).not.toContain('biometric_credential_id');
  });
});

// ─── importData – version checks ──────────────────────────────────────────────

describe('importData – version checks', () => {
  const basePayload = {
    exportedAt: Date.now(),
    categories: [],
    transactions: [],
    budgets: [],
    goals: [],
    recurringTemplates: [],
    settings: [],
    aiPatterns: [],
  };

  beforeEach(() => {
    (db.categories.toArray as any).mockResolvedValue([]);
  });

  it('adds warning when version field is absent', async () => {
    const result = await importData({ ...basePayload } as any);
    expect(result.warnings.some(w => w.includes('Версия файла не указана'))).toBe(true);
  });

  it('adds warning for unsupported version', async () => {
    const result = await importData({ ...basePayload, version: '9.9' });
    expect(result.warnings.some(w => w.includes('9.9'))).toBe(true);
  });

  it('does not warn for supported version "1.0"', async () => {
    const result = await importData({ ...basePayload, version: '1.0' });
    expect(result.warnings.some(w => w.includes('Версия'))).toBe(false);
  });
});

// ─── importData – merge & filter options ─────────────────────────────────────

describe('importData – merge and filter options', () => {
  beforeEach(() => {
    (db.categories.toArray as any).mockResolvedValue([]);
    (db.categories.add as any).mockResolvedValue(undefined);
    (db.categories.update as any).mockResolvedValue(undefined);
    (db.categories.get as any).mockResolvedValue({ id: 'cat-1', name: 'Еда' });
    (db.transactions.add as any).mockResolvedValue(undefined);
    (db.settings.put as any).mockResolvedValue(undefined);
    (db.settings.get as any).mockResolvedValue(undefined);
  });

  it('skips existing category when mergeCategories: false and adds warning', async () => {
    (db.categories.toArray as any).mockResolvedValue([
      { id: 'cat-1', name: 'Еда', type: 'expense', icon: 'ShoppingCart', color: '#22c55e', isSystem: false },
    ]);

    const result = await importData(
      {
        version: '1.0',
        exportedAt: Date.now(),
        categories: [{ id: 'cat-1', name: 'Еда', type: 'expense', icon: 'ShoppingCart', color: '#22c55e', isSystem: false }],
        transactions: [],
        budgets: [],
        goals: [],
        recurringTemplates: [],
        settings: [],
        aiPatterns: [],
      },
      { mergeCategories: false },
    );

    expect(db.categories.add).not.toHaveBeenCalled();
    expect(db.categories.update).not.toHaveBeenCalled();
    expect(result.warnings.some(w => w.includes('уже существует'))).toBe(true);
  });

  it('skips unknown setting key and warns', async () => {
    const result = await importData({
      version: '1.0',
      exportedAt: Date.now(),
      categories: [],
      transactions: [],
      budgets: [],
      goals: [],
      recurringTemplates: [],
      settings: [{ key: 'unknownSetting', value: 'x' }],
      aiPatterns: [],
    });

    expect(result.warnings.some(w => w.includes('unknownSetting'))).toBe(true);
    expect(db.settings.put).not.toHaveBeenCalled();
  });

  it('skips biometric setting key and warns', async () => {
    const result = await importData({
      version: '1.0',
      exportedAt: Date.now(),
      categories: [],
      transactions: [],
      budgets: [],
      goals: [],
      recurringTemplates: [],
      settings: [{ key: 'biometric_enabled', value: true }],
      aiPatterns: [],
    });

    expect(result.warnings.some(w => w.toLowerCase().includes('биометрическ'))).toBe(true);
    expect(db.settings.put).not.toHaveBeenCalled();
  });
});

// ─── exportData → importData round-trip ──────────────────────────────────────

describe('exportData → importData round-trip', () => {
  const cat = { id: 'cat-rt', name: 'Транспорт', type: 'expense' as const, icon: 'Car', color: '#3b82f6', isSystem: false };
  const tx = { amount: 500, type: 'expense' as const, categoryId: 'cat-rt', date: 1746057600000, currency: 'RUB', rate: 1, createdAt: 1746057600000 };

  beforeEach(() => {
    // exportData phase
    (db.transactions.toArray as any).mockResolvedValue([tx]);
    (db.categories.toArray as any).mockResolvedValue([cat]);
    (db.budgets.toArray as any).mockResolvedValue([]);
    (db.goals.toArray as any).mockResolvedValue([]);
    (db.recurringTemplates.toArray as any).mockResolvedValue([]);
    (db.settings.toArray as any).mockResolvedValue([{ key: 'theme', value: 'dark' }]);
    (db.aiPatterns.toArray as any).mockResolvedValue([]);

    // importData phase
    (db.categories.add as any).mockResolvedValue(undefined);
    (db.categories.update as any).mockResolvedValue(undefined);
    (db.categories.get as any).mockResolvedValue(cat);
    (db.transactions.add as any).mockResolvedValue(undefined);
    (db.settings.put as any).mockResolvedValue(undefined);
  });

  it('imports all exported categories and transactions with no errors', async () => {
    const exported = await exportData();

    // After export, reset toArray for importData's internal category-existence check
    (db.categories.toArray as any).mockResolvedValue([]);

    const result = await importData(exported);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.imported.categories).toBe(1);
    expect(result.imported.transactions).toBe(1);
    expect(result.imported.settings).toBe(1);
  });

  it('exported JSON round-trips through JSON.stringify/parse without data loss', async () => {
    const exported = await exportData();
    const parsed = JSON.parse(JSON.stringify(exported));

    expect(parsed.version).toBe(exported.version);
    expect(parsed.transactions[0].amount).toBe(tx.amount);
    expect(parsed.categories[0].id).toBe(cat.id);
  });
});
