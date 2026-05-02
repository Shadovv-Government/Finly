import { describe, it, expect, afterEach, vi } from 'vitest';

vi.unmock('dexie');

import Dexie, { Table } from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

const V1 = {
  transactions:       '++id, date, categoryId, type, createdAt',
  categories:         'id, type, isSystem',
  budgets:            '++id, categoryId, period, startDate',
  goals:              '++id, isActive, deadline',
  recurringTemplates: '++id, nextDate, isActive',
  settings:           'key',
  aiPatterns:         '++id, pattern, categoryId',
};
const V2_ADDS = { users:         'id, createdAt' };
const V3_ADDS = { notifications: '++id, type, read, createdAt, expiresAt' };

let seq = 0;
const name = () => `finly-upgrade-${++seq}`;

const opts = () => ({ indexedDB: new IDBFactory(), IDBKeyRange } as any);

function v1DB(n: string, o: any) {
  const db = new Dexie(n, o);
  db.version(1).stores(V1);
  return db;
}

function v2DB(n: string, o: any) {
  const db = new Dexie(n, o);
  db.version(1).stores(V1);
  db.version(2).stores({ ...V1, ...V2_ADDS });
  return db;
}

function v3DB(n: string, o: any) {
  const db = new Dexie(n, o);
  db.version(1).stores(V1);
  db.version(2).stores({ ...V1, ...V2_ADDS });
  db.version(3).stores({ ...V1, ...V2_ADDS, ...V3_ADDS });
  return db;
}

const tableNames = (db: Dexie) => db.tables.map(t => t.name);

describe('FinlyDatabase — upgrade path', () => {
  const opened: Dexie[] = [];
  const track = (db: Dexie) => { opened.push(db); return db; };

  afterEach(() => {
    for (const db of opened) { try { db.close(); } catch (_) { /* already closed */ } }
    opened.length = 0;
  });

  it('v1: открывается с 7 таблицами базовой схемы', async () => {
    const db = track(v1DB(name(), opts()));
    await db.open();
    expect(db.verno).toBe(1);
    expect(tableNames(db)).toEqual(expect.arrayContaining(Object.keys(V1)));
    expect(tableNames(db)).not.toContain('users');
    expect(tableNames(db)).not.toContain('notifications');
    expect(tableNames(db)).toHaveLength(Object.keys(V1).length);
  });

  it('v1→v2: таблица users добавляется, данные транзакций сохраняются', async () => {
    const n = name();
    const o = opts();
    const SAMPLE_TX = { amount: 5000, type: 'expense', date: 1700000000000, categoryId: 'cat-1', rate: 1, currency: 'RUB', createdAt: 1700000000000 };

    const db1 = track(v1DB(n, o));
    await db1.open();
    await (db1.table('transactions') as Table<any>).add(SAMPLE_TX);
    db1.close();

    const db2 = track(v2DB(n, o));
    await db2.open();
    expect(db2.verno).toBe(2);
    expect(tableNames(db2)).toContain('users');
    expect(tableNames(db2)).toHaveLength(Object.keys(V1).length + 1);
    const txs = await db2.table('transactions').toArray();
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(5000);
  });

  it('v2→v3: таблица notifications добавляется, данные пользователей сохраняются', async () => {
    const n = name();
    const o = opts();

    const db2 = track(v2DB(n, o));
    await db2.open();
    await (db2.table('users') as Table<any>).add({ id: 'user-1', createdAt: 1700000000000 });
    db2.close();

    const db3 = track(v3DB(n, o));
    await db3.open();
    expect(db3.verno).toBe(3);
    expect(tableNames(db3)).toContain('notifications');
    expect(tableNames(db3)).toHaveLength(Object.keys(V1).length + 2);
    const users = await db3.table('users').toArray();
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('user-1');
  });

  it('v1→v3: прямой переход сохраняет данные и даёт все 9 таблиц', async () => {
    const n = name();
    const o = opts();

    const db1 = track(v1DB(n, o));
    await db1.open();
    await (db1.table('categories') as Table<any>).add({ id: 'cat-food', type: 'expense', name: 'Еда', isSystem: true });
    db1.close();

    const db3 = track(v3DB(n, o));
    await db3.open();
    expect(db3.verno).toBe(3);
    const all = [...Object.keys(V1), ...Object.keys(V2_ADDS), ...Object.keys(V3_ADDS)];
    expect(tableNames(db3)).toEqual(expect.arrayContaining(all));
    expect(tableNames(db3)).toHaveLength(all.length);
    const cats = await db3.table('categories').toArray();
    expect(cats[0].id).toBe('cat-food');
  });

  it('v3: notifications поддерживают запись и выборку по type', async () => {
    const db3 = track(v3DB(name(), opts()));
    await db3.open();
    const notifTable = db3.table('notifications');
    const id = await notifTable.add({ type: 'budget-warning', read: false, createdAt: 1700000000000, expiresAt: 1700086400000 });
    const byType = await notifTable.where('type').equals('budget-warning').toArray();
    expect(byType).toHaveLength(1);
    expect(byType[0].id).toBe(id);
    expect(byType[0].read).toBe(false);
  });
});
