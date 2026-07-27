import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { rebuildQuoteNotificationsIfNeeded } from './notifications';

/**
 * Renders nothing. On mount, and whenever the app returns to the
 * foreground, re-schedules the daily quote notifications if a new
 * calendar day has started (rebuildQuoteNotificationsIfNeeded is a
 * no-op otherwise, and also a no-op if the feature is turned off).
 */
export default function AutoQuoteScheduler() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!ranRef.current) {
      ranRef.current = true;
      rebuildQuoteNotificationsIfNeeded();
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') rebuildQuoteNotificationsIfNeeded();
    });
    return () => sub.remove();
  }, []);

  return null;
}
