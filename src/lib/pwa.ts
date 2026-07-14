"use client";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function registerServiceWorker(): void {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js");
    });
  }
}

export function getInstallPromptEvent(): BeforeInstallPromptEvent | null {
  const deferredPrompt =
    typeof window !== "undefined"
      ? (window as WindowWithPrompt).__deferredPrompt
      : null;
  return deferredPrompt || null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface WindowWithPrompt extends Window {
  __deferredPrompt?: BeforeInstallPromptEvent;
}
