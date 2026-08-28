"use client";

import { useEffect, useRef } from "react";
import type { Clue } from "@/lib/types";

interface ClueListProps {
  title: string;
  clues: Clue[];
  activeNumber?: number;
  isActiveDirection: boolean;
  solvedCells: (clue: Clue) => boolean;
  onSelect: (clue: Clue) => void;
}

export function ClueList({
  title,
  clues,
  activeNumber,
  isActiveDirection,
  solvedCells,
  onSelect,
}: ClueListProps) {
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isActiveDirection) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeNumber, isActiveDirection]);

  return (
    <section className="clue-list">
      <h2 className="clue-list__title">{title}</h2>
      <ol className="clue-list__items">
        {clues.map((clue) => {
          const active = clue.number === activeNumber;
          return (
            <li
              key={`${clue.number}-${clue.direction}`}
              ref={active && isActiveDirection ? activeRef : undefined}
              className={[
                "clue",
                active && isActiveDirection ? "clue--active" : "",
                active && !isActiveDirection ? "clue--crossing" : "",
                solvedCells(clue) ? "clue--done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button type="button" onClick={() => onSelect(clue)}>
                <span className="clue__number">{clue.number}</span>
                <span className="clue__text">{clue.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
