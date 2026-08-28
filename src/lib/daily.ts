import SCHEDULE from "@/data/schedule.json";
import { getPuzzle } from "./puzzles";
import type { Puzzle, PuzzleSize } from "./types";

interface Schedule {
  epoch: string;
  days: number;
  cadence: Record<string, "daily" | "weekly">;
  players: Record<string, Record<string, string[]>>;
}

const schedule = SCHEDULE as Schedule;

export const SCHEDULE_DAYS = schedule.days;
export const CADENCE = schedule.cadence;

/** Midnight local time. Dates are a calendar thing, not a UTC instant. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function epochStart(): number {
  const [year, month, day] = schedule.epoch.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

/** Whole days between the schedule's first day and `date`, in the local zone. */
export function dayNumber(date: Date = new Date()): number {
  return Math.round((startOfDay(date) - epochStart()) / 86_400_000);
}

export function dateForDay(day: number): Date {
  return new Date(epochStart() + day * 86_400_000);
}

/**
 * Which puzzle a given day gets. The schedule wraps rather than running out, so
 * dates before the first day and after the ninetieth still resolve to something
 * — the app never hits a dead end because the bank was laid out a while ago.
 */
export function puzzleForDay(user: string, size: PuzzleSize, day: number): Puzzle | undefined {
  const ids = schedule.players[user]?.[size];
  if (!ids || ids.length === 0) return undefined;
  const index = ((day % ids.length) + ids.length) % ids.length;
  return getPuzzle(ids[index]);
}

export interface DailyEntry {
  size: PuzzleSize;
  puzzle: Puzzle;
  /** True when this is the first day of the puzzle's run — weekly grids change on one day in seven. */
  fresh: boolean;
}

/**
 * What to offer after finishing one of today's puzzles: the next size up for the
 * same day. Falls back to nothing rather than sending the player off to some
 * puzzle in the bank that no date is scheduled to serve.
 */
export function nextForDay(
  user: string,
  current: Puzzle,
  sizes: PuzzleSize[],
  day: number = dayNumber(),
): Puzzle | undefined {
  const todays = sizes.map((size) => puzzleForDay(user, size, day));
  const at = todays.findIndex((p) => p?.id === current.id);
  if (at === -1) return undefined;
  for (let i = at + 1; i < todays.length; i++) {
    if (todays[i]) return todays[i];
  }
  return undefined;
}

export function puzzlesForDay(user: string, day: number, sizes: PuzzleSize[]): DailyEntry[] {
  const out: DailyEntry[] = [];
  for (const size of sizes) {
    const puzzle = puzzleForDay(user, size, day);
    if (!puzzle) continue;
    const previous = puzzleForDay(user, size, day - 1);
    out.push({ size, puzzle, fresh: previous?.id !== puzzle.id });
  }
  return out;
}
