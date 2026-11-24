"use client";

import { useCallback, useSyncExternalStore } from "react";

const eventName = "esapiens:portal-preference";
const fallback = new Map<string, boolean>();
const serverSnapshot = () => false;

// Only presentation preferences live here. The server always renders expanded
// navigation; React reconciles the saved preference after hydration.
export function usePortalPreference(key: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) {
          fallback.delete(key);
          notify();
        }
      };
      const onPreference = (event: Event) => {
        if ((event as CustomEvent<string>).detail === key) notify();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(eventName, onPreference);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(eventName, onPreference);
      };
    },
    [key],
  );
  const snapshot = useCallback(() => {
    try {
      return fallback.get(key) ?? window.localStorage.getItem(key) === "true";
    } catch {
      return fallback.get(key) ?? false;
    }
  }, [key]);
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  function setValue(next: boolean) {
    try {
      window.localStorage.setItem(key, String(next));
      fallback.delete(key);
    } catch {
      fallback.set(key, next);
      // Private browsing/storage restrictions must not disable navigation.
    }
    window.dispatchEvent(new CustomEvent(eventName, { detail: key }));
  }
  return [value, setValue] as const;
}
