import { describe, expect, it, vi } from 'vitest';

describe('bootstrapApp', () => {
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

    expect(seedDatabase).toHaveBeenCalledTimes(1);
    expect(root.render).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['render', 'seed:start', 'seed:end']);
  });
});
