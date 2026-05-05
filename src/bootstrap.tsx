import React from 'react';

interface BootstrapAppOptions {
  root: {
    render: (node: React.ReactNode) => void;
  };
  App: React.ComponentType;
  seedDatabase: () => Promise<unknown>;
}

export async function bootstrapApp({ root, App, seedDatabase }: BootstrapAppOptions): Promise<void> {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  seedDatabase().catch((error) => {
    console.error('[seed] failed:', error);
  });
}
