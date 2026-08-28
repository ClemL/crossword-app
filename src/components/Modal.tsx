"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  /** Rendered as a list when given — the common case for this app. */
  items?: string[];
  children?: ReactNode;
}

/**
 * Overlay-and-panel dialog shared by the changelog, the topic list and the
 * end-of-puzzle summary.
 */
export function Modal({ title, onClose, items, children }: ModalProps) {
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="overlay"
      ref={overlay}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // Close on the backdrop only. Without the target check, a click anywhere
      // inside the panel bubbles up here and shuts the dialog.
      onClick={(event) => {
        if (event.target === overlay.current) onClose();
      }}
    >
      <div className="dialog dialog--panel">
        <div className="dialog__head">
          <h2>{title}</h2>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {items && (
          <ul className="dialog__list">
            {items.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </div>
  );
}
