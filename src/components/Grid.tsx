"use client";

import { memo, useMemo } from "react";
import type { Clue, Direction, Puzzle } from "@/lib/types";
import { BLOCK } from "@/lib/puzzle";
import type { CheckMark } from "@/lib/useGame";

interface GridProps {
  puzzle: Puzzle;
  entries: string[];
  pencil: boolean[];
  revealed: boolean[];
  marks: Record<number, CheckMark>;
  cursor: number;
  direction: Direction;
  activeClue?: Clue;
  hidden?: boolean;
  onSelect: (cell: number) => void;
}

function GridImpl({
  puzzle,
  entries,
  pencil,
  revealed,
  marks,
  cursor,
  activeClue,
  hidden,
  onSelect,
}: GridProps) {
  const activeCells = useMemo(() => new Set(activeClue?.cells ?? []), [activeClue]);

  return (
    <div
      className="grid-wrap"
      style={{ ["--cols" as string]: puzzle.cols, ["--rows" as string]: puzzle.rows }}
    >
      <div className="grid" role="grid" aria-label={`${puzzle.rows} by ${puzzle.cols} crossword grid`}>
        {puzzle.solution.map((solutionChar, index) => {
          if (solutionChar === BLOCK) {
            return <div key={index} className="cell cell--block" aria-hidden="true" />;
          }
          const letter = entries[index] === BLOCK ? "" : entries[index];
          const mark = marks[index];
          const classes = [
            "cell",
            activeCells.has(index) ? "cell--in-word" : "",
            cursor === index ? "cell--cursor" : "",
            mark === "wrong" ? "cell--wrong" : "",
            mark === "correct" ? "cell--correct" : "",
            revealed[index] ? "cell--revealed" : "",
            pencil[index] && letter ? "cell--pencil" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={index}
              type="button"
              className={classes}
              onMouseDown={(event) => {
                // Keep focus on the hidden input that drives typing.
                event.preventDefault();
                onSelect(index);
              }}
              onTouchStart={() => onSelect(index)}
              aria-label={`Row ${Math.floor(index / puzzle.cols) + 1}, column ${(index % puzzle.cols) + 1}${letter ? `, ${letter}` : ", empty"}`}
              tabIndex={-1}
            >
              {puzzle.numbers[index] > 0 && (
                <span className="cell__number">{puzzle.numbers[index]}</span>
              )}
              <span className="cell__letter">{hidden ? "" : letter}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const Grid = memo(GridImpl);
