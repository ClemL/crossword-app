"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OfflineBadge } from "@/components/OfflineBadge";
import { OptionsMenu } from "@/components/OptionsMenu";
import { SiteFooter } from "@/components/SiteFooter";
import { PACKS, packPuzzles, setPuzzles } from "@/lib/packs";
import { SIZES } from "@/lib/types";
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
            Each set is pulled toward a handful of subjects, at two grid sizes. Shared between both
            players — your progress on them is saved under whoever is playing.
          </p>
        </div>
        <div className="hero__side">
          <OptionsMenu />
        </div>
      </header>

      {PACKS.length === 0 && <p className="muted">No packs in this build.</p>}

      {PACKS.map((pack) => (
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

          {/* One row per size, smallest first. */}
          {pack.sets.map((set) => {
            const puzzles = setPuzzles(set);
            const solved = puzzles.filter((p) => states[p.id] === "solved").length;
            const meta = SIZES.find((s) => s.key === set.size);
            return (
              <div className="pack__row" key={set.size}>
                <div className="pack__row-head">
                  <span className="pack__row-size">{meta?.dimensions ?? set.size}</span>
                  <span className="pack__meta">
                    {solved} of {puzzles.length} solved · about {set.themedPercent}% on theme
                  </span>
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
              </div>
            );
          })}
        </section>
      ))}

      <SiteFooter />
    </main>
  );
}
