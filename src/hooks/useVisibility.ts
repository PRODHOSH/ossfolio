import { useEffect, useRef } from "react";

/**
 * Fires callbacks when the page visibility changes.
 * Useful for pausing/resuming polling, intervals, or animations
 * when the user switches to another tab.
 */
export function useVisibility(onVisible?: () => void, onHidden?: () => void) {
  const visibleRef = useRef(onVisible);
  const hiddenRef = useRef(onHidden);
  useEffect(() => {
    visibleRef.current = onVisible;
    hiddenRef.current = onHidden;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = () => {
      if (document.visibilityState === "visible") {
        visibleRef.current?.();
      } else {
        hiddenRef.current?.();
      }
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
}
