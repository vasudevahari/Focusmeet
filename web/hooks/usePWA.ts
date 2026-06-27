"use client";

import { useEffect } from "react";

export function usePWA() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[PWA] service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] service worker registration failed:", err);
      });
  }, []);
}
