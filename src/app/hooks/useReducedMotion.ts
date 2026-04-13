import { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export const useReducedMotion = () => {
  const { reducedMotion } = useSettings();

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }

    return () => {
      document.documentElement.classList.remove('reduced-motion');
    };
  }, [reducedMotion]);
};
