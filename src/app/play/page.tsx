"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPuzzle } from "@/lib/puzzles";
import { PlayScreen } from "@/components/PlayScreen";
import { SHARED_USER } from "@/lib/types";
import { getUser } from "@/lib/users";
import { useUser } from "@/lib/useUser";

function PlayRoute() {
  const params = useSearchParams();
  const puzzle = getPuzzle(params.get("id"));
  const { user, setUser, hydrated } = useUser();

  // Progress and stats are filed under the puzzle's owner, so opening someone
  // else's link would quietly write into their history. Offer the switch
  // instead of doing it silently.
  if (puzzle && hydrated && user && puzzle.user !== SHARED_USER && user.id !== puzzle.user) {
    const owner = getUser(puzzle.user);
    return (
      <main className="page page--narrow">
        <h1>That one is {owner?.name}&apos;s</h1>
        <p className="muted">
          You are playing as {user.name}. This puzzle is in {owner?.name}&apos;s bank, and the time
          would be recorded there.
        </p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={() => setUser(puzzle.user)}>
            Switch to {owner?.name}
          </button>
          <Link className="btn" href="/">
            Back to my puzzles
          </Link>
        </div>
      </main>
    );
  }

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
