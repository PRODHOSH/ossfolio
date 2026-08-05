'use client';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface WindowWithPrompt extends Window {
  __deferredPrompt?: BeforeInstallPromptEvent;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
    };

    // If the page is already fully loaded, register immediately.
    // Otherwise, wait for the load event to avoid blocking critical rendering.
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
  }
}

export function getInstallPromptEvent(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return (window as WindowWithPrompt).__deferredPrompt || null;
}
