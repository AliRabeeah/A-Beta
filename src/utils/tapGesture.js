import { useRef, useCallback } from 'react';

const DOUBLE_TAP_DELAY = 280;

/**
 * Distinguishes a single tap from a double tap on the same pressable.
 * A single tap fires `onSingleTap` after a short delay (to make sure
 * a second tap isn't coming); a second tap within that window instead
 * fires `onDoubleTap` and cancels the pending single-tap action.
 */
export function useTapGesture({ onSingleTap, onDoubleTap }) {
  const lastTapRef = useRef(0);
  const timeoutRef = useRef(null);

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastTapRef.current = 0;
      onDoubleTap && onDoubleTap();
    } else {
      lastTapRef.current = now;
      timeoutRef.current = setTimeout(() => {
        onSingleTap && onSingleTap();
        timeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  }, [onSingleTap, onDoubleTap]);

  return handlePress;
}
