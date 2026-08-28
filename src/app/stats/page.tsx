"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OfflineBadge } from "@/components/OfflineBadge";
import { SparkBars } from "@/components/SparkBars";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatDuration, formatRelative, pluralize } from "@/lib/format";
import { computeStreaks, summarizeOverall, summarizeSize } from "@/lib/stats";
import { EMPTY_STATS, loadStats, resetUser } from "@/lib/storage";
import { useStorageVersion } from "@/lib/useStorage";
import { useUser } from "@/lib/useUser";
import { UserSwitch } from "@/components/UserSwitch";
import { PUZZLES_BY_ID } from "@/lib/puzzles";
import { SIZES, SIZE_LABEL } from "@/lib/types";

export default function StatsPage() {
  const { user } = useUser();
  const version = useStorageVersion();
  const ready = version >= 0 && user !== null;
  const stats = useMemo(
    () => (version >= 0 && user ? loadStats(user.id) : EMPTY_STATS),
    [version, user],
  );
  const [confirming, setConfirming] = useState(false);

  const overall = useMemo(() => summarizeOverall(stats), [stats]);
  const streaks = useMemo(() => computeStreaks(stats), [stats]);
  const recent = useMemo(
    () => [...stats.solves].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 15),
    [stats],
  );

  return (
    <main className="page">
      <OfflineBadge />
      <header className="hero">
        <div>
          <h1 className="hero__title">{user ? `${user.name}'s stats` : "Stats"}</h1>
          <p className="hero__sub">
            Recorded on this device only — nothing is uploaded anywhere.
          </p>
        </div>
        <div className="hero__side">
          <UserSwitch />
          <ThemeToggle />
          <Link className="btn" href="/">
            Puzzles
          </Link>
        </div>
      </header>

      {!ready ? (
        <p className="muted">Reading your history…</p>
      ) : overall.totalSolves === 0 ? (
        <section className="card">
          <h2>Nothing here yet</h2>
          <p className="muted">
            Solve a puzzle and this page fills up with times, streaks and how often you finish
            without checking.
          </p>
          <Link className="btn btn--primary" href="/">
            Start a puzzle
          </Link>
        </section>
      ) : (
        <>
          <section className="strip strip--big" aria-label="Overall">
            <div className="strip__item">
              <span className="strip__value">{overall.totalSolves}</span>
              <span className="strip__label">puzzles solved</span>
            </div>
            <div className="strip__item">
              <span className="strip__value">{streaks.current}</span>
              <span className="strip__label">current streak</span>
            </div>
            <div className="strip__item">
              <span className="strip__value">{streaks.longest}</span>
              <span className="strip__label">longest streak</span>
            </div>
            <div className="strip__item">
              <span className="strip__value">{formatDuration(overall.totalTimeMs)}</span>
              <span className="strip__label">total solving time</span>
            </div>
            <div className="strip__item">
              <span className="strip__value">{Math.round(overall.cleanRate * 100)}%</span>
              <span className="strip__label">solved without help</span>
            </div>
            <div className="strip__item">
              <span className="strip__value">{streaks.activeDays}</span>
              <span className="strip__label">days played</span>
            </div>
          </section>

          <div className="cards">
            {SIZES.map((meta) => {
              const summary = summarizeSize(stats, meta.key);
              if (summary.solved === 0) {
                return (
                  <section className="card" key={meta.key}>
                    <h2>{meta.label}</h2>
                    <p className="muted">No {meta.label.toLowerCase()} solved yet.</p>
                  </section>
                );
              }
              return (
                <section className="card" key={meta.key}>
                  <h2>
                    {meta.label} <span className="muted">{meta.dimensions}</span>
                  </h2>
                  <dl className="kv">
                    <div>
                      <dt>Solved</dt>
                      <dd>{summary.solved}</dd>
                    </div>
                    <div>
                      <dt>Best</dt>
                      <dd>{formatDuration(summary.bestMs ?? 0, { padMinutes: true })}</dd>
                    </div>
                    <div>
                      <dt>Median</dt>
                      <dd>{formatDuration(summary.medianMs ?? 0, { padMinutes: true })}</dd>
                    </div>
                    <div>
                      <dt>Average</dt>
                      <dd>{formatDuration(summary.averageMs ?? 0, { padMinutes: true })}</dd>
                    </div>
                    <div>
                      <dt>No help</dt>
                      <dd>{summary.cleanSolves}</dd>
                    </div>
                    <div>
                      <dt>Trend</dt>
                      <dd className={summary.trendMs === null ? "" : summary.trendMs < 0 ? "good" : "bad"}>
                        {summary.trendMs === null
                          ? "—"
                          : `${summary.trendMs < 0 ? "−" : "+"}${formatDuration(Math.abs(summary.trendMs))}`}
                      </dd>
                    </div>
                  </dl>
                  <p className="card__caption">
                    Last {pluralize(summary.recent.length, "solve")}, most recent on the right
                  </p>
                  <SparkBars
                    values={summary.recent.map((s) => s.ms)}
                    labels={summary.recent.map(
                      (s) => `${formatDuration(s.ms, { padMinutes: true })} · ${formatRelative(s.finishedAt)}`,
                    )}
                  />
                </section>
              );
            })}
          </div>

          <section className="card">
            <h2>Recent solves</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Puzzle</th>
                  <th>Time</th>
                  <th>Help</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((solve, i) => {
                  const puzzle = PUZZLES_BY_ID.get(solve.puzzleId);
                  return (
                    <tr key={`${solve.puzzleId}-${solve.finishedAt}-${i}`}>
                      <td>
                        {SIZE_LABEL[solve.size as keyof typeof SIZE_LABEL] ?? solve.size}
                        {puzzle ? ` #${puzzle.ordinal}` : ""}
                      </td>
                      <td>{formatDuration(solve.ms, { padMinutes: true })}</td>
                      <td>
                        {solve.clean
                          ? "none"
                          : [
                              solve.checks ? pluralize(solve.checks, "check") : "",
                              solve.reveals ? pluralize(solve.reveals, "reveal") : "",
                            ]
                              .filter(Boolean)
                              .join(", ")}
                      </td>
                      <td>{formatRelative(solve.finishedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="card card--danger">
        <h2>Reset {user?.name}</h2>
        <p className="muted">
          Clears {user ? `${user.name}'s` : "this player's"} saved grids, timers and stats on this
          device. The other player is left alone. There is no undo.
        </p>
        {confirming ? (
          <div className="row">
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                if (user) resetUser(user.id);
                setConfirming(false);
              }}
            >
              Yes, erase everything
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirming(true)}>
            Reset all progress
          </button>
        )}
      </section>
    </main>
  );
}
