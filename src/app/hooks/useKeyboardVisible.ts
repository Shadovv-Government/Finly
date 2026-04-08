import { useEffect, useState } from 'react';

/**
 * Returns the current on-screen keyboard height in pixels (0 when closed).
 * Uses the Visual Viewport API — works on iOS Safari and Android Chrome.
 */
export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handle = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardHeight(gap > 150 ? gap : 0);
    };

    vv.addEventListener('resize', handle);
    vv.addEventListener('scroll', handle);
    return () => {
      vv.removeEventListener('resize', handle);
      vv.removeEventListener('scroll', handle);
    };
  }, []);

  return keyboardHeight;
};

/** Convenience boolean wrapper */
export const useKeyboardVisible = () => useKeyboardHeight() > 0;
