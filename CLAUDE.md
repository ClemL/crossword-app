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
  * App: https://clem-crossword-app.vercel.app/
  * Pipeline: https://vercel.com/clem21/clem-crossword-app
  * Repo: https://github.com/ClemL/crossword-app

  (For reference, the sibling project uses the same shape:
  https://vercel.com/clem21/clems-meditation-app, https://clems-meditation-app.vercel.app/ and
  https://github.com/ClemL/meditation-app.)

## What this project is

A crossword app in the spirit of the NYT one, with three sizes:

| Size  | Grid    | Per player | Turns over | Feel                        |
| ----- | ------- | ---------- | ---------- | --------------------------- |
| Nano  | 3 x 3   | 90         | Daily      | Six answers, about a minute |
| Micro | 5 x 5   | 90         | Daily      | Coffee break                |
| Mini  | 7 x 7   | 90         | Daily      | Twenty-two answers          |
| Daily | 15 x 15 | 13         | Weekly     | A full grid                 |

The 7x7 needs blocks to close at all — a blockless one is a 7x7 double word square, which the
solver never finds. Eight is the count that fills reliably, and the plan also rejects any pattern
with fewer than twenty entries: the odd 8-block pattern carves the grid into a handful of long
entries crossing each other, and one of those eats minutes before failing where a 22-entry grid
fills in under a second.

### Themed packs

`/packs` holds six sets of eight 5x5s, each pulled toward a handful of subjects
(`scripts/lib/packs.mjs`). They are shared by both players rather than belonging to a bank, so a
pack puzzle carries `user: "shared"` and its progress files under whoever is playing — see
`progressOwner` in `src/lib/puzzles.ts`. They are not in the daily schedule.

Three things get a pack from the ~20% a themed 5x5 reaches by default to around 40%:

* **Vocabulary at the right lengths.** Density tracks how many themed answers are three to five
  letters, not the total. Greater Boston first came out at 14% off 217 answers because its subject
  is full of long place names — only 86 of them fit a 5x5.
* **Blockier grids.** Eight blocks rather than four: shorter entries interlock less. Measured at
  18-20% against 27-30% on the same vocabulary.
* **Best-of selection.** Seventy grids are filled per pack and the eight most themed are kept. This
  is the single biggest lever, and it is cheap because a 5x5 fills in a couple of seconds.

Pack vocabulary lives in `scripts/lib/themes-packs.mjs` as its own theme set, so adding to it never
changes what the committed daily bank was generated from. `npm run gen:packs` regenerates just the
packs (a few minutes) and leaves the daily bank and schedule alone.

### Which puzzle a date gets

`src/data/schedule.json`, written by the generator, maps ninety days from an epoch onto puzzle ids,
per player and per size. `src/lib/daily.ts` turns today's local date into an index into it. The
schedule wraps rather than running out, so dates before the epoch and after day ninety still resolve
to a puzzle — the app never hits a dead end because the bank was laid out a while ago.

Cadence is driven by what the generator can actually produce. A 3x3 fills in milliseconds and a 5x5
in about four and a half seconds, so ninety of each per player is minutes of work. A 15x15 averages
**104 seconds**, so ninety a player would be over five hours; the big grid turns over weekly
instead, which is also how anyone actually plays one. The schedule still stores one entry per day
for every size — a weekly puzzle simply repeats across its seven days — so the app's lookup is the
same for all three.

It is a fully client-side app: a timer, solve metrics, saved progress and the whole puzzle bank live
on the device. There is no backend and no account.

### Two players

There are two profiles, **clem** and **lori**. A profile is not a login — it decides which bank of
puzzles you see and which slice of `localStorage` your progress goes into. It is chosen on first
visit and switchable from the header.

Puzzles are built around a list of topics. Both players share a main list, and each has their own
extra topics on top of it — Clem's run to programming and games, Lori's to travel, cards and the
house. The lists live in `scripts/lib/themes-*.mjs`; the generator writes the topic names out to
`src/data/topics.json` so the app can show them without duplicating the list.

The topic list is **not** printed on the page. It sits behind **Puzzle topics** in the options menu
(the ☰ button), so the home page stays about the puzzles.

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

* `src/lib/useGame.ts` — all gameplay state: letters, cursor, direction, clock, check/reveal, and
  the undo history. Undo stores whole-grid snapshots rather than per-square edits, because reveal
  and clear touch many squares at once and a per-square log gets those wrong.
* `src/components/AllCluesPanel.tsx` — every clue plus what is already typed into it. The clue
  columns sit beside the grid on a wide screen; this is how you read them on a phone.
* `src/components/Confetti.tsx` — one canvas burst on a solve. Draws nothing at all when the
  player has asked for reduced motion.
* `src/lib/share.ts` — the copied result card. The emoji grid is skipped above 121 squares, since a
  15x15 would be 225 emoji in someone's chat.
* `src/lib/users.ts` — the two profiles.
* `src/lib/storage.ts` — every localStorage read/write. Progress and stats are per player
  (`crossword:v1:<player>:*`); the theme and the chosen player are not.
* `scripts/lib/themes-*.mjs` — the themed answer bank: `themes-shared.mjs`, `themes-clem.mjs` and
  `themes-lori.mjs` hold the longer answers, `themes-short.mjs` the three-to-five-letter ones for
  all three sets, and `themes-extra.mjs` later top-ups keyed by the same topic names. Adding
  entries here is the single most effective way to raise how much of a grid comes out on-theme.
* `src/components/Menu.tsx` — the one dropdown, used by the hamburger and by the play toolbar. It
  becomes a sliding panel below 620px: the triggers sit against the right edge of the header, so a
  dropdown there opens into the margin and clips. It keeps the panel mounted for the length of the
  slide-out, which is why there is a `mounted` flag as well as a `shown` one.
* `src/components/Modal.tsx` — one overlay-and-panel dialog, shared by the changelog and the topic
  list. It closes on a backdrop click only when the click target *is* the backdrop; without that
  check a click on the list inside it would close the dialog too.
* `src/components/SiteFooter.tsx` — build info plus the newest changelog line, which opens the full
  changelog.
* `public/updates.txt` — the changelog. One entry per line, **oldest first**; the footer shows the
  last line and the modal reverses the file. Append a line here whenever you ship something worth a
  player noticing. A missing or empty file is handled silently.
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
npm run gen:puzzles  # regenerate src/data/puzzles.json (slow: ~1.5 h, needs network once)
npm run gen:packs    # regenerate just the themed packs (~10 min), leaving the daily bank alone
npm run reclue       # re-pick clues for the existing grids (fast) after a clue-rule change
npm run gen:icons    # regenerate the PNG app icons
npm run validate:bank # check puzzles.json and schedule.json hang together
```

## How puzzles are made

`npm run gen:puzzles` builds the bank offline and writes `src/data/puzzles.json`, which is
committed. The app never generates puzzles at runtime.

**The generator is deterministic.** The same seed produces the same thirty puzzles every time, so
re-running it does not give you a new set — it reproduces the one already committed. Pass a seed to
get a different bank:

```bash
npm run gen:puzzles -- --seed=2               # any number
npm run gen:puzzles -- --seed=2026-09-01      # non-numeric seeds are hashed
GEN_SEED=2 npm run gen:puzzles                # same thing via the environment
```

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
* Grid squares use a single `onPointerDown`, never `onMouseDown` plus `onTouchStart`: a tap fires
  both, and the second call looks like a click on the already-selected square, which flips the
  direction.
* Bump the `NS` constant in `storage.ts` if a saved-data shape changes incompatibly.
* Add a line to `public/updates.txt` when you ship a user-visible change.
* A puzzle's `user` field is the key its progress and stats are filed under — never the currently
  selected player. Opening someone else's link offers to switch rather than writing into their
  history.
