"use client";

import { Modal } from "./Modal";
import type { Clue } from "@/lib/types";

interface AllCluesPanelProps {
  across: Clue[];
  down: Clue[];
  entries: string[];
  activeNumber?: number;
  activeDirection?: string;
  onPick: (clue: Clue) => void;
  onClose: () => void;
}

/** What has been typed into an entry so far, blanks as middle dots. */
function fillOf(clue: Clue, entries: string[]): string {
  return clue.cells.map((cell) => entries[cell] || "·").join("");
}

/**
 * Every clue in one scrollable list, with whatever is already in the grid shown
 * beside it. The clue lists sit next to the grid on a wide screen; on a phone
 * there is no room, so this is how you read them.
 */
export function AllCluesPanel({
  across,
  down,
  entries,
  activeNumber,
  activeDirection,
  onPick,
  onClose,
}: AllCluesPanelProps) {
  const section = (title: string, clues: Clue[]) => (
    <section className="allclues__section" key={title}>
      <h3>{title}</h3>
      <ul>
        {clues.map((clue) => {
          const fill = fillOf(clue, entries);
          const done = !fill.includes("·");
          const active = clue.number === activeNumber && clue.direction === activeDirection;
          return (
            <li key={`${clue.number}${clue.direction}`}>
              <button
                type="button"
                className={[
                  "allclues__row",
                  done ? "allclues__row--done" : "",
                  active ? "allclues__row--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  onPick(clue);
                  onClose();
                }}
              >
                <span className="allclues__num">{clue.number}</span>
                <span className="allclues__text">{clue.text}</span>
                <span className="allclues__fill">{fill}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <Modal title="All clues" onClose={onClose}>
      <div className="allclues">
        {section("Across", across)}
        {section("Down", down)}
      </div>
    </Modal>
  );
}
