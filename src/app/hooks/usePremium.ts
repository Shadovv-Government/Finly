import { useState, useEffect } from 'react';
import { db } from '../../db/db';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const setting = await db.settings.get('premium');
        if (!cancelled) {
          setIsPremium(setting?.value === true);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { isPremium, loading };
}
