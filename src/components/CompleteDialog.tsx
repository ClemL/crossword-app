"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { Puzzle } from "@/lib/types";

interface CompleteDialogProps {
  puzzle: Puzzle;
  elapsedMs: number;
  bestMs: number | null;
  clean: boolean;
  nextHref?: string;
  onDismiss: () => void;
}

export function CompleteDialog({
  puzzle,
  elapsedMs,
  bestMs,
  clean,
  nextHref,
  onDismiss,
}: CompleteDialogProps) {
  const beatPar = elapsedMs <= puzzle.par * 1000;
  const newBest = bestMs !== null && elapsedMs <= bestMs;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Puzzle solved">
      <div className="dialog">
        <p className="dialog__eyebrow">Solved</p>
        <p className="dialog__time">{formatDuration(elapsedMs, { padMinutes: true })}</p>
        <ul className="dialog__badges">
          {newBest && <li className="badge badge--gold">Personal best</li>}
          {clean && <li className="badge">No help used</li>}
          {beatPar && <li className="badge">Under par</li>}
        </ul>
        <p className="dialog__note">
          Par for this one is {formatDuration(puzzle.par * 1000)}.{" "}
          {bestMs !== null && !newBest && <>Your best is {formatDuration(bestMs, { padMinutes: true })}.</>}
        </p>
        <div className="dialog__actions">
          {nextHref && (
            <Link className="btn btn--primary" href={nextHref}>
              Next puzzle
            </Link>
          )}
          <Link className="btn" href="/stats">
            See stats
          </Link>
          <button type="button" className="btn btn--ghost" onClick={onDismiss}>
            Back to grid
          </button>
        </div>
      </div>
    </div>
  );
}
