"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OfflineBadge } from "@/components/OfflineBadge";
import { PuzzleCard, type PuzzleState } from "@/components/PuzzleCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserPicker } from "@/components/UserPicker";
import { UserSwitch } from "@/components/UserSwitch";
import { puzzlesOfSize, puzzlesOfUser } from "@/lib/puzzles";
import { useUser } from "@/lib/useUser";
import { SIZES, SIZE_LABEL, type PuzzleSize } from "@/lib/types";
import { formatDuration, pluralize } from "@/lib/format";
import { loadProgress, loadStats } from "@/lib/storage";
import { computeStreaks, summarizeOverall } from "@/lib/stats";
import { useStorageVersion } from "@/lib/useStorage";

interface CardState {
  state: PuzzleState;
  elapsedMs: number;
  filled: number;
  total: number;
}

export default function HomePage() {
  const { user, setUser, hydrated } = useUser();
  // Saved progress is read straight from localStorage, keyed off the storage
  // version so it refreshes when a puzzle is solved in another tab.
  const version = useStorageVersion();
  const userId = user?.id ?? null;

  const stats = useMemo(
    () => (version >= 0 && userId ? loadStats(userId) : null),
    [version, userId],
  );

  const cards = useMemo<Record<string, CardState>>(() => {
    if (version < 0 || !userId) return {};
    const next: Record<string, CardState> = {};
    for (const puzzle of puzzlesOfUser(userId)) {
      const saved = loadProgress(userId, puzzle.id);
      const total = puzzle.solution.filter((c) => c !== "#").length;
      let filled = 0;
      for (let i = 0; i < puzzle.solution.length; i++) {
        if (puzzle.solution[i] === "#") continue;
        const ch = saved.letters[i];
        if (ch && ch !== ".") filled++;
      }
      next[puzzle.id] = {
        state: saved.completedAt ? "solved" : filled > 0 ? "in-progress" : "new",
        elapsedMs: saved.elapsedMs,
        filled,
        total,
      };
    }
    return next;
  }, [version, userId]);

  const overall = useMemo(() => (stats ? summarizeOverall(stats) : null), [stats]);
  const streaks = useMemo(() => (stats ? computeStreaks(stats) : null), [stats]);

  const resume = useMemo(() => {
    if (!userId) return undefined;
    return puzzlesOfUser(userId).find((p) => cards[p.id]?.state === "in-progress");
  }, [cards, userId]);

  if (hydrated && !user) return <UserPicker onPick={setUser} />;
  if (!user) return <main className="page page--narrow"><p className="muted">Loading…</p></main>;

  return (
    <main className="page">
      <OfflineBadge />

      <header className="hero">
        <div>
          <h1 className="hero__title">Crossword</h1>
          <p className="hero__sub">
            {pluralize(puzzlesOfUser(user.id).length, "puzzle")} built around {user.name}&apos;s
            topics. Everything runs on your device — the timer, your progress and your stats all
            keep working with no connection.
          </p>
        </div>
        <div className="hero__side">
          <UserSwitch />
          <ThemeToggle />
          <Link className="btn" href="/stats">
            Stats
          </Link>
        </div>
      </header>

      {overall && overall.totalSolves > 0 && (
        <section className="strip" aria-label="Summary">
          <div className="strip__item">
            <span className="strip__value">{overall.totalSolves}</span>
            <span className="strip__label">solved</span>
          </div>
          <div className="strip__item">
            <span className="strip__value">{streaks?.current ?? 0}</span>
            <span className="strip__label">day streak</span>
          </div>
          <div className="strip__item">
            <span className="strip__value">{formatDuration(overall.totalTimeMs)}</span>
            <span className="strip__label">time solving</span>
          </div>
          <div className="strip__item">
            <span className="strip__value">{Math.round(overall.cleanRate * 100)}%</span>
            <span className="strip__label">without help</span>
          </div>
        </section>
      )}

      {resume && (
        <Link className="resume" href={`/play?id=${resume.id}`}>
          <span>
            Pick up where you left off — {SIZE_LABEL[resume.size]} #{resume.ordinal}
          </span>
          <span className="resume__arrow">→</span>
        </Link>
      )}

      {SIZES.map((meta) => (
        <SizeSection
          key={meta.key}
          userId={user.id}
          size={meta.key}
          label={meta.label}
          blurb={meta.blurb}
          dimensions={meta.dimensions}
          cards={cards}
          best={stats?.best ?? {}}
        />
      ))}

      <footer className="foot">
        <p>
          Clues are built from a hand-written bank plus the public-domain Webster&apos;s 1913
          dictionary — so a few read a little antique. A clue ending{" "}
          <em>&hellip;, plus &ldquo;ED&rdquo;</em> means exactly that: solve the clue, then add the
          ending.
        </p>
      </footer>
    </main>
  );
}

function SizeSection({
  userId,
  size,
  label,
  blurb,
  dimensions,
  cards,
  best,
}: {
  userId: string;
  size: PuzzleSize;
  label: string;
  blurb: string;
  dimensions: string;
  cards: Record<string, CardState>;
  best: Record<string, number>;
}) {
  const puzzles = puzzlesOfSize(userId, size);
  const solved = puzzles.filter((p) => cards[p.id]?.state === "solved").length;

  return (
    <section className="size-section">
      <div className="size-section__head">
        <h2>
          {label} <span className="size-section__dim">{dimensions}</span>
        </h2>
        <p className="muted">{blurb}</p>
        <p className="size-section__count">
          {solved} of {puzzles.length} solved
        </p>
      </div>
      <div className="pcards">
        {puzzles.map((puzzle) => {
          const card = cards[puzzle.id];
          return (
            <PuzzleCard
              key={puzzle.id}
              puzzle={puzzle}
              state={card?.state ?? "new"}
              elapsedMs={card?.elapsedMs ?? 0}
              filled={card?.filled ?? 0}
              total={card?.total ?? 1}
              bestMs={best[puzzle.id] ?? null}
            />
          );
        })}
      </div>
    </section>
  );
}
