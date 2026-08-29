"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface MenuProps {
  label: string;
  /** Heading for the phone sheet, where a glyph trigger says nothing on its own. */
  title?: string;
  children: (close: () => void) => ReactNode;
}

/** Must match the transition on .menu__panel, or the sheet unmounts mid-slide. */
const SLIDE_MS = 200;

/**
 * Dropdown on a wide screen, sliding panel on a phone. The trigger sits at the
 * right edge of the header, so a dropdown there opens leftwards off-screen.
 */
export function Menu({ label, title, children }: MenuProps) {
  // Two flags rather than one: the panel has to mount closed before it can be
  // moved into view, and stay mounted long enough to slide back out again.
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setShown(false), []);

  const open = useCallback(() => {
    setMounted(true);
    // Two frames: one for the closed panel to be painted, one to move it.
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  }, []);

  useEffect(() => {
    if (shown || !mounted) return;
    const id = setTimeout(() => setMounted(false), SLIDE_MS);
    return () => clearTimeout(id);
  }, [shown, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setShown(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShown(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [mounted]);

  // The sheet covers the page on a phone, so the page behind it must not scroll.
  useEffect(() => {
    if (!shown) return;
    document.body.classList.add("has-sheet");
    return () => document.body.classList.remove("has-sheet");
  }, [shown]);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="btn btn--ghost"
        aria-expanded={shown}
        aria-haspopup="menu"
        onClick={() => (shown ? close() : open())}
      >
        {label}
      </button>
      {mounted && (
        <>
          <div
            className={`menu__scrim${shown ? " is-open" : ""}`}
            onClick={close}
            aria-hidden="true"
          />
          <div
            className={`menu__panel${shown ? " is-open" : ""}`}
            role="menu"
            aria-label={title ?? label}
          >
            <div className="menu__head">
              <span>{title ?? label}</span>
              <button type="button" className="menu__close" onClick={close} aria-label="Close menu">
                ×
              </button>
            </div>
            {children(close)}
          </div>
        </>
      )}
    </div>
  );
}
