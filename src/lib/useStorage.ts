"use client";

import { useSyncExternalStore } from "react";

// localStorage is an external store, so it is read through useSyncExternalStore
// rather than copied into state inside an effect. Writes anywhere in the app
// dispatch "crossword:storage" (see storage.ts), and the native "storage" event
// covers changes made in another tab.

let version = 0;
const listeners = new Set<() => void>();

function bump() {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("crossword:storage", bump);
    window.addEventListener("storage", bump);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("crossword:storage", bump);
      window.removeEventListener("storage", bump);
    }
  };
}

/**
 * Increments whenever anything in our namespace changes. `-1` means the render
 * is still server-side or pre-hydration, so nothing has been read yet.
 */
export function useStorageVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => -1,
  );
}

/** Convenience: has the client taken over and read storage at least once? */
export function useHydrated(): boolean {
  return useStorageVersion() >= 0;
}
