import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db', () => ({
  db: {
    users: {
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      orderBy: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { db } from '../db';
import { getCurrentUser, hasUser } from './users';

describe('users operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the most recently created user as current', async () => {
    const last = vi.fn().mockResolvedValue({
      id: 'new-user',
      name: 'Alex',
      createdAt: 2,
    });
    (db.users.orderBy as any).mockReturnValue({ last });

    const result = await getCurrentUser();

    expect(db.users.orderBy).toHaveBeenCalledWith('createdAt');
    expect(last).toHaveBeenCalled();
    expect(result?.id).toBe('new-user');
  });

  it('uses count instead of reading the full users table in hasUser', async () => {
    (db.users.count as any).mockResolvedValue(1);

    const result = await hasUser();

    expect(db.users.count).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
