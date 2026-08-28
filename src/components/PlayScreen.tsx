"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AllCluesPanel } from "./AllCluesPanel";
import { ClueBar } from "./ClueBar";
import { Confetti } from "./Confetti";
import { ClueList } from "./ClueList";
import { CompleteDialog } from "./CompleteDialog";
import { Grid } from "./Grid";
import { Keyboard } from "./Keyboard";
import { OfflineBadge } from "./OfflineBadge";
import { ProgressBar } from "./ProgressBar";
import { Toolbar } from "./Toolbar";
import { useGame } from "@/lib/useGame";
import { useSettings } from "@/lib/useSettings";
import { nextForDay } from "@/lib/daily";
import { EMPTY_PROGRESS, loadProgress, loadStats, type PuzzleProgress } from "@/lib/storage";
import { useHydrated, useStorageVersion } from "@/lib/useStorage";
import { SIZES, SIZE_LABEL, type Clue, type Puzzle } from "@/lib/types";
import { getUser } from "@/lib/users";

/**
 * Waits for hydration before mounting the game, so the saved grid can seed the
 * game state directly rather than being patched in afterwards. The skeleton is
 * what gets prerendered.
 */
export function PlayScreen({ puzzle }: { puzzle: Puzzle }) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <main className={`play play--${puzzle.size}`}>
        <div className="play__body">
          <p className="muted">Opening puzzle…</p>
        </div>
      </main>
    );
  }
  return <PlayGame puzzle={puzzle} saved={loadProgress(puzzle.user, puzzle.id) ?? EMPTY_PROGRESS} />;
}

function PlayGame({ puzzle, saved }: { puzzle: Puzzle; saved: PuzzleProgress }) {
  const game = useGame(puzzle, saved);
  const { settings, update } = useSettings();
  const [showAllClues, setShowAllClues] = useState(false);
  const storageVersion = useStorageVersion();
  const bestMs = useMemo(
    () => (storageVersion >= 0 ? (loadStats(puzzle.user).best[puzzle.id] ?? null) : null),
    [puzzle.id, puzzle.user, storageVersion],
  );

  const { actions, entries, status } = game;

  const clueDone = useCallback(
    (clue: Clue) => clue.cells.every((cell) => entries[cell]),
    [entries],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        const key = event.key.toLowerCase();
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) actions.redo();
          else actions.undo();
        } else if (key === "y") {
          event.preventDefault();
          actions.redo();
        }
        return;
      }
      if (event.altKey) return;
      const key = event.key;

      if (/^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        actions.typeLetter(key, settings.skipFilled);
        return;
      }
      switch (key) {
        case "Backspace":
        case "Delete":
          event.preventDefault();
          actions.backspace();
          break;
        case "ArrowUp":
          event.preventDefault();
          actions.moveCursor(-1, 0);
          break;
        case "ArrowDown":
          event.preventDefault();
          actions.moveCursor(1, 0);
          break;
        case "ArrowLeft":
          event.preventDefault();
          actions.moveCursor(0, -1);
          break;
        case "ArrowRight":
          event.preventDefault();
          actions.moveCursor(0, 1);
          break;
        case " ":
          event.preventDefault();
          actions.toggleDirection();
          break;
        case "Tab":
          event.preventDefault();
          actions.stepClue(event.shiftKey ? -1 : 1);
          break;
        case "Enter":
          event.preventDefault();
          actions.stepClue(1);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, settings.skipFilled]);

  // Only offer a "next" when it is another of the same day's puzzles.
  const next = useMemo(
    () => nextForDay(puzzle.user, puzzle, SIZES.map((s) => s.key)),
    [puzzle],
  );
  const title = `${SIZE_LABEL[puzzle.size]} #${puzzle.ordinal}`;
  const subtitle = `${puzzle.rows} x ${puzzle.cols} · ${game.progress.filled}/${game.progress.total} squares`;

  return (
    <main className={`play play--${puzzle.size}`}>
      <OfflineBadge />
      <Toolbar
        title={title}
        subtitle={subtitle}
        elapsedMs={game.elapsedMs}
        status={status}
        pencilMode={game.pencilMode}
        autocheck={game.autocheck}
        skipFilled={settings.skipFilled}
        canUndo={game.canUndo}
        canRedo={game.canRedo}
        onPause={actions.togglePause}
        onCheck={actions.check}
        onReveal={actions.reveal}
        onClear={actions.clear}
        onClearIncorrect={actions.clearIncorrect}
        onUndo={actions.undo}
        onRedo={actions.redo}
        onRestart={actions.restart}
        onTogglePencil={actions.togglePencil}
        onToggleAutocheck={actions.toggleAutocheck}
        onToggleSkipFilled={() => update({ skipFilled: !settings.skipFilled })}
      />

      <ProgressBar filled={game.progress.filled} total={game.progress.total} />

      <ClueBar
        clue={game.activeClue}
        onPrev={() => actions.stepClue(-1)}
        onNext={() => actions.stepClue(1)}
        onToggleDirection={actions.toggleDirection}
        onShowAll={() => setShowAllClues(true)}
      />

      <div className="play__body">
        <div className="play__grid">
          <Grid
            puzzle={puzzle}
            entries={game.entries}
            pencil={game.pencil}
            revealed={game.revealed}
            marks={game.marks}
            cursor={game.cursor}
            activeClue={game.activeClue}
            hidden={status === "paused"}
            onSelect={actions.selectCell}
          />
          {status === "paused" && (
            <button type="button" className="pause-veil" onClick={actions.togglePause}>
              <span>Paused</span>
              <span className="muted">Tap to resume</span>
            </button>
          )}
        </div>

        <div className="play__clues">
          <ClueList
            title="Across"
            clues={game.across}
            activeNumber={game.direction === "across" ? game.activeClue?.number : game.crossClue?.number}
            isActiveDirection={game.direction === "across"}
            solvedCells={clueDone}
            onSelect={actions.goToClue}
          />
          <ClueList
            title="Down"
            clues={game.down}
            activeNumber={game.direction === "down" ? game.activeClue?.number : game.crossClue?.number}
            isActiveDirection={game.direction === "down"}
            solvedCells={clueDone}
            onSelect={actions.goToClue}
          />
        </div>
      </div>

      <Keyboard
        onKey={(letter) => actions.typeLetter(letter, settings.skipFilled)}
        onBackspace={actions.backspace}
        onNext={() => actions.stepClue(1)}
      />

      {showAllClues && (
        <AllCluesPanel
          across={game.across}
          down={game.down}
          entries={game.entries}
          activeNumber={game.activeClue?.number}
          activeDirection={game.direction}
          onPick={actions.goToClue}
          onClose={() => setShowAllClues(false)}
        />
      )}

      {game.justSolved && <Confetti />}

      {game.justSolved && (
        <CompleteDialog
          puzzle={puzzle}
          playerName={getUser(puzzle.user)?.name ?? puzzle.user}
          elapsedMs={game.elapsedMs}
          bestMs={bestMs}
          clean={!game.usedHelp}
          nextHref={next ? `/play?id=${next.id}` : undefined}
          onDismiss={game.dismissSolved}
        />
      )}
    </main>
  );
}
