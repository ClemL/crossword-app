import type { Clue, Direction, Puzzle } from "./types";

export const BLOCK = "#";

export function isBlock(puzzle: Puzzle, index: number): boolean {
  return puzzle.solution[index] === BLOCK;
}

export function cellIndex(puzzle: Puzzle, row: number, col: number): number {
  return row * puzzle.cols + col;
}

export function rowOf(puzzle: Puzzle, index: number): number {
  return Math.floor(index / puzzle.cols);
}

export function colOf(puzzle: Puzzle, index: number): number {
  return index % puzzle.cols;
}

/** Map of cell index -> the across and down clues running through it. */
export function buildCellClueMap(puzzle: Puzzle): Map<number, Record<Direction, Clue | undefined>> {
  const map = new Map<number, Record<Direction, Clue | undefined>>();
  for (const clue of puzzle.clues) {
    for (const cell of clue.cells) {
      const existing = map.get(cell) ?? { across: undefined, down: undefined };
      existing[clue.direction] = clue;
      map.set(cell, existing);
    }
  }
  return map;
}

export function cluesFor(puzzle: Puzzle, direction: Direction): Clue[] {
  return puzzle.clues.filter((c) => c.direction === direction);
}

export function clueKey(clue: Clue): string {
  return `${clue.number}${clue.direction === "across" ? "A" : "D"}`;
}

/** First empty cell of a clue, falling back to its first cell. */
export function firstBlank(clue: Clue, entries: string[]): number {
  const blank = clue.cells.find((cell) => !entries[cell]);
  return blank ?? clue.cells[0];
}

export function isComplete(puzzle: Puzzle, entries: string[]): boolean {
  for (let i = 0; i < puzzle.solution.length; i++) {
    if (puzzle.solution[i] === BLOCK) continue;
    if (!entries[i]) return false;
  }
  return true;
}

export function isCorrect(puzzle: Puzzle, entries: string[]): boolean {
  for (let i = 0; i < puzzle.solution.length; i++) {
    if (puzzle.solution[i] === BLOCK) continue;
    if (entries[i] !== puzzle.solution[i]) return false;
  }
  return true;
}

export function countFilled(puzzle: Puzzle, entries: string[]): { filled: number; total: number } {
  let filled = 0;
  let total = 0;
  for (let i = 0; i < puzzle.solution.length; i++) {
    if (puzzle.solution[i] === BLOCK) continue;
    total++;
    if (entries[i]) filled++;
  }
  return { filled, total };
}

export function emptyEntries(puzzle: Puzzle): string[] {
  return puzzle.solution.map((c) => (c === BLOCK ? BLOCK : ""));
}

/**
 * Next cell when typing. Walks forward inside the current entry, then jumps to
 * the start of the next entry in the same direction, the way the NYT app does.
 */
export function advance(
  puzzle: Puzzle,
  clue: Clue,
  cell: number,
  entries: string[],
  { skipFilled }: { skipFilled: boolean },
): { cell: number; clue: Clue } {
  const pos = clue.cells.indexOf(cell);
  for (let i = pos + 1; i < clue.cells.length; i++) {
    if (!skipFilled || !entries[clue.cells[i]]) return { cell: clue.cells[i], clue };
  }
  // Nothing left in this entry — move to the next one that still has blanks.
  const sameDir = cluesFor(puzzle, clue.direction);
  const at = sameDir.findIndex((c) => c.number === clue.number);
  for (let step = 1; step <= sameDir.length; step++) {
    const next = sameDir[(at + step) % sameDir.length];
    const blank = next.cells.find((c) => !entries[c]);
    if (blank !== undefined) return { cell: blank, clue: next };
  }
  return { cell, clue };
}

export function retreat(clue: Clue, cell: number): number {
  const pos = clue.cells.indexOf(cell);
  return pos > 0 ? clue.cells[pos - 1] : cell;
}

/** Step one square in a compass direction, skipping blocks. */
export function move(puzzle: Puzzle, cell: number, dRow: number, dCol: number): number {
  let row = rowOf(puzzle, cell);
  let col = colOf(puzzle, cell);
  for (let i = 0; i < Math.max(puzzle.rows, puzzle.cols); i++) {
    row += dRow;
    col += dCol;
    if (row < 0 || col < 0 || row >= puzzle.rows || col >= puzzle.cols) return cell;
    const next = cellIndex(puzzle, row, col);
    if (puzzle.solution[next] !== BLOCK) return next;
  }
  return cell;
}
