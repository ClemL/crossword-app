import PACKS_DATA from "@/data/packs.json";
import { getPuzzle } from "./puzzles";
import type { Puzzle } from "./types";

export interface Pack {
  id: string;
  name: string;
  blurb: string;
  topics: string[];
  puzzles: string[];
  /** How many themed answers the pack's subjects supplied to the filler. */
  themedAnswers: number;
  /** Mean share of entries that came out on-theme, as generated. */
  themedPercent: number;
}

export const PACKS = PACKS_DATA as Pack[];

export function getPack(id: string | null | undefined): Pack | undefined {
  return id ? PACKS.find((p) => p.id === id) : undefined;
}

export function packPuzzles(pack: Pack): Puzzle[] {
  return pack.puzzles.map((id) => getPuzzle(id)).filter((p): p is Puzzle => Boolean(p));
}
