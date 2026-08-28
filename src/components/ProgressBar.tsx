"use client";

interface ProgressBarProps {
  filled: number;
  total: number;
}

/** How much of the grid is filled in — the only such cue on a phone. */
export function ProgressBar({ filled, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={filled}
      aria-label={`${filled} of ${total} squares filled, ${total - filled} to go`}
      title={`${filled} filled · ${total - filled} to go`}
    >
      <span className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
