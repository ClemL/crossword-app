"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration } from "@/lib/format";
import { share, shareText } from "@/lib/share";
import type { Puzzle } from "@/lib/types";

interface CompleteDialogProps {
  puzzle: Puzzle;
  playerName: string;
  elapsedMs: number;
  bestMs: number | null;
  clean: boolean;
  nextHref?: string;
  onDismiss: () => void;
}

const SHARE_LABEL = {
  idle: "Share",
  shared: "Shared",
  copied: "Copied",
  failed: "Couldn't copy",
};

export function CompleteDialog({
  puzzle,
  playerName,
  elapsedMs,
  bestMs,
  clean,
  nextHref,
  onDismiss,
}: CompleteDialogProps) {
  const beatPar = elapsedMs <= puzzle.par * 1000;
  const newBest = bestMs !== null && elapsedMs <= bestMs;
  const [shareState, setShareState] = useState<keyof typeof SHARE_LABEL>("idle");

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
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const result = await share(
                shareText({ puzzle, playerName, elapsedMs, clean, isBest: newBest }),
              );
              setShareState(result);
              window.setTimeout(() => setShareState("idle"), 2500);
            }}
          >
            {SHARE_LABEL[shareState]}
          </button>
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
