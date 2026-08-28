"use client";

import type { Clue } from "@/lib/types";

interface ClueBarProps {
  clue?: Clue;
  onPrev: () => void;
  onNext: () => void;
  onToggleDirection: () => void;
  onShowAll: () => void;
}

export function ClueBar({ clue, onPrev, onNext, onToggleDirection, onShowAll }: ClueBarProps) {
  return (
    <div className="clue-bar">
      <button type="button" className="clue-bar__arrow" onClick={onPrev} aria-label="Previous clue">
        ‹
      </button>
      <button type="button" className="clue-bar__text" onClick={onToggleDirection}>
        {clue ? (
          <>
            <span className="clue-bar__number">
              {clue.number}
              {clue.direction === "across" ? "A" : "D"}
            </span>
            <span>{clue.text}</span>
          </>
        ) : (
          <span>Pick a square to start</span>
        )}
      </button>
      <button type="button" className="clue-bar__arrow" onClick={onNext} aria-label="Next clue">
        ›
      </button>
      <button
        type="button"
        className="clue-bar__all"
        onClick={onShowAll}
        aria-label="Show all clues"
        title="All clues"
      >
        ≡
      </button>
    </div>
  );
}
