"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Clue, Direction, Puzzle } from "./types";
import {
  BLOCK,
  advance,
  buildCellClueMap,
  cluesFor,
  countFilled,
  isCorrect,
  move,
  retreat,
} from "./puzzle";
import { recordSolve, saveProgress, type PuzzleProgress } from "./storage";

export type CheckMark = "correct" | "wrong";
export type GameStatus = "playing" | "paused" | "solved";

const TICK_MS = 1000;

function unpack(text: string, length: number, fallback: string): string[] {
  const out = new Array<string>(length);
  for (let i = 0; i < length; i++) out[i] = text[i] && text[i] !== "." ? text[i] : fallback;
  return out;
}

function packLetters(entries: string[]): string {
  return entries.map((c) => (c === "" ? "." : c)).join("");
}

function packFlags(flags: boolean[]): string {
  return flags.map((f) => (f ? "1" : "0")).join("");
}

function unpackFlags(text: string, length: number): boolean[] {
  return Array.from({ length }, (_, i) => text[i] === "1");
}

/**
 * Drives one puzzle: the letters, the cursor, the clock and every toolbar
 * action. `saved` is the persisted state read by the caller before mounting, so
 * the hook can seed itself directly instead of reading storage in an effect.
 */
export function useGame(puzzle: Puzzle, saved: PuzzleProgress) {
  const size = puzzle.solution.length;
  const cellClues = useMemo(() => buildCellClueMap(puzzle), [puzzle]);
  const across = useMemo(() => cluesFor(puzzle, "across"), [puzzle]);
  const down = useMemo(() => cluesFor(puzzle, "down"), [puzzle]);

  const firstCell = useMemo(
    () => puzzle.solution.findIndex((c) => c !== BLOCK),
    [puzzle],
  );

  const usable = saved.letters.length === size;

  const [status, setStatus] = useState<GameStatus>(() =>
    usable && saved.completedAt ? "solved" : "playing",
  );
  const [entries, setEntries] = useState<string[]>(() =>
    usable
      ? unpack(saved.letters, size, "").map((c, i) => (puzzle.solution[i] === BLOCK ? BLOCK : c))
      : puzzle.solution.map((c) => (c === BLOCK ? BLOCK : "")),
  );
  const [pencil, setPencil] = useState<boolean[]>(() =>
    usable ? unpackFlags(saved.pencil, size) : new Array(size).fill(false),
  );
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    usable ? unpackFlags(saved.revealed, size) : new Array(size).fill(false),
  );
  const [marks, setMarks] = useState<Record<number, CheckMark>>({});
  const [cursor, setCursor] = useState(firstCell);
  const [direction, setDirection] = useState<Direction>("across");
  const [pencilMode, setPencilMode] = useState(false);
  const [autocheck, setAutocheck] = useState(() => (usable ? saved.autocheck : false));
  const [elapsedMs, setElapsedMs] = useState(() => (usable ? saved.elapsedMs : 0));
  const [justSolved, setJustSolved] = useState(false);

  const meta = useRef(
    usable
      ? {
          startedAt: saved.startedAt,
          checkCount: saved.checkCount,
          revealCount: saved.revealCount,
          mistakes: saved.mistakes,
        }
      : { startedAt: null as number | null, checkCount: 0, revealCount: 0, mistakes: 0 },
  );
  const solvedRef = useRef(Boolean(usable && saved.completedAt));

  // --- persistence ---------------------------------------------------------
  const persist = useCallback(
    (patch: Partial<PuzzleProgress> = {}) => {
      saveProgress(puzzle.id, {
        letters: packLetters(entries),
        pencil: packFlags(pencil),
        revealed: packFlags(revealed),
        elapsedMs,
        startedAt: meta.current.startedAt,
        completedAt: solvedRef.current ? Date.now() : null,
        checkCount: meta.current.checkCount,
        revealCount: meta.current.revealCount,
        mistakes: meta.current.mistakes,
        autocheck,
        ...patch,
      });
    },
    [puzzle.id, entries, pencil, revealed, elapsedMs, autocheck],
  );

  useEffect(() => {
    persist();
  }, [persist]);

  // --- timer ---------------------------------------------------------------
  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => setElapsedMs((ms) => ms + TICK_MS), TICK_MS);
    return () => window.clearInterval(id);
  }, [status]);

  // Stop the clock when the tab goes away, so a puzzle left open overnight does
  // not report a twelve-hour solve.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setStatus((s) => (s === "playing" ? "paused" : s));
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // --- derived -------------------------------------------------------------
  const activeClue: Clue | undefined = cellClues.get(cursor)?.[direction];
  const crossClue: Clue | undefined =
    cellClues.get(cursor)?.[direction === "across" ? "down" : "across"];
  const progress = useMemo(() => countFilled(puzzle, entries), [puzzle, entries]);

  const finish = useCallback(
    (finalEntries: string[]) => {
      if (solvedRef.current) return;
      if (!isCorrect(puzzle, finalEntries)) return;
      solvedRef.current = true;
      setStatus("solved");
      setJustSolved(true);
      const clean = meta.current.checkCount === 0 && meta.current.revealCount === 0;
      recordSolve({
        puzzleId: puzzle.id,
        size: puzzle.size,
        ms: elapsedMs,
        finishedAt: Date.now(),
        clean,
        checks: meta.current.checkCount,
        reveals: meta.current.revealCount,
      });
      saveProgress(puzzle.id, {
        letters: packLetters(finalEntries),
        pencil: packFlags(pencil),
        revealed: packFlags(revealed),
        elapsedMs,
        startedAt: meta.current.startedAt,
        completedAt: Date.now(),
        checkCount: meta.current.checkCount,
        revealCount: meta.current.revealCount,
        mistakes: meta.current.mistakes,
        autocheck,
      });
    },
    [puzzle, elapsedMs, pencil, revealed, autocheck],
  );

  // --- actions -------------------------------------------------------------
  // Clicking the square you are already on flips between across and down, the
  // way the NYT app behaves. The very first click is exempt: the cursor starts
  // on square one without the player having put it there.
  const touched = useRef(false);
  const selectCell = useCallback(
    (cell: number) => {
      if (puzzle.solution[cell] === BLOCK) return;
      const repeat = touched.current && cell === cursor;
      touched.current = true;
      if (!repeat) {
        setCursor(cell);
        return;
      }
      const other: Direction = direction === "across" ? "down" : "across";
      if (cellClues.get(cell)?.[other]) setDirection(other);
    },
    [puzzle.solution, cursor, direction, cellClues],
  );

  const setDir = useCallback(
    (dir: Direction) => {
      if (cellClues.get(cursor)?.[dir]) setDirection(dir);
    },
    [cellClues, cursor],
  );

  const typeLetter = useCallback(
    (letter: string, skipFilled: boolean) => {
      if (status === "solved") return;
      if (status === "paused") setStatus("playing");
      if (revealed[cursor]) return;
      if (meta.current.startedAt === null) meta.current.startedAt = Date.now();

      setEntries((prev) => {
        const next = [...prev];
        next[cursor] = letter.toUpperCase();
        if (autocheck && next[cursor] !== puzzle.solution[cursor]) {
          meta.current.mistakes += 1;
        }
        queueMicrotask(() => finish(next));
        return next;
      });
      setPencil((prev) => {
        const next = [...prev];
        next[cursor] = pencilMode;
        return next;
      });
      setMarks((prev) => {
        const next = { ...prev };
        delete next[cursor];
        if (autocheck) {
          next[cursor] = letter.toUpperCase() === puzzle.solution[cursor] ? "correct" : "wrong";
        }
        return next;
      });

      if (activeClue) {
        const step = advance(puzzle, activeClue, cursor, entries, { skipFilled });
        setCursor(step.cell);
        if (step.clue.direction !== direction) setDirection(step.clue.direction);
      }
    },
    [status, revealed, cursor, autocheck, puzzle, pencilMode, activeClue, entries, direction, finish],
  );

  const backspace = useCallback(() => {
    if (status === "solved") return;
    setEntries((prev) => {
      const next = [...prev];
      if (next[cursor] && !revealed[cursor]) {
        next[cursor] = "";
        return next;
      }
      if (activeClue) {
        const back = retreat(activeClue, cursor);
        if (!revealed[back]) next[back] = "";
        setCursor(back);
      }
      return next;
    });
    setMarks((prev) => {
      const next = { ...prev };
      delete next[cursor];
      return next;
    });
  }, [status, cursor, revealed, activeClue]);

  const moveCursor = useCallback(
    (dRow: number, dCol: number) => {
      const wanted: Direction = dRow === 0 ? "across" : "down";
      if (direction !== wanted && cellClues.get(cursor)?.[wanted]) {
        setDirection(wanted);
        return;
      }
      setCursor((c) => move(puzzle, c, dRow, dCol));
    },
    [direction, cellClues, cursor, puzzle],
  );

  const goToClue = useCallback(
    (clue: Clue) => {
      setDirection(clue.direction);
      const blank = clue.cells.find((c) => !entries[c]);
      setCursor(blank ?? clue.cells[0]);
    },
    [entries],
  );

  const stepClue = useCallback(
    (delta: number) => {
      if (!activeClue) return;
      const list = activeClue.direction === "across" ? across : down;
      const at = list.findIndex((c) => c.number === activeClue.number);
      const next = list[(at + delta + list.length) % list.length];
      goToClue(next);
    },
    [activeClue, across, down, goToClue],
  );

  const cellsFor = useCallback(
    (scope: "square" | "word" | "puzzle"): number[] => {
      if (scope === "square") return [cursor];
      if (scope === "word") return activeClue ? [...activeClue.cells] : [cursor];
      return puzzle.solution.map((_, i) => i).filter((i) => puzzle.solution[i] !== BLOCK);
    },
    [cursor, activeClue, puzzle.solution],
  );

  const check = useCallback(
    (scope: "square" | "word" | "puzzle") => {
      meta.current.checkCount += 1;
      const cells = cellsFor(scope);
      setMarks((prev) => {
        const next = { ...prev };
        for (const cell of cells) {
          if (!entries[cell]) continue;
          const ok = entries[cell] === puzzle.solution[cell];
          next[cell] = ok ? "correct" : "wrong";
          if (!ok) meta.current.mistakes += 1;
        }
        return next;
      });
    },
    [cellsFor, entries, puzzle.solution],
  );

  const reveal = useCallback(
    (scope: "square" | "word" | "puzzle") => {
      meta.current.revealCount += 1;
      const cells = cellsFor(scope);
      setEntries((prev) => {
        const next = [...prev];
        for (const cell of cells) next[cell] = puzzle.solution[cell];
        queueMicrotask(() => finish(next));
        return next;
      });
      setRevealed((prev) => {
        const next = [...prev];
        for (const cell of cells) next[cell] = true;
        return next;
      });
      setMarks((prev) => {
        const next = { ...prev };
        for (const cell of cells) delete next[cell];
        return next;
      });
    },
    [cellsFor, puzzle.solution, finish],
  );

  const clear = useCallback(
    (scope: "square" | "word" | "puzzle") => {
      const cells = cellsFor(scope);
      setEntries((prev) => {
        const next = [...prev];
        for (const cell of cells) if (!revealed[cell]) next[cell] = "";
        return next;
      });
      setMarks((prev) => {
        const next = { ...prev };
        for (const cell of cells) delete next[cell];
        return next;
      });
    },
    [cellsFor, revealed],
  );

  const restart = useCallback(() => {
    solvedRef.current = false;
    meta.current = { startedAt: null, checkCount: 0, revealCount: 0, mistakes: 0 };
    setEntries(puzzle.solution.map((c) => (c === BLOCK ? BLOCK : "")));
    setPencil(new Array(size).fill(false));
    setRevealed(new Array(size).fill(false));
    setMarks({});
    setElapsedMs(0);
    setCursor(firstCell);
    setDirection("across");
    setJustSolved(false);
    setStatus("playing");
  }, [puzzle.solution, size, firstCell]);

  const togglePause = useCallback(() => {
    setStatus((s) => (s === "playing" ? "paused" : s === "paused" ? "playing" : s));
  }, []);

  const toggleAutocheck = useCallback(() => {
    setAutocheck((prev) => {
      const next = !prev;
      if (next) {
        setMarks(() => {
          const marksNext: Record<number, CheckMark> = {};
          entries.forEach((letter, cell) => {
            if (!letter || letter === BLOCK) return;
            marksNext[cell] = letter === puzzle.solution[cell] ? "correct" : "wrong";
          });
          return marksNext;
        });
      } else {
        setMarks({});
      }
      return next;
    });
  }, [entries, puzzle.solution]);

  return {
    status,
    entries,
    pencil,
    revealed,
    marks,
    cursor,
    direction,
    activeClue,
    crossClue,
    across,
    down,
    elapsedMs,
    progress,
    pencilMode,
    autocheck,
    justSolved,
    dismissSolved: () => setJustSolved(false),
    actions: {
      selectCell,
      setDirection: setDir,
      toggleDirection: () => setDir(direction === "across" ? "down" : "across"),
      typeLetter,
      backspace,
      moveCursor,
      goToClue,
      stepClue,
      check,
      reveal,
      clear,
      restart,
      togglePause,
      togglePencil: () => setPencilMode((p) => !p),
      toggleAutocheck,
    },
  };
}
