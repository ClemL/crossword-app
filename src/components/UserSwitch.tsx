"use client";

import { USERS } from "@/lib/users";
import { useUser } from "@/lib/useUser";

/** Header control for swapping between the two players. */
export function UserSwitch() {
  const { user, setUser, hydrated } = useUser();
  if (!hydrated || !user) return null;

  return (
    <div className="userswitch" role="group" aria-label="Player">
      {USERS.map((candidate) => (
        <button
          key={candidate.id}
          type="button"
          className={candidate.id === user.id ? "userswitch__on" : ""}
          aria-pressed={candidate.id === user.id}
          onClick={() => setUser(candidate.id)}
        >
          {candidate.name}
        </button>
      ))}
    </div>
  );
}
