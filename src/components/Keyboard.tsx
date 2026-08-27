"use client";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

interface KeyboardProps {
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onNext: () => void;
}

/** On-screen keyboard for touch devices — the grid never focuses a real input. */
export function Keyboard({ onKey, onBackspace, onNext }: KeyboardProps) {
  return (
    <div className="keyboard" role="group" aria-label="On-screen keyboard">
      {ROWS.map((row, i) => (
        <div key={row} className="keyboard__row">
          {i === 2 && (
            <button type="button" className="key key--wide" onClick={onNext}>
              next
            </button>
          )}
          {row.split("").map((letter) => (
            <button
              key={letter}
              type="button"
              className="key"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKey(letter)}
            >
              {letter}
            </button>
          ))}
          {i === 2 && (
            <button
              type="button"
              className="key key--wide"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onBackspace}
              aria-label="Delete"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
