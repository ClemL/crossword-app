export interface User {
  id: string;
  name: string;
  /**
   * One line for the profile picker. Deliberately not a list of topics — the
   * full list lives behind Puzzle topics in the options menu.
   */
  blurb: string;
}

// There is no backend and no login: a profile is just which bank of puzzles you
// are playing and which slice of localStorage your progress goes into.
export const USERS: User[] = [
  {
    id: "clem",
    name: "Clem",
    blurb: "Puzzles built around Clem's topics.",
  },
  {
    id: "lori",
    name: "Lori",
    blurb: "Puzzles built around Lori's topics.",
  },
];

export const DEFAULT_USER = USERS[0].id;

export function getUser(id: string | null | undefined): User | undefined {
  return USERS.find((u) => u.id === id);
}
