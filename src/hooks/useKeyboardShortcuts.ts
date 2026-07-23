import { useEffect } from 'react';

interface KeyboardShortcutMap {
  onSlash?: () => void;
  onEscape?: () => void;
  onKeyD?: () => void;
  onKeyR?: () => void;
  onQuestionMark?: () => void;
}

/**
 * Registers global keyboard shortcuts. All handlers are wrapped in a single
 * keydown listener so the hook can be used multiple times without duplication.
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutMap) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        handlers.onSlash?.();
      }

      if (e.key === 'Escape') {
        handlers.onEscape?.();
      }

      if (e.key === '?' && !isInput) {
        e.preventDefault();
        handlers.onQuestionMark?.();
      }

      if (
        (e.key === 'd' || e.key === 'D') &&
        !isInput &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault();
        handlers.onKeyD?.();
      }

      if (
        (e.key === 'r' || e.key === 'R') &&
        !isInput &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault();
        handlers.onKeyR?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
