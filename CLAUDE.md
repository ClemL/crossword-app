# CLAUDE.md

Guidance for Claude Code (and anyone else) working in this repository.

## Working agreements

These apply to every request in this repo.

* **Always start a new branch for each request.** Do not commit directly to `main`/`master`, and do
  not stack an unrelated request's changes onto a branch created for a previous one. Name the branch
  after the work being done (e.g. `claude/<short-description>`).
* **Open a pull request when the work is done.** Once changes are committed and pushed, open a PR
  against the default branch summarizing what changed and why, so it can be reviewed before merging.
* **Verify the app builds (`npm run build`) before opening the PR.**
* **Post the links at the end of every response** — the Vercel app, the Vercel pipeline and the git
  repo — so they can be opened quickly:
  * App: https://crossword-app.vercel.app/
  * Pipeline: https://vercel.com/clem21/crossword-app
  * Repo: https://github.com/ClemL/crossword-app

  (For reference, the sibling project uses the same shape:
  https://vercel.com/clem21/clems-meditation-app, https://clems-meditation-app.vercel.app/ and
  https://github.com/ClemL/meditation-app.)

## What this project is

A crossword app in the spirit of the NYT one, with three sizes:

| Size  | Grid    | Per player | Feel                        |
| ----- | ------- | ---------- | --------------------------- |
| Micro | 3 x 3   | 5          | Six answers, about a minute |
| Mini  | 5 x 5   | 5          | Coffee break                |
| Daily | 15 x 15 | 5          | A full grid                 |

It is a fully client-side app: a timer, solve metrics, saved progress and the whole puzzle bank live
on the device. There is no backend and no account.

### Two players

There are two profiles, **clem** and **lori**. A profile is not a login — it decides which bank of
puzzles you see and which slice of `localStorage` your progress goes into. It is chosen on first
visit and switchable from the header.

Puzzles are built around a list of topics. Both players share the main list (rock climbing, golf,
Reddit, memes, Korea, Japan, Hong Kong, Vietnam, PCs, video gaming, board games, Boston, Arlington
MA, Quincy MA, healthcare, big pharma); Clem's bank also draws on programming, finance, SQL, C#,
Magic: the Gathering, graphics cards, Dota, StarCraft, Elden Ring, Red Dead Redemption 2, sysadmin
and helpdesk work, and hospital data.

## Stack

* **Next.js (App Router) + React + TypeScript**, exported as a static site (`output: "export"`).
  Static export is deliberate: it makes every route cacheable by the service worker, which is what
  makes offline play work.
* **Plain CSS** in `src/app/globals.css` with CSS custom properties for theming. No CSS framework.
* **Vercel** for hosting. `vercel.json` sets the cache headers for the service worker.

## Layout

```
src/app/           routes: / (bank), /play (one puzzle), /stats (metrics)
src/components/    grid, clue lists, toolbar, on-screen keyboard, dialogs
src/lib/           puzzle model, navigation, localStorage, stats, hooks
src/data/          puzzles.json — the generated puzzle bank (committed)
scripts/           puzzle + icon generation, post-build service worker step
public/            manifest, service worker template, icons
```

### Key files

* `src/lib/useGame.ts` — all gameplay state: letters, cursor, direction, clock, check/reveal.
* `src/lib/users.ts` — the two profiles.
* `src/lib/storage.ts` — every localStorage read/write. Progress and stats are per player
  (`crossword:v1:<player>:*`); the theme and the chosen player are not.
* `scripts/lib/themes-*.mjs` — the themed answer bank: `themes-shared.mjs` and `themes-clem.mjs`
  hold the longer answers, `themes-short.mjs` the three-to-five-letter ones. Adding entries here is
  the single most effective way to raise how much of a grid comes out on-theme.
* `src/lib/useStorage.ts` — `useSyncExternalStore` wrapper so components re-read storage on change
  instead of copying it into state inside an effect.
* `public/sw.js` — offline cache. `__PRECACHE__` is replaced at build time.
* `scripts/postbuild.mjs` — injects the real asset list into `out/sw.js`. Runs as part of
  `npm run build`; without it the first offline visit can miss a route's JS chunk.

## Commands

```bash
npm run dev          # local dev server
npm run build        # next build + service-worker precache injection (run before every PR)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run gen:puzzles  # regenerate src/data/puzzles.json (slow: ~50 min, needs network once)
npm run reclue       # re-pick clues for the existing grids (fast) after a clue-rule change
npm run gen:icons    # regenerate the PNG app icons
```

## How puzzles are made

`npm run gen:puzzles` builds the bank offline and writes `src/data/puzzles.json`, which is
committed. The app never generates puzzles at runtime.

1. **Answer bank** (`scripts/lib/lexicon.mjs`) — the themed answers, plus hand-written clues for
   common short fill, plus the public-domain Webster's 1913 dictionary for everything else, plus
   inflected forms (`-S`, `-ED`, `-ING`, …) derived from words we can already clue. Every answer is
   scored into a tier by corpus frequency; themed answers sit below every other tier, so the filler
   reaches for them first.
2. **Grid** (`scripts/lib/grid.mjs`) — random 180°-rotationally-symmetric block patterns, validated
   for minimum run length and connectivity.
3. **Fill** (`scripts/lib/fill.mjs`) — a CSP solver: bitset domains per entry, arc-consistency
   propagation across crossings, most-constrained-entry ordering, randomized restarts. It also
   accepts *seeds*: themed answers pinned into chosen entries before the search starts.

### Getting puzzles on-theme

Two things do the work, and both are in the generator's plan `ladder`:

* **Seeds** — a few mutually non-crossing entries are pinned to themed answers up front
  (`scripts/lib/theme-seed.mjs`). They must not cross: two crossing themed answers pin a shared
  letter from both sides, which is what makes a themed grid impossible to close.
* **Bank width** — each plan is tried narrowest-bank-first. The fewer ordinary words the filler can
  reach for, the more of the grid ends up themed, so the first rung that closes the grid is the most
  themed one available. A 3x3 usually closes on the narrowest rung and comes out 50-67% themed; a
  15x15 needs the widest and lands nearer a quarter.

How themed a grid can get is set by how many themed answers exist at each length. If you want more,
add entries to `scripts/lib/themes-short.mjs` — that is where the interlock pressure is.

Sources are cached in `scripts/.cache/` (gitignored), so only the first run needs the network.

Filling a 15x15 takes minutes, so improving a *clue* rule should not mean regenerating puzzles whose
grids are fine: `npm run reclue` rebuilds the answer bank and re-picks every clue in place. It
refuses to write if any answer in the existing bank has become uncluable, since that would mean the
grids really do need regenerating.

**No commercial crossword content is used.** Clues are either hand-written here or derived from a
public-domain dictionary. A clue ending `…, plus "ED"` means exactly that: solve the clue, then add the ending —
the convention is explained on the home page.

## Conventions

* Comments explain *why*, not *what*. Skip them where the code already says it.
* Storage writes go through `src/lib/storage.ts` so the `crossword:storage` event fires and the UI
  updates.
* Anything touching `localStorage` needs a `typeof window` guard or must run after hydration —
  the app is prerendered.
* Bump the `NS` constant in `storage.ts` if a saved-data shape changes incompatibly.
* A puzzle's `user` field is the key its progress and stats are filed under — never the currently
  selected player. Opening someone else's link offers to switch rather than writing into their
  history.
