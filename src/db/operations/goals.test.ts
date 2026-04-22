import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db', () => ({
  db: {
    goals: {
      add: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      toArray: vi.fn(),
      filter: vi.fn(),
    },
    transactions: {
      add: vi.fn(),
    },
    transaction: vi.fn(),
  },
}));

vi.mock('../validators', () => ({
  validateGoal: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  assertValid: vi.fn(),
}));

vi.mock('./categories', () => ({
  getCategories: vi.fn(),
  addCategory: vi.fn(),
  updateCategory: vi.fn(),
}));

import { db } from '../db';
import { createGoalContribution } from './goals';
import { getCategories } from './categories';

describe('goals operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (db.transaction as any).mockImplementation(async (...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<unknown>;
      return callback();
    });
  });

  it('uses the goal amount read inside the transaction when creating a contribution', async () => {
    (db.goals.get as any)
      .mockResolvedValueOnce({
        id: 1,
        name: 'Подушка',
        currentAmount: 100,
        color: '#22c55e',
      })
      .mockResolvedValueOnce({
        id: 1,
        name: 'Подушка',
        currentAmount: 250,
        color: '#22c55e',
      });
    (getCategories as any).mockResolvedValue([
      {
        id: 'goals',
        name: 'Цели',
        type: 'expense',
        color: '#22c55e',
      },
    ]);

    await createGoalContribution(1, 50);

    expect(db.goals.update).toHaveBeenCalledWith(1, { currentAmount: 300 });
  });
});
