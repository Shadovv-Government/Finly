import React from 'react';

interface BootstrapAppOptions {
  root: {
    render: (node: React.ReactNode) => void;
  };
  App: React.ComponentType;
  seedDatabase: () => Promise<unknown>;
}

function scheduleIdle(fn: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(fn, { timeout: 3000 });
  } else {
    setTimeout(fn, 0);
  }
}

export async function bootstrapApp({ root, App, seedDatabase }: BootstrapAppOptions): Promise<void> {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  // Run after browser is idle so auth DB reads complete before seed write-lock
  scheduleIdle(() => {
    seedDatabase().catch((error) => {
      console.error('[seed] failed:', error);
    });
  });
}
