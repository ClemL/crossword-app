"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

/**
 * Build info plus the most recent changelog line. Clicking the line opens the
 * whole changelog, newest first.
 */
export function SiteFooter() {
  const [updates, setUpdates] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Stored oldest-first, one entry per line. A missing or empty file is not
    // an error worth showing anyone.
    fetch("/updates.txt")
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (cancelled) return;
        setUpdates(
          text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = updates.at(-1);

  return (
    <footer className="build-info">
      <p className="build-info__version">
        Crossword · v{VERSION}
        {BUILD_TIME ? ` · built ${BUILD_TIME.slice(0, 16).replace("T", " ")}` : ""}
      </p>
      {latest && (
        <button type="button" className="build-info__latest" onClick={() => setOpen(true)}>
          {latest}
        </button>
      )}
      {open && (
        <Modal title="Changelog" items={[...updates].reverse()} onClose={() => setOpen(false)} />
      )}
    </footer>
  );
}
