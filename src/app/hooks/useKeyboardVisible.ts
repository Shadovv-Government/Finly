import { useEffect, useState } from 'react';

/**
 * Detects whether the on-screen keyboard is open via the Visual Viewport API.
 * Returns true when the keyboard occupies more than 150px of vertical space.
 */
export const useKeyboardVisible = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handle = () => {
      const gap = window.innerHeight - vv.height;
      setKeyboardVisible(gap > 150);
    };

    vv.addEventListener('resize', handle);
    return () => vv.removeEventListener('resize', handle);
  }, []);

  return keyboardVisible;
};
