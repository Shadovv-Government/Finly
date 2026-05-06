import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('bootstrapApp', () => {
  beforeEach(() => {
    // JSDOM doesn't implement requestIdleCallback — run callback immediately
    vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 });
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the app before database seeding completes', async () => {
    const callOrder: string[] = [];
    const root = {
      render: vi.fn(() => {
        callOrder.push('render');
      }),
    };
    const seedDatabase = vi.fn(async () => {
      callOrder.push('seed:start');
      await Promise.resolve();
      callOrder.push('seed:end');
    });
    const App = () => null;

    const { bootstrapApp } = await import('./bootstrap');

    await bootstrapApp({
      root,
      App,
      seedDatabase,
    });

    // Flush microtasks so the fire-and-forget seedDatabase promise resolves
    await Promise.resolve();

    expect(seedDatabase).toHaveBeenCalledTimes(1);
    expect(root.render).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['render', 'seed:start', 'seed:end']);
  });
});
