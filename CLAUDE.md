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

| Size  | Grid    | Feel                                  |
| ----- | ------- | ------------------------------------- |
| Micro | 3 x 3   | Six answers, about a minute           |
| Mini  | 5 x 5   | Coffee break                          |
| Daily | 15 x 15 | A full themeless grid                 |

It is a fully client-side app: a timer, solve metrics, saved progress and the whole puzzle bank live
on the device. There is no backend and no account.

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
* `src/lib/storage.ts` — every localStorage read/write. Keys are namespaced `crossword:v1:*`.
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
npm run gen:puzzles  # regenerate src/data/puzzles.json (slow: minutes, needs network once)
npm run gen:icons    # regenerate the PNG app icons
```

## How puzzles are made

`npm run gen:puzzles` builds the bank offline and writes `src/data/puzzles.json`, which is
committed. The app never generates puzzles at runtime.

1. **Answer bank** (`scripts/lib/lexicon.mjs`) — hand-written clues for common short fill, plus the
   public-domain Webster's 1913 dictionary for everything else, plus inflected forms (`-S`, `-ED`,
   `-ING`, …) derived from words we can already clue. Every answer is scored into a tier by corpus
   frequency; small puzzles are restricted to the common tiers.
2. **Grid** (`scripts/lib/grid.mjs`) — random 180°-rotationally-symmetric block patterns, validated
   for minimum run length and connectivity.
3. **Fill** (`scripts/lib/fill.mjs`) — a CSP solver: bitset domains per entry, arc-consistency
   propagation across crossings, most-constrained-entry ordering, randomized restarts.

Sources are cached in `scripts/.cache/` (gitignored), so only the first run needs the network.

**No commercial crossword content is used.** Clues are either hand-written here or derived from a
public-domain dictionary. A clue ending `…, with "ED" added` means exactly that: solve the clue, then add the
ending — the convention is explained on the home page.

## Conventions

* Comments explain *why*, not *what*. Skip them where the code already says it.
* Storage writes go through `src/lib/storage.ts` so the `crossword:storage` event fires and the UI
  updates.
* Anything touching `localStorage` needs a `typeof window` guard or must run after hydration —
  the app is prerendered.
* Bump the `NS` constant in `storage.ts` if a saved-data shape changes incompatibly.
