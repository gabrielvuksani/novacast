import { useEffect, useRef, useState } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [supported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    const releaseWakeLock = async () => {
      if (!sentinelRef.current) return;
      try {
        await sentinelRef.current.release();
      } catch {
        // Ignore release failures.
      } finally {
        sentinelRef.current = null;
        if (!cancelled) {
          setActive(false);
        }
      }
    };

    const requestWakeLock = async () => {
      if (!enabled || document.visibilityState !== 'visible') {
        await releaseWakeLock();
        return;
      }

      try {
        const wakeLock = await (navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
        }).wakeLock?.request('screen');

        if (!wakeLock || cancelled) return;

        sentinelRef.current = wakeLock;
        setActive(true);
        setError(null);
        wakeLock.addEventListener('release', () => {
          sentinelRef.current = null;
          setActive(false);
        });
      } catch (nextError) {
        if (!cancelled) {
          setActive(false);
          setError(nextError instanceof Error ? nextError.message : 'Wake lock unavailable');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        void requestWakeLock();
      } else {
        void releaseWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [enabled, supported]);

  return { supported, active, error };
}
