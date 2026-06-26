"use client";

import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutsOptions {
  onSlash?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({ onSlash, onEscape }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const isCtrlSlash = (e.ctrlKey || e.metaKey) && e.key === "/";
      const isBareSlash = e.key === "/" && !e.ctrlKey && !isTyping;

      if (isCtrlSlash || isBareSlash) {
        e.preventDefault();
        onSlash?.();
      }

      if (e.key === "Escape") {
        onEscape?.();
      }
    },
    [onSlash, onEscape]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
