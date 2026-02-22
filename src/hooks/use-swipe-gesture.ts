import { useRef, useCallback } from "react";

interface SwipeOptions {
  /** Minimum horizontal pixels to count as a swipe (default: 50) */
  threshold?: number;
  /** Only trigger swipe-right when touch starts within this many px of left edge (default: 32) */
  edgeSize?: number;
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useSwipeGesture (
  onSwipeRight: () => void,
  onSwipeLeft: () => void,
  options: SwipeOptions = {}
): SwipeHandlers {
  const { threshold = 50, edgeSize = 32 } = options;

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  // Keep latest callbacks in refs so touchEnd never captures stale closures
  const onRightRef = useRef(onSwipeRight);
  const onLeftRef = useRef(onSwipeLeft);
  onRightRef.current = onSwipeRight;
  onLeftRef.current = onSwipeLeft;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const deltaX = e.changedTouches[0].clientX - startX.current;
      const deltaY = e.changedTouches[0].clientY - startY.current;

      // Ignore vertical-dominant gestures
      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        startX.current = null;
        startY.current = null;
        return;
      }

      if (deltaX > threshold && startX.current <= edgeSize) {
        // Swipe right from left edge → open
        onRightRef.current();
      } else if (deltaX < -threshold) {
        // Swipe left anywhere → close
        onLeftRef.current();
      }

      startX.current = null;
      startY.current = null;
    },
    [threshold, edgeSize]
  );

  return { onTouchStart, onTouchEnd };
}
