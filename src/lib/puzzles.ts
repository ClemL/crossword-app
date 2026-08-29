import raw from "@/data/puzzles.json";
import { SHARED_USER, type Puzzle } from "./types";

// The bank is bundled rather than fetched: it is what makes the app work with
// no network at all, including the very first load after installing.
export const PUZZLES = raw as unknown as Puzzle[];

export const PUZZLES_BY_ID = new Map(PUZZLES.map((p) => [p.id, p]));

/**
 * Whose history a puzzle's progress and stats belong under. A pack is shared, so
 * it files under whoever is playing rather than under a bank owner.
 */
export function progressOwner(puzzle: Puzzle, activeUser: string): string {
  return puzzle.user === SHARED_USER ? activeUser : puzzle.user;
}

export function puzzlesOfUser(user: string): Puzzle[] {
  return PUZZLES.filter((p) => p.user === user);
}

export function getPuzzle(id: string | null | undefined): Puzzle | undefined {
  return id ? PUZZLES_BY_ID.get(id) : undefined;
}
