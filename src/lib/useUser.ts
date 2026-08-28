"use client";

import { useCallback, useMemo } from "react";
import { loadActiveUser, saveActiveUser } from "./storage";
import { getUser, type User } from "./users";
import { useStorageVersion } from "./useStorage";

/**
 * Which player is at the keyboard. `null` before one is chosen, and while the
 * page is still prerendered, so callers can show the picker instead of guessing.
 */
export function useUser(): {
  user: User | null;
  setUser: (id: string) => void;
  hydrated: boolean;
} {
  const version = useStorageVersion();
  const user = useMemo(
    () => (version >= 0 ? (getUser(loadActiveUser()) ?? null) : null),
    [version],
  );
  const setUser = useCallback((id: string) => saveActiveUser(id), []);
  return { user, setUser, hydrated: version >= 0 };
}
