"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OfflineBadge } from "@/components/OfflineBadge";
import { OptionsMenu } from "@/components/OptionsMenu";
import { SiteFooter } from "@/components/SiteFooter";
import { UserPicker } from "@/components/UserPicker";
import { CADENCE, dateForDay, dayNumber, puzzlesForDay } from "@/lib/daily";
import { formatDuration } from "@/lib/format";
import { computeStreaks, summarizeOverall } from "@/lib/stats";
import { loadProgress, loadStats } from "@/lib/storage";
import { SIZES, SIZE_LABEL, type Puzzle } from "@/lib/types";
import { useStorageVersion } from "@/lib/useStorage";
import { useUser } from "@/lib/useUser";

const SIZE_KEYS = SIZES.map((s) => s.key);
const EARLIER_STEP = 14;

type CardState = "new" | "in-progress" | "solved";

interface Progress {
  state: CardState;
  percent: number;
  elapsedMs: number;
}

function progressOf(user: string, puzzle: Puzzle): Progress {
  const saved = loadProgress(user, puzzle.id);
  let filled = 0;
  let total = 0;
  for (let i = 0; i < puzzle.solution.length; i++) {
    if (puzzle.solution[i] === "#") continue;
    total++;
    const ch = saved.letters[i];
    if (ch && ch !== ".") filled++;
  }
  return {
    state: saved.completedAt ? "solved" : filled > 0 ? "in-progress" : "new",
    percent: total === 0 ? 0 : Math.round((filled / total) * 100),
    elapsedMs: saved.elapsedMs,
  };
}

function dayLabel(day: number, today: number): string {
  if (day === today) return "Today";
  if (day === today - 1) return "Yesterday";
  return dateForDay(day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function HomePage() {
  const { user, setUser, hydrated } = useUser();
  const version = useStorageVersion();
  const [earlier, setEarlier] = useState(EARLIER_STEP);

  const today = useMemo(() => (version >= 0 ? dayNumber() : 0), [version]);
  const stats = useMemo(() => (version >= 0 && user ? loadStats(user.id) : null), [version, user]);

  const todayEntries = useMemo(
    () => (version >= 0 && user ? puzzlesForDay(user.id, today, SIZE_KEYS) : []),
    [version, user, today],
  );

  const earlierDays = useMemo(() => {
    if (version < 0 || !user) return [];
    return Array.from({ length: earlier }, (_, i) => today - 1 - i).map((day) => ({
      day,
      entries: puzzlesForDay(user.id, day, SIZE_KEYS),
    }));
  }, [version, user, today, earlier]);

  const solvedBySize = useMemo(() => {
    const out: Record<string, number> = {};
    for (const size of SIZE_KEYS) {
      const ids = new Set(
        (stats?.solves ?? []).filter((s) => s.size === size).map((s) => s.puzzleId),
      );
      out[size] = ids.size;
    }
    return out;
  }, [stats]);

  const overall = useMemo(() => (stats ? summarizeOverall(stats) : null), [stats]);
  const streaks = useMemo(() => (stats ? computeStreaks(stats) : null), [stats]);

  if (hydrated && !user) return <UserPicker onPick={setUser} />;
  if (!user) {
    return (
      <main className="page page--narrow">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <OfflineBadge />

      <header className="hero">
        <div>
          <h1 className="hero__title">Crossword</h1>
          <p className="hero__sub">
            A new micro and mini every day for {user.name}, and a fresh 15x15 each week. Everything
            runs on your device — the timer, your progress and your stats all keep working with no
            connection.
          </p>
        </div>
        <div className="hero__side">
          <OptionsMenu />
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

      <section className="today">
        <div className="today__head">
          <h2>Today</h2>
          <p className="muted">
            {dateForDay(today).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="today__cards">
          {todayEntries.map(({ size, puzzle, fresh }) => {
            const progress = progressOf(user.id, puzzle);
            const meta = SIZES.find((s) => s.key === size);
            return (
              <Link
                key={size}
                className={`tcard tcard--${progress.state}`}
                href={`/play?id=${puzzle.id}`}
              >
                <span className="tcard__size">{SIZE_LABEL[size]}</span>
                <span className="tcard__dim">{meta?.dimensions}</span>
                <span className="tcard__state">
                  {progress.state === "solved" && (
                    <>✓ {formatDuration(progress.elapsedMs, { padMinutes: true })}</>
                  )}
                  {progress.state === "in-progress" && <>{progress.percent}% done</>}
                  {progress.state === "new" &&
                    (CADENCE[size] === "weekly" && !fresh ? "This week's" : "New")}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="earlier">
        <h2>Earlier</h2>
        <ul className="earlier__list">
          {earlierDays.map(({ day, entries }) => (
            <li key={day} className="earlier__day">
              <span className="earlier__date">{dayLabel(day, today)}</span>
              <span className="earlier__chips">
                {entries.map(({ size, puzzle }) => {
                  const progress = progressOf(user.id, puzzle);
                  return (
                    <Link
                      key={size}
                      className={`chip chip--${progress.state}`}
                      href={`/play?id=${puzzle.id}`}
                    >
                      {SIZE_LABEL[size]}
                      {progress.state === "solved" && " ✓"}
                      {progress.state === "in-progress" && ` ${progress.percent}%`}
                    </Link>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn--ghost" onClick={() => setEarlier((n) => n + EARLIER_STEP)}>
          Show more days
        </button>
      </section>

      <section className="strip" aria-label="Progress by size">
        {SIZES.map((meta) => (
          <div className="strip__item" key={meta.key}>
            <span className="strip__value">{solvedBySize[meta.key] ?? 0}</span>
            <span className="strip__label">{meta.label} solved</span>
          </div>
        ))}
      </section>

      <div className="foot">
        <p>
          Clues are built from a hand-written bank plus the public-domain Webster&apos;s 1913
          dictionary — so a few read a little antique. A clue ending{" "}
          <em>&hellip;, plus &ldquo;ED&rdquo;</em> means exactly that: solve the clue, then add the
          ending.
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
