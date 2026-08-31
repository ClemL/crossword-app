import PACKS_DATA from "@/data/packs.json";
import { getPuzzle } from "./puzzles";
import type { Puzzle, PuzzleSize } from "./types";

/** One size within a pack — the same subjects, filled at a different grid size. */
export interface PackSet {
  size: PuzzleSize;
  puzzles: string[];
  /** Mean share of entries that came out on-theme, as generated. */
  themedPercent: number;
}

export interface Pack {
  id: string;
  name: string;
  blurb: string;
  topics: string[];
  /** How many themed answers the pack's subjects supplied to the filler. */
  themedAnswers: number;
  sets: PackSet[];
}

export const PACKS = PACKS_DATA as Pack[];

export function getPack(id: string | null | undefined): Pack | undefined {
  return id ? PACKS.find((p) => p.id === id) : undefined;
}

export function setPuzzles(set: PackSet): Puzzle[] {
  return set.puzzles.map((id) => getPuzzle(id)).filter((p): p is Puzzle => Boolean(p));
}

/** Every puzzle in the pack, across all its sizes. */
export function packPuzzles(pack: Pack): Puzzle[] {
  return pack.sets.flatMap(setPuzzles);
}
