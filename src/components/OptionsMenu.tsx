"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "./Menu";
import { Modal } from "./Modal";
import { topicsFor } from "@/lib/topics";
import { USERS } from "@/lib/users";
import { useSettings } from "@/lib/useSettings";
import { useUser } from "@/lib/useUser";

const THEME_ORDER = ["system", "light", "dark"] as const;
const THEME_LABEL = { system: "Auto", light: "Light", dark: "Dark" };

/** The one header control: player, theme, topics, changelog and stats. */
export function OptionsMenu({ showStatsLink = true }: { showStatsLink?: boolean }) {
  const { user, setUser } = useUser();
  const { settings, update } = useSettings();
  const [showTopics, setShowTopics] = useState(false);

  const other = USERS.find((candidate) => candidate.id !== user?.id);
  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(settings.theme) + 1) % THEME_ORDER.length];
  const topics = user ? topicsFor(user.id) : [];

  return (
    <>
      <Menu label="☰">
        {(close) => (
          <>
            <button
              type="button"
              onClick={() => {
                setShowTopics(true);
                close();
              }}
            >
              Puzzle topics
            </button>
            {showStatsLink ? (
              <Link href="/stats" onClick={close}>
                Stats
              </Link>
            ) : (
              <Link href="/" onClick={close}>
                Puzzles
              </Link>
            )}
            <hr />
            <button type="button" onClick={() => update({ theme: nextTheme })}>
              Theme: {THEME_LABEL[settings.theme]}
            </button>
            {other && (
              <button
                type="button"
                onClick={() => {
                  setUser(other.id);
                  close();
                }}
              >
                Switch to {other.name}
              </button>
            )}
          </>
        )}
      </Menu>

      {showTopics && (
        <Modal
          title={user ? `${user.name}'s topics` : "Topics"}
          items={topics}
          onClose={() => setShowTopics(false)}
        />
      )}
    </>
  );
}
