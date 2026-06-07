import { createContext, useContext, useEffect, useState } from 'react';

interface SettingsContextType {
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  notifPush: boolean;
  setNotifPush: (value: boolean) => void;
  notifBudgets: boolean;
  setNotifBudgets: (value: boolean) => void;
  notifGoals: boolean;
  setNotifGoals: (value: boolean) => void;
  notifRecurring: boolean;
  setNotifRecurring: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function usePersistentBool(key: string, defaultValue = true) {
  const [value, setValue] = useState<boolean>(() => {
    const stored = localStorage.getItem(key);
    return stored === null ? defaultValue : stored === 'true';
  });
  useEffect(() => {
    localStorage.setItem(key, String(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reducedMotion, setReducedMotion] = usePersistentBool('finly-reduced-motion', false);
  const [notifPush, setNotifPush] = usePersistentBool('finly-notif-push', true);
  const [notifBudgets, setNotifBudgets] = usePersistentBool('finly-notif-budgets', true);
  const [notifGoals, setNotifGoals] = usePersistentBool('finly-notif-goals', true);
  const [notifRecurring, setNotifRecurring] = usePersistentBool('finly-notif-recurring', true);

  return (
    <SettingsContext.Provider value={{
      reducedMotion, setReducedMotion,
      notifPush, setNotifPush,
      notifBudgets, setNotifBudgets,
      notifGoals, setNotifGoals,
      notifRecurring, setNotifRecurring,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
