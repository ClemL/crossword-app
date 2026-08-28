# Crossword

Three sizes of crossword — a 3x3 **micro**, a 5x5 **mini** and a full 15x15 **daily** — built
around a list of topics, with a timer, solve metrics and offline play. No account, no backend:
everything lives on your device.

* **App:** https://clem-crossword-app.vercel.app/
* **Pipeline:** https://vercel.com/clem21/clem-crossword-app
* **Repo:** https://github.com/ClemL/crossword-app

## Features

* **Two players.** Pick Clem or Lori on first visit and switch from the header. Each has their own
  puzzles, saved grids and stats; nothing is shared but the theme setting.
* **Themed puzzles.** Both banks share a main topic list, and each player has their own extra
  topics on top of it. The full list for whoever is playing is under **Puzzle topics** in the
  options menu.
* **Changelog** in the footer: the newest line is always visible, and clicking it opens the lot.
* **Three grid sizes**, five puzzles each per player, each with its own par time and stats.
* **Timer** that pauses when you switch tabs, so a puzzle left open overnight does not report a
  twelve-hour solve.
* **Metrics** — best, median and average time per size, current and longest day streak, how often
  you finish without help, and a bar chart of recent solves.
* **Offline first.** Installable as a PWA. The whole puzzle bank ships inside the bundle and a
  service worker precaches every route at build time, so it works with no connection from the first
  visit onwards.
* **Progress is saved** per puzzle — grid, pencil marks and clock — in `localStorage`.
* Check and reveal by square, word or puzzle; autocheck; pencil mode; light/dark/auto theme.

## Playing

| Input                    | Does                                           |
| ------------------------ | ---------------------------------------------- |
| Letter keys              | Fill the square and move on                    |
| Arrow keys               | Move around; pressing across the grain turns   |
| <kbd>Space</kbd>         | Switch between across and down                 |
| <kbd>Tab</kbd> / <kbd>⇧Tab</kbd> | Next / previous clue                   |
| <kbd>Backspace</kbd>     | Clear and step back                            |
| Click the current square | Switch direction                               |

On touch devices there is an on-screen keyboard and a tappable clue bar.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build       # production build + service-worker precache injection
npm run typecheck
npm run lint
```

## Where the puzzles come from

Puzzles are generated ahead of time by `npm run gen:puzzles` and committed to
`src/data/puzzles.json`; the app never generates them at runtime.

The answer bank starts with a few hundred hand-written themed answers, then adds hand-written
clues for common short fill, definitions from the public-domain **Webster's 1913** dictionary, and
inflected forms derived from words that already have clues. A clue ending `…, plus "ED"` means
exactly that: solve the clue, then add the ending.

Themed answers outrank everything else, some are pinned into the grid before solving starts, and
each puzzle is attempted against progressively wider banks so it lands at the highest themed density
that still closes. In practice a 3x3 comes out around half to two-thirds themed and a 15x15 nearer a
quarter — a 15x15 has eighty entries to fill and only so many themed answers to fill them with. The
lever is vocabulary: adding entries to `scripts/lib/themes-short.mjs` raises the density everywhere.

Grids are random 180°-rotationally-symmetric block patterns, filled by a constraint solver with
arc-consistency propagation. `npm run reclue` re-picks clues for the existing grids without the
minutes-long refill. See [CLAUDE.md](./CLAUDE.md) for the details.

No commercial crossword content is used.

## Deploying

Pushes deploy through Vercel. The build command is `npm run build` and the output directory is
`out/` (Next.js static export).
