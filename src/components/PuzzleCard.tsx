"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { Puzzle } from "@/lib/types";

export type PuzzleState = "new" | "in-progress" | "solved";

interface PuzzleCardProps {
  puzzle: Puzzle;
  state: PuzzleState;
  elapsedMs: number;
  filled: number;
  total: number;
  bestMs: number | null;
}

export function PuzzleCard({ puzzle, state, elapsedMs, filled, total, bestMs }: PuzzleCardProps) {
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return (
    <Link className={`pcard pcard--${state}`} href={`/play?id=${puzzle.id}`}>
      <span className="pcard__num">#{puzzle.ordinal}</span>
      <span className="pcard__meta">
        {state === "solved" && (
          <span className="pcard__solved">✓ {formatDuration(bestMs ?? elapsedMs, { padMinutes: true })}</span>
        )}
        {state === "in-progress" && <span className="pcard__progress">{percent}%</span>}
        {state === "new" && <span className="pcard__new">Play</span>}
      </span>
      {state === "in-progress" && (
        <span className="pcard__bar" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </span>
      )}
    </Link>
  );
}
