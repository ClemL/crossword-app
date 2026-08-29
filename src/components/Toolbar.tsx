"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
  skipFilled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPause: () => void;
  onCheck: (scope: Scope) => void;
  onReveal: (scope: Scope) => void;
  onClear: (scope: Scope) => void;
  onClearIncorrect: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRestart: () => void;
  onTogglePencil: () => void;
  onToggleAutocheck: () => void;
  onToggleSkipFilled: () => void;
}

export function Toolbar({
  title,
  subtitle,
  elapsedMs,
  status,
  pencilMode,
  autocheck,
  skipFilled,
  canUndo,
  canRedo,
  onPause,
  onCheck,
  onReveal,
  onClear,
  onClearIncorrect,
  onUndo,
  onRedo,
  onRestart,
  onTogglePencil,
  onToggleAutocheck,
  onToggleSkipFilled,
}: ToolbarProps) {
  const item = (label: string, action: () => void, close: () => void): ReactNode => (
    <button
      key={label}
      type="button"
      onClick={() => {
        action();
        close();
      }}
    >
      {label}
    </button>
  );

  const checkItems = (close: () => void) => [
    item("Check square", () => onCheck("square"), close),
    item("Check word", () => onCheck("word"), close),
    item("Check puzzle", () => onCheck("puzzle"), close),
    item(autocheck ? "Turn autocheck off" : "Turn autocheck on", onToggleAutocheck, close),
  ];

  const revealItems = (close: () => void) => [
    item("Reveal square", () => onReveal("square"), close),
    item("Reveal word", () => onReveal("word"), close),
    item("Reveal puzzle", () => onReveal("puzzle"), close),
  ];

  const moreItems = (close: () => void) => [
    item("Clear incorrect letters", onClearIncorrect, close),
    item("Clear word", () => onClear("word"), close),
    item("Clear puzzle", () => onClear("puzzle"), close),
    item(
      `Skip filled squares: ${skipFilled ? "on" : "off"}`,
      onToggleSkipFilled,
      close,
    ),
    item("Restart (clock too)", onRestart, close),
  ];

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
          className="btn btn--ghost btn--icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          ↷
        </button>
        <button
          type="button"
          className={`btn btn--ghost ${pencilMode ? "btn--on" : ""}`}
          onClick={onTogglePencil}
          aria-pressed={pencilMode}
          title="Pencil mode"
        >
          ✏️ <span className="btn__label">Pencil</span>
        </button>

        {/* Three menus on a wide screen; one on a phone, where the labels would
            squeeze the puzzle title out of the bar entirely. */}
        <div className="toolbar__wide">
          <Menu label="Check">{(close) => checkItems(close)}</Menu>
          <Menu label="Reveal">{(close) => revealItems(close)}</Menu>
          <Menu label="More">{(close) => moreItems(close)}</Menu>
        </div>

        <div className="toolbar__narrow">
          <Menu label="⋯" title="Puzzle actions">
            {(close) => (
              <>
                {checkItems(close)}
                <hr />
                {revealItems(close)}
                <hr />
                {moreItems(close)}
              </>
            )}
          </Menu>
        </div>
      </div>
    </header>
  );
}
