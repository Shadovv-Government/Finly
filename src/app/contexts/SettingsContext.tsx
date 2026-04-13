import { createContext, useContext, useEffect, useState } from 'react';

interface SettingsContextType {
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    const stored = localStorage.getItem('finly-reduced-motion');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('finly-reduced-motion', String(reducedMotion));
  }, [reducedMotion]);

  return (
    <SettingsContext.Provider value={{ reducedMotion, setReducedMotion }}>
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
