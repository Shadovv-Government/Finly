import { createContext, useCallback, useContext } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface PWAUpdateContextValue {
  needRefresh: boolean;
  updateApp: () => void;
}

const PWAUpdateContext = createContext<PWAUpdateContextValue | undefined>(undefined);

export function PWAUpdateProvider({ children }: { children: React.ReactNode }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const updateApp = useCallback(() => updateServiceWorker(true), [updateServiceWorker]);

  return (
    <PWAUpdateContext.Provider value={{ needRefresh, updateApp }}>
      {children}
    </PWAUpdateContext.Provider>
  );
}

export function usePWAUpdate() {
  const ctx = useContext(PWAUpdateContext);
  if (!ctx) throw new Error('usePWAUpdate must be used within PWAUpdateProvider');
  return ctx;
}
