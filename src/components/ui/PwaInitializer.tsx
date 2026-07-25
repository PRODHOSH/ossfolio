"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";

export function PwaInitializer() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
