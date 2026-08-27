"use client";

import Link from "next/link";
import { Menu } from "./Menu";
import { formatDuration } from "@/lib/format";
import type { GameStatus } from "@/lib/useGame";

type Scope = "square" | "word" | "puzzle";

interface ToolbarProps {
  title: string;
  subtitle: string;
  elapsedMs: number;
  status: GameStatus;
  pencilMode: boolean;
  autocheck: boolean;
  onPause: () => void;
  onCheck: (scope: Scope) => void;
  onReveal: (scope: Scope) => void;
  onClear: (scope: Scope) => void;
  onRestart: () => void;
  onTogglePencil: () => void;
  onToggleAutocheck: () => void;
}

export function Toolbar({
  title,
  subtitle,
  elapsedMs,
  status,
  pencilMode,
  autocheck,
  onPause,
  onCheck,
  onReveal,
  onClear,
  onRestart,
  onTogglePencil,
  onToggleAutocheck,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar__identity">
        <Link href="/" className="toolbar__back" aria-label="Back to puzzles">
          ←
        </Link>
        <div>
          <p className="toolbar__title">{title}</p>
          <p className="toolbar__subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="toolbar__timer">
        <button
          type="button"
          className="timer"
          onClick={onPause}
          aria-label={status === "playing" ? "Pause timer" : "Resume timer"}
          disabled={status === "solved"}
        >
          <span className="timer__value">{formatDuration(elapsedMs, { padMinutes: true })}</span>
          <span className="timer__icon">{status === "playing" ? "❚❚" : "▶"}</span>
        </button>
      </div>

      <div className="toolbar__actions">
        <button
          type="button"
          className={`btn btn--ghost ${pencilMode ? "btn--on" : ""}`}
          onClick={onTogglePencil}
          aria-pressed={pencilMode}
          title="Pencil mode (P)"
        >
          ✏️ <span className="btn__label">Pencil</span>
        </button>

        <Menu label="Check">
          {(close) => (
            <>
              <button type="button" onClick={() => { onCheck("square"); close(); }}>Square</button>
              <button type="button" onClick={() => { onCheck("word"); close(); }}>Word</button>
              <button type="button" onClick={() => { onCheck("puzzle"); close(); }}>Puzzle</button>
              <hr />
              <button type="button" onClick={() => { onToggleAutocheck(); close(); }}>
                {autocheck ? "Turn autocheck off" : "Turn autocheck on"}
              </button>
            </>
          )}
        </Menu>

        <Menu label="Reveal">
          {(close) => (
            <>
              <button type="button" onClick={() => { onReveal("square"); close(); }}>Square</button>
              <button type="button" onClick={() => { onReveal("word"); close(); }}>Word</button>
              <button type="button" onClick={() => { onReveal("puzzle"); close(); }}>Puzzle</button>
            </>
          )}
        </Menu>

        <Menu label="More">
          {(close) => (
            <>
              <button type="button" onClick={() => { onClear("word"); close(); }}>Clear word</button>
              <button type="button" onClick={() => { onClear("puzzle"); close(); }}>Clear puzzle</button>
              <hr />
              <button type="button" onClick={() => { onRestart(); close(); }}>Restart (clock too)</button>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
