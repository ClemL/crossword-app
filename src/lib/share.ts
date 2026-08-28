import { BLOCK } from "./puzzle";
import { formatDuration } from "./format";
import { SIZE_LABEL, type Puzzle } from "./types";

const APP_URL = "https://clem-crossword-app.vercel.app/";

// A 15x15 would be 225 emoji, which is more than anyone wants pasted into a
// chat. The small grids have a recognisable silhouette worth showing.
const MAX_GRID_CELLS = 121;

function gridArt(puzzle: Puzzle): string | null {
  if (puzzle.solution.length > MAX_GRID_CELLS) return null;
  const rows: string[] = [];
  for (let row = 0; row < puzzle.rows; row++) {
    let line = "";
    for (let col = 0; col < puzzle.cols; col++) {
      line += puzzle.solution[row * puzzle.cols + col] === BLOCK ? "⬛" : "🟩";
    }
    rows.push(line);
  }
  return rows.join("\n");
}

/** The text put on the clipboard when a solve is shared. */
export function shareText({
  puzzle,
  playerName,
  elapsedMs,
  clean,
  isBest,
}: {
  puzzle: Puzzle;
  playerName: string;
  elapsedMs: number;
  clean: boolean;
  isBest: boolean;
}): string {
  const badges = [
    clean ? "no help" : "with help",
    elapsedMs <= puzzle.par * 1000 ? "under par" : null,
    isBest ? "personal best" : null,
  ].filter(Boolean);

  const art = gridArt(puzzle);
  return [
    `Crossword · ${playerName} · ${SIZE_LABEL[puzzle.size]} #${puzzle.ordinal}`,
    `${formatDuration(elapsedMs, { padMinutes: true })} · ${badges.join(" · ")}`,
    art ?? `${puzzle.rows}x${puzzle.cols} grid`,
    APP_URL,
  ].join("\n\n");
}

/**
 * Share sheet where there is one, clipboard everywhere else.
 * @returns how it went, so the button can say so.
 */
export async function share(text: string): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      // A cancelled share sheet is not a failure worth falling back from.
      if (error instanceof DOMException && error.name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
