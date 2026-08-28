import raw from "@/data/puzzles.json";
import type { Puzzle, PuzzleSize } from "./types";

// The bank is bundled rather than fetched: it is what makes the app work with
// no network at all, including the very first load after installing.
export const PUZZLES = raw as unknown as Puzzle[];

export const PUZZLES_BY_ID = new Map(PUZZLES.map((p) => [p.id, p]));

export function puzzlesOfUser(user: string): Puzzle[] {
  return PUZZLES.filter((p) => p.user === user);
}

export function puzzlesOfSize(user: string, size: PuzzleSize): Puzzle[] {
  return PUZZLES.filter((p) => p.user === user && p.size === size);
}

export function getPuzzle(id: string | null | undefined): Puzzle | undefined {
  return id ? PUZZLES_BY_ID.get(id) : undefined;
}

export function nextPuzzle(current: Puzzle): Puzzle | undefined {
  const siblings = puzzlesOfSize(current.user, current.size);
  const at = siblings.findIndex((p) => p.id === current.id);
  return siblings[(at + 1) % siblings.length];
}
