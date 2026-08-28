"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPuzzle } from "@/lib/puzzles";
import { PlayScreen } from "@/components/PlayScreen";

function PlayRoute() {
  const params = useSearchParams();
  const puzzle = getPuzzle(params.get("id"));

  if (!puzzle) {
    return (
      <main className="page page--narrow">
        <h1>Puzzle not found</h1>
        <p className="muted">That link points at a puzzle that isn&apos;t in the bank.</p>
        <Link className="btn btn--primary" href="/">
          Back to puzzles
        </Link>
      </main>
    );
  }

  return <PlayScreen key={puzzle.id} puzzle={puzzle} />;
}

export default function PlayPage() {
  return (
    <Suspense fallback={<main className="page page--narrow"><p className="muted">Loading…</p></main>}>
      <PlayRoute />
    </Suspense>
  );
}
