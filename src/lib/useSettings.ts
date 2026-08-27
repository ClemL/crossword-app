"use client";

import { useCallback, useEffect, useMemo } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "./storage";
import { useStorageVersion } from "./useStorage";

export function useSettings() {
  const version = useStorageVersion();
  const hydrated = version >= 0;
  // Re-read whenever anything in our storage namespace changes.
  const settings = useMemo<Settings>(
    () => (version >= 0 ? loadSettings() : DEFAULT_SETTINGS),
    [version],
  );

  const update = useCallback((patch: Partial<Settings>) => {
    saveSettings({ ...loadSettings(), ...patch });
  }, []);

  // Theme lives on <html> so CSS can key off it; the inline script in the
  // layout handles the very first paint.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme, hydrated]);

  return { settings, update, hydrated };
}
