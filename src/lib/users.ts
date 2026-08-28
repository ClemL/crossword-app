export interface User {
  id: string;
  name: string;
  /** Shown on the profile picker so the two banks are distinguishable. */
  blurb: string;
}

// There is no backend and no login: a profile is just which bank of puzzles you
// are playing and which slice of localStorage your progress goes into.
export const USERS: User[] = [
  {
    id: "clem",
    name: "Clem",
    blurb: "Climbing, golf, Boston and Japan — plus SQL, Dota, Elden Ring and graphics cards.",
  },
  {
    id: "lori",
    name: "Lori",
    blurb: "Climbing, golf, memes, Korea, Japan, Boston, healthcare and the rest.",
  },
];

export const DEFAULT_USER = USERS[0].id;

export function getUser(id: string | null | undefined): User | undefined {
  return USERS.find((u) => u.id === id);
}
