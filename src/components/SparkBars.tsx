"use client";

import { formatDuration } from "@/lib/format";

interface SparkBarsProps {
  values: number[];
  labels?: string[];
}

/** Bar chart of recent solve times. Inline SVG keeps it offline-safe. */
export function SparkBars({ values, labels }: SparkBarsProps) {
  if (values.length === 0) {
    return <p className="muted">No solves yet.</p>;
  }
  const max = Math.max(...values);
  const width = 100;
  const gap = 2;
  const barWidth = (width - gap * (values.length - 1)) / values.length;

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} 40`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Recent solve times, fastest ${formatDuration(Math.min(...values))}, slowest ${formatDuration(max)}`}
    >
      {values.map((value, i) => {
        const height = max === 0 ? 1 : Math.max(2, (value / max) * 36);
        const fastest = value === Math.min(...values);
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={40 - height}
            width={barWidth}
            height={height}
            rx={1}
            className={fastest ? "spark__bar spark__bar--best" : "spark__bar"}
          >
            <title>{labels?.[i] ?? formatDuration(value)}</title>
          </rect>
        );
      })}
    </svg>
  );
}
