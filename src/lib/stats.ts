import type { PuzzleSize } from "./types";
import type { SolveRecord, StatsState } from "./storage";

export interface SizeSummary {
  size: PuzzleSize;
  solved: number;
  attempts: number;
  bestMs: number | null;
  averageMs: number | null;
  medianMs: number | null;
  lastMs: number | null;
  cleanSolves: number;
  recent: SolveRecord[];
  /** Negative means the last five solves are faster than the five before. */
  trendMs: number | null;
}

export interface Streaks {
  current: number;
  longest: number;
  /** Distinct days with at least one solve. */
  activeDays: number;
}

const DAY = 86_400_000;

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function summarizeSize(stats: StatsState, size: PuzzleSize): SizeSummary {
  const solves = stats.solves.filter((s) => s.size === size).sort((a, b) => a.finishedAt - b.finishedAt);
  const times = solves.map((s) => s.ms);
  const recent = solves.slice(-12);

  // Trend compares the last five solves against the five before them, which is
  // enough to say "you are getting faster" without pretending to be a model.
  let trendMs: number | null = null;
  if (solves.length >= 6) {
    const last = times.slice(-5);
    const before = times.slice(-10, -5);
    const a = mean(last);
    const b = mean(before);
    if (a !== null && b !== null) trendMs = a - b;
  }

  return {
    size,
    solved: solves.length,
    attempts: solves.length,
    bestMs: times.length ? Math.min(...times) : null,
    averageMs: mean(times),
    medianMs: median(times),
    lastMs: times.length ? times[times.length - 1] : null,
    cleanSolves: solves.filter((s) => s.clean).length,
    recent,
    trendMs,
  };
}

export function computeStreaks(stats: StatsState): Streaks {
  const days = new Set(stats.solves.map((s) => dayKey(s.finishedAt)));
  if (days.size === 0) return { current: 0, longest: 0, activeDays: 0 };

  const sorted = [...stats.solves].map((s) => s.finishedAt).sort((a, b) => a - b);
  const uniqueDays = [...new Set(sorted.map((ts) => new Date(ts).setHours(0, 0, 0, 0)))].sort(
    (a, b) => a - b,
  );

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    run = uniqueDays[i] - uniqueDays[i - 1] === DAY ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // The streak survives until the end of tomorrow — solving yesterday still
  // counts today.
  const today = new Date().setHours(0, 0, 0, 0);
  const last = uniqueDays[uniqueDays.length - 1];
  let current = 0;
  if (last === today || last === today - DAY) {
    current = 1;
    for (let i = uniqueDays.length - 1; i > 0; i--) {
      if (uniqueDays[i] - uniqueDays[i - 1] === DAY) current++;
      else break;
    }
  }

  return { current, longest, activeDays: uniqueDays.length };
}

export interface OverallStats {
  totalSolves: number;
  totalTimeMs: number;
  cleanRate: number;
  firstSolveAt: number | null;
  lastSolveAt: number | null;
}

export function summarizeOverall(stats: StatsState): OverallStats {
  const solves = stats.solves;
  const totalTimeMs = solves.reduce((sum, s) => sum + s.ms, 0);
  return {
    totalSolves: solves.length,
    totalTimeMs,
    cleanRate: solves.length ? solves.filter((s) => s.clean).length / solves.length : 0,
    firstSolveAt: solves.length ? Math.min(...solves.map((s) => s.finishedAt)) : null,
    lastSolveAt: solves.length ? Math.max(...solves.map((s) => s.finishedAt)) : null,
  };
}
