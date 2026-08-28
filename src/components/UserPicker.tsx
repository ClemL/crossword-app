"use client";

import { USERS } from "@/lib/users";
import { puzzlesOfUser } from "@/lib/puzzles";

/** Shown until a player is chosen. Their choice is remembered on the device. */
export function UserPicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <main className="page page--center">
      <div className="picker">
        <h1 className="hero__title">Crossword</h1>
        <p className="hero__sub">Who&apos;s playing? Each of you gets your own puzzles and stats.</p>
        <div className="picker__grid">
          {USERS.map((user) => (
            <button key={user.id} type="button" className="picker__card" onClick={() => onPick(user.id)}>
              <span className="picker__name">{user.name}</span>
              <span className="picker__blurb">{user.blurb}</span>
              <span className="picker__count">{puzzlesOfUser(user.id).length} puzzles</span>
            </button>
          ))}
        </div>
        <p className="muted">You can switch at any time from the header.</p>
      </div>
    </main>
  );
}
