export type PuzzleSize = "micro" | "mini" | "daily";

export type Direction = "across" | "down";

export interface Clue {
  /** Clue number as printed in the grid. */
  number: number;
  direction: Direction;
  text: string;
  answer: string;
  /** Indices into the flat cell array, in reading order. */
  cells: number[];
}

export interface Puzzle {
  id: string;
  /** Which player's bank this puzzle belongs to. */
  user: string;
  size: PuzzleSize;
  /** 1-based index within its size, used for display ("Mini #4"). */
  ordinal: number;
  rows: number;
  cols: number;
  /** Flat, row-major. "#" marks a block; otherwise the solution letter. */
  solution: string[];
  /** Flat, row-major. 0 where no clue starts. */
  numbers: number[];
  clues: Clue[];
  /** Rough target time in seconds — used for the "par" badge, not enforced. */
  par: number;
}

export interface SizeMeta {
  key: PuzzleSize;
  label: string;
  blurb: string;
  dimensions: string;
}

export const SIZES: SizeMeta[] = [
  { key: "micro", label: "Micro", blurb: "A 3x3 warm-up. Six answers, about a minute.", dimensions: "3 x 3" },
  { key: "mini", label: "Mini", blurb: "A 5x5 coffee-break puzzle.", dimensions: "5 x 5" },
  { key: "daily", label: "Daily", blurb: "A full 15x15 grid to settle into.", dimensions: "15 x 15" },
];

export const SIZE_LABEL: Record<PuzzleSize, string> = {
  micro: "Micro",
  mini: "Mini",
  daily: "Daily",
};
