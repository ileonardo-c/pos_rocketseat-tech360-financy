import { useEffect } from "react";
import type { MutableRefObject } from "react";

type TimeoutRef = MutableRefObject<number | null>;

export const clearManagedTimeout = (timeoutRef: TimeoutRef) => {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
};

export const scheduleManagedTimeout = (
  timeoutRef: TimeoutRef,
  callback: () => void,
  delayMs: number,
) => {
  clearManagedTimeout(timeoutRef);

  timeoutRef.current = window.setTimeout(() => {
    timeoutRef.current = null;
    callback();
  }, delayMs);
};

export const useTimeoutCleanup = (...timeoutRefs: TimeoutRef[]) => {
  useEffect(() => {
    return () => {
      for (const timeoutRef of timeoutRefs) {
        clearManagedTimeout(timeoutRef);
      }
    };
  }, []);
};
