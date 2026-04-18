/**
 * Setup файл для тестов
 * Глобальные моки и настройки окружения
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Очистка после каждого теста
afterEach(() => {
  cleanup();
});

// Мок для IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => Promise.resolve({
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        add: vi.fn(() => Promise.resolve(1)),
        get: vi.fn(() => Promise.resolve(undefined)),
        getAll: vi.fn(() => Promise.resolve([])),
        update: vi.fn(() => Promise.resolve(true)),
        delete: vi.fn(() => Promise.resolve()),
        put: vi.fn(() => Promise.resolve(1)),
        count: vi.fn(() => Promise.resolve(0)),
        clear: vi.fn(() => Promise.resolve()),
        index: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve(undefined)),
          getAll: vi.fn(() => Promise.resolve([])),
          count: vi.fn(() => Promise.resolve(0)),
        })),
      })),
    })),
    close: vi.fn(),
  })),
};

// Мок для window.indexedDB
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Мок для Dexie
vi.mock('dexie', () => {
  const createTable = () => ({
    add: vi.fn(() => Promise.resolve(1)),
    get: vi.fn(() => Promise.resolve(undefined)),
    getAll: vi.fn(() => Promise.resolve([])),
    update: vi.fn(() => Promise.resolve(true)),
    delete: vi.fn(() => Promise.resolve()),
    put: vi.fn(() => Promise.resolve(1)),
    count: vi.fn(() => Promise.resolve(0)),
    clear: vi.fn(() => Promise.resolve()),
    toArray: vi.fn(() => Promise.resolve([])),
    filter: vi.fn(() => ({
      toArray: vi.fn(() => Promise.resolve([])),
    })),
    where: vi.fn(() => ({
      equals: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([])),
        first: vi.fn(() => Promise.resolve(undefined)),
      })),
      between: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([])),
      })),
      above: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([])),
      })),
    })),
    orderBy: vi.fn(() => ({
      reverse: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([])),
      })),
    })),
  });

  class Dexie {
    transactions = createTable();
    categories = createTable();
    budgets = createTable();
    goals = createTable();
    recurringTemplates = createTable();
    settings = createTable();
    aiPatterns = createTable();
    users = createTable();
    notifications = createTable();

    version = vi.fn().mockReturnThis();
    stores = vi.fn().mockReturnThis();
    open = vi.fn(() => Promise.resolve());
    close = vi.fn();
    delete = vi.fn(() => Promise.resolve());
    table = vi.fn(() => createTable());
  }
  
  return {
    default: Dexie,
    Dexie,
    Table: vi.fn(),
  };
});

// Мок для matchMedia (нужен для некоторых UI компонентов)
Object.defineProperty(global, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Мок для ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Мок для window.scrollTo
global.scrollTo = vi.fn();

// Мок для localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  clear() {
    this.store = {};
  },
  getItem(key: string) {
    return this.store[key] || null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  key(index: number) {
    return Object.keys(this.store)[index] || null;
  },
  get length() {
    return Object.keys(this.store).length;
  },
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Мок для sessionStorage
Object.defineProperty(global, 'sessionStorage', {
  value: { ...localStorageMock },
  writable: true,
});

// Подавление ошибок консоли в тестах (можно включить для отладки)
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// };
