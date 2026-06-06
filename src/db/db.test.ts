import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('FinlyDatabase schema versions', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('declares the full schema on every Dexie version', async () => {
    const storesCalls: Record<number, Record<string, string>> = {};

    vi.doMock('dexie', () => {
      class DexieMock {
        constructor(_name: string) {}

        version(versionNumber: number) {
          const self = {
            stores(schema: Record<string, string>) {
              storesCalls[versionNumber] = schema;
              return self;
            },
            upgrade(_fn: (tx: unknown) => Promise<void>) {
              return self;
            },
          };
          return self;
        }
      }

      return {
        __esModule: true,
        default: DexieMock,
        Dexie: DexieMock,
      };
    });

    await import('./db');

    const expectedTables = [
      'transactions',
      'categories',
      'budgets',
      'goals',
      'recurringTemplates',
      'settings',
      'aiPatterns',
      'users',
      'notifications',
    ];

    expect(Object.keys(storesCalls[1])).toEqual(expectedTables.slice(0, 7));
    expect(Object.keys(storesCalls[2])).toEqual(expectedTables.slice(0, 8));
    expect(Object.keys(storesCalls[3])).toEqual(expectedTables);
  });
});
