"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OfflineBadge } from "@/components/OfflineBadge";
import { OptionsMenu } from "@/components/OptionsMenu";
import { SiteFooter } from "@/components/SiteFooter";
import { PACKS, packPuzzles } from "@/lib/packs";
import { loadProgress } from "@/lib/storage";
import { topicLabel } from "@/lib/topics";
import { useStorageVersion } from "@/lib/useStorage";
import { useUser } from "@/lib/useUser";

export default function PacksPage() {
  const { user } = useUser();
  const version = useStorageVersion();

  // Packs are shared, so their progress is filed under whoever is playing.
  const states = useMemo(() => {
    const out: Record<string, "new" | "in-progress" | "solved"> = {};
    if (version < 0 || !user) return out;
    for (const pack of PACKS) {
      for (const puzzle of packPuzzles(pack)) {
        const saved = loadProgress(user.id, puzzle.id);
        const filled = puzzle.solution.some(
          (cell, i) => cell !== "#" && saved.letters[i] && saved.letters[i] !== ".",
        );
        out[puzzle.id] = saved.completedAt ? "solved" : filled ? "in-progress" : "new";
      }
    }
    return out;
  }, [version, user]);

  return (
    <main className="page">
      <OfflineBadge />
      <header className="hero">
        <div>
          <h1 className="hero__title">Themed packs</h1>
          <p className="hero__sub">
            Sets of 5x5s pulled toward a handful of subjects each. Shared between both players —
            your progress on them is saved under whoever is playing.
          </p>
        </div>
        <div className="hero__side">
          <OptionsMenu />
        </div>
      </header>

      {PACKS.length === 0 && <p className="muted">No packs in this build.</p>}

      {PACKS.map((pack) => {
        const puzzles = packPuzzles(pack);
        const solved = puzzles.filter((p) => states[p.id] === "solved").length;
        return (
          <section className="pack" key={pack.id}>
            <div className="pack__head">
              <h2>{pack.name}</h2>
              <p className="muted">{pack.blurb}</p>
              <ul className="pack__topics">
                {pack.topics.map((topic) => (
                  <li key={topic}>{topicLabel(topic)}</li>
                ))}
              </ul>
            </div>
            <div className="pack__puzzles">
              {puzzles.map((puzzle, i) => (
                <Link
                  key={puzzle.id}
                  className={`chip chip--${states[puzzle.id] ?? "new"}`}
                  href={`/play?id=${puzzle.id}`}
                >
                  #{i + 1}
                  {states[puzzle.id] === "solved" && " ✓"}
                </Link>
              ))}
            </div>
            <p className="pack__meta">
              {solved} of {puzzles.length} solved · about {pack.themedPercent}% of answers on theme
            </p>
          </section>
        );
      })}

      <SiteFooter />
    </main>
  );
}
