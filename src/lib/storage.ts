"use client";

// Everything the app remembers lives in localStorage, which is also what makes
// a half-finished puzzle survive going offline and closing the tab.

const NS = "crossword:v1";

// Progress and stats are per player; the theme and the chosen player are not.
export const KEYS = {
  progress: (user: string, puzzleId: string) => `${NS}:${user}:progress:${puzzleId}`,
  stats: (user: string) => `${NS}:${user}:stats`,
  settings: `${NS}:settings`,
  activeUser: `${NS}:user`,
};

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("crossword:storage", { detail: { key } }));
  } catch {
    // Private-mode browsers and full quotas both land here. Losing persistence
    // is not a reason to break the puzzle you are in the middle of.
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("crossword:storage", { detail: { key } }));
  } catch {
    /* ignore */
  }
}

export function listKeys(prefix: string): string[] {
  if (typeof window === "undefined") return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) out.push(key);
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Progress for a single puzzle. Letters are packed one char per cell. */
export interface PuzzleProgress {
  /** One character per cell: a letter, "." for blank, "#" for a block. */
  letters: string;
  /** "1"/"0" per cell — pencilled-in guesses. */
  pencil: string;
  elapsedMs: number;
  startedAt: number | null;
  completedAt: number | null;
  /** Cells the player has asked the app to check or reveal. */
  revealed: string;
  checkCount: number;
  revealCount: number;
  /** Wrong letters seen by a check, over the life of the solve. */
  mistakes: number;
  autocheck: boolean;
}

export const EMPTY_PROGRESS: PuzzleProgress = {
  letters: "",
  pencil: "",
  elapsedMs: 0,
  startedAt: null,
  completedAt: null,
  revealed: "",
  checkCount: 0,
  revealCount: 0,
  mistakes: 0,
  autocheck: false,
};

export function loadProgress(user: string, puzzleId: string): PuzzleProgress {
  return readJson<PuzzleProgress>(KEYS.progress(user, puzzleId), EMPTY_PROGRESS);
}

export function saveProgress(user: string, puzzleId: string, progress: PuzzleProgress): void {
  writeJson(KEYS.progress(user, puzzleId), progress);
}

export interface SolveRecord {
  puzzleId: string;
  size: string;
  /** Milliseconds of active solving time. */
  ms: number;
  finishedAt: number;
  /** No checks and no reveals used. */
  clean: boolean;
  checks: number;
  reveals: number;
}

export interface StatsState {
  solves: SolveRecord[];
  /** Best time per puzzle id, so replays can beat a personal record. */
  best: Record<string, number>;
}

export const EMPTY_STATS: StatsState = { solves: [], best: {} };

export function loadStats(user: string): StatsState {
  return readJson<StatsState>(KEYS.stats(user), EMPTY_STATS);
}

export function recordSolve(user: string, record: SolveRecord): StatsState {
  const stats = loadStats(user);
  const next: StatsState = {
    solves: [...stats.solves, record].slice(-500),
    best: { ...stats.best },
  };
  const previous = next.best[record.puzzleId];
  if (previous === undefined || record.ms < previous) next.best[record.puzzleId] = record.ms;
  writeJson(KEYS.stats(user), next);
  return next;
}

export function loadActiveUser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEYS.activeUser);
  } catch {
    return null;
  }
}

export function saveActiveUser(user: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEYS.activeUser, user);
    window.dispatchEvent(new CustomEvent("crossword:storage", { detail: { key: KEYS.activeUser } }));
  } catch {
    /* ignore */
  }
}

export interface Settings {
  theme: "system" | "light" | "dark";
  skipFilled: boolean;
  autocheck: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  skipFilled: true,
  autocheck: false,
};

export function loadSettings(): Settings {
  return readJson<Settings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  writeJson(KEYS.settings, settings);
}

/** Clears one player's saved grids and stats, leaving the other player alone. */
export function resetUser(user: string): void {
  for (const key of listKeys(`${NS}:${user}:`)) removeKey(key);
}
