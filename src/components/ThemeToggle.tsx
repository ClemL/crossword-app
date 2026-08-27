"use client";

import { useSettings } from "@/lib/useSettings";

const ORDER = ["system", "light", "dark"] as const;
const LABEL = { system: "Auto", light: "Light", dark: "Dark" };

export function ThemeToggle() {
  const { settings, update, hydrated } = useSettings();
  const next = ORDER[(ORDER.indexOf(settings.theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={() => update({ theme: next })}
      title={`Theme: ${LABEL[settings.theme]} — click for ${LABEL[next]}`}
    >
      {hydrated ? LABEL[settings.theme] : "Theme"}
    </button>
  );
}
