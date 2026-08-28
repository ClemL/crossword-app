#!/usr/bin/env node
// Builds the puzzle bank that ships with the app.
//
// Run with `npm run gen:puzzles`. Output is committed, so the app itself never
// needs the network or the generator at runtime — which is what lets it work
// fully offline.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLexicon, indexLexicon, tierCapForLength, topicsOf, TIER } from "./lib/lexicon.mjs";
import { analyze, emptyPattern, makeRng, randomPattern } from "./lib/grid.mjs";
import { pickSeeds, themedByLength } from "./lib/theme-seed.mjs";
import { createFiller } from "./lib/fill.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "src", "data", "puzzles.json");
const TOPICS_OUT = path.join(HERE, "..", "src", "data", "topics.json");

// Each player gets their own bank. Both draw on the shared topics; Clem's also
// draws on his own list, so his grids run to SQL, Dota and graphics cards.
const USERS = [
  { id: "clem", themes: ["shared", "clem"] },
  { id: "lori", themes: ["shared", "lori"] },
];

// Each plan is tried down a ladder, narrowest bank first. The fewer ordinary
// words the filler can reach for, the more of the grid comes out themed -- so
// the first rung that closes the grid is the most themed one available. `seeds`
// is how many themed answers are pinned before the search starts.
const PLANS = [
  {
    size: "micro",
    count: 5,
    dim: 3,
    blocks: 0,
    maxRun: 3,
    par: 75,
    ladder: [
      { maxTier: TIER.CURATED, seeds: 3, picks: 30, fill: { timeBudgetMs: 1500, branch: 30 } },
      { maxTier: TIER.CURATED, seeds: 2, picks: 30, fill: { timeBudgetMs: 1500, branch: 30 } },
      { maxTier: TIER.COMMON, seeds: 2, picks: 25, fill: { timeBudgetMs: 2000, branch: 30 } },
      { maxTier: TIER.COMMON, seeds: 1, picks: 25, fill: { timeBudgetMs: 2000, branch: 30 } },
    ],
  },
  {
    size: "mini",
    count: 5,
    dim: 5,
    // A blockless 5x5 is a double word square: possible, but it burns most of
    // the attempt budget, so keep a couple of blocks.
    blocks: [2, 2, 4],
    maxRun: 5,
    par: 240,
    ladder: [
      { maxTier: TIER.CURATED, seeds: 2, picks: 40, fill: { timeBudgetMs: 2500, branch: 26 } },
      { maxTier: TIER.COMMON, seeds: 2, picks: 40, fill: { timeBudgetMs: 2500, branch: 26 } },
      { maxTier: TIER.COMMON, seeds: 1, picks: 40, fill: { timeBudgetMs: 3000, branch: 26 } },
      { maxTier: TIER.FAMILIAR, seeds: 1, picks: 30, fill: { timeBudgetMs: 3000, branch: 26 } },
      { maxTier: TIER.UNCOMMON, relaxShort: true, seeds: 1, picks: 20, fill: { timeBudgetMs: 3000, branch: 26 } },
      { maxTier: TIER.UNCOMMON, relaxShort: true, seeds: 0, picks: 4, fill: { timeBudgetMs: 5000, branch: 24 } },
    ],
  },
  {
    size: "daily",
    count: 5,
    dim: 15,
    blocks: [54, 56, 58],
    maxRun: 7,
    par: 1500,
    // A 15x15 has many more short entries to fill than a mini, so the
    // short-answer rule is loosened by one tier throughout; without it the
    // grids rarely close at all.
    ladder: [
      { maxTier: TIER.UNCOMMON, relaxShort: true, seeds: 3, picks: 2, fill: { timeBudgetMs: 12000, branch: 20 } },
      { maxTier: TIER.UNCOMMON, relaxShort: true, seeds: 1, picks: 2, fill: { timeBudgetMs: 12000, branch: 20 } },
      { maxTier: TIER.UNCOMMON, relaxShort: true, seeds: 0, picks: 2, fill: { timeBudgetMs: 25000, branch: 20 } },
    ],
  },
];

function toPuzzle({ user, size, ordinal, dim, blocks, slots, result, par, rng }) {
  const { numbers } = analyze(blocks, dim);
  const solution = Array.from({ length: dim * dim }, (_, i) =>
    blocks[i] === 1 ? "#" : result.letters[i],
  );

  const clues = slots
    .map((slot, si) => {
      const entry = result.entries[si];
      const options = entry.clues.length ? entry.clues : [`${entry.word.length}-letter answer`];
      return {
        number: slot.number,
        direction: slot.dir,
        text: options[Math.floor(rng() * options.length)],
        answer: entry.word,
        cells: slot.cells,
      };
    })
    .sort((a, b) =>
      a.direction === b.direction
        ? a.number - b.number
        : a.direction === "across" ? -1 : 1,
    );

  return {
    id: `${user}-${size}-${String(ordinal).padStart(3, "0")}`,
    user,
    size,
    ordinal,
    rows: dim,
    cols: dim,
    solution,
    numbers: Array.from(numbers),
    clues,
    par,
  };
}

/**
 * Re-pick every clue for the bank that is already on disk, leaving the grids
 * alone. Filling a 15x15 takes minutes, so an improvement to the clue rules
 * should not mean regenerating puzzles that are otherwise fine.
 */
async function reclue(banks) {
  const existing = JSON.parse(await readFile(OUT, "utf8"));
  const byUser = new Map(
    [...banks].map(([user, words]) => [user, new Map(words.map((w) => [w.word, w]))]),
  );
  const rng = makeRng(0x51dea1);
  let missing = 0;
  let changed = 0;

  for (const puzzle of existing) {
    const byAnswer = byUser.get(puzzle.user);
    for (const clue of puzzle.clues) {
      const entry = byAnswer?.get(clue.answer);
      if (!entry || entry.clues.length === 0) {
        missing += 1;
        process.stderr.write(`  ! ${puzzle.id} ${clue.answer} has no clue left\n`);
        continue;
      }
      const next = entry.clues[Math.floor(rng() * entry.clues.length)];
      if (next !== clue.text) changed += 1;
      clue.text = next;
    }
  }

  if (missing > 0) {
    process.stderr.write(
      `refusing to write: ${missing} answers are no longer cluable, so the grids need regenerating\n`,
    );
    process.exit(1);
  }

  await writeFile(OUT, JSON.stringify(existing), "utf8");
  process.stderr.write(`reclued ${existing.length} puzzles (${changed} clues changed)\n`);
}

async function main() {
  const started = Date.now();
  const reclueOnly = process.argv.includes("--reclue");

  process.stderr.write("building answer banks...\n");
  /** @type {Map<string, object[]>} */
  const banks = new Map();
  for (const user of USERS) {
    const words = await buildLexicon({ maxTier: TIER.UNCOMMON, themes: user.themes });
    const themed = words.filter((w) => w.tier === TIER.THEME).length;
    process.stderr.write(`  ${user.id}: ${words.length} answers, ${themed} of them themed\n`);
    banks.set(user.id, words);
  }

  if (reclueOnly) {
    await reclue(banks);
    return;
  }

  const puzzles = [];
  const seenGrids = new Set();

  for (const user of USERS) {
    const words = banks.get(user.id);
    const byLength = themedByLength(words);

    // One filler per distinct bank shape used anywhere in the ladders.
    const fillers = new Map();
    const bankKey = (rung) => `${rung.maxTier}:${rung.relaxShort ? 1 : 0}`;
    for (const plan of PLANS) {
      for (const rung of plan.ladder) {
        if (fillers.has(bankKey(rung))) continue;
        const allowed = words.filter(
          (w) =>
            w.tier <=
            Math.min(rung.maxTier, tierCapForLength(w.word.length) + (rung.relaxShort ? 1 : 0)),
        );
        fillers.set(bankKey(rung), createFiller(indexLexicon(allowed)));
      }
    }

    for (const plan of PLANS) {
      const rng = makeRng(0xc0ffee + plan.dim * 7919 + user.id.charCodeAt(0) * 104729);
      let made = 0;
      let attempts = 0;
      const attemptCap = plan.count * 25;

      while (made < plan.count && attempts < attemptCap) {
        attempts++;
        const blockCount = Array.isArray(plan.blocks)
          ? plan.blocks[Math.floor(rng() * plan.blocks.length)]
          : plan.blocks;
        const blocks = blockCount === 0
          ? emptyPattern(plan.dim)
          : randomPattern(plan.dim, { blocks: blockCount, maxRun: plan.maxRun, rng, tries: 900 });
        if (!blocks) continue;

        const { slots } = analyze(blocks, plan.dim);

        let result = null;
        for (const rung of plan.ladder) {
          const filler = fillers.get(bankKey(rung));
          for (let pick = 0; pick < rung.picks && !result; pick++) {
            const seeds = rung.seeds > 0 ? pickSeeds(slots, byLength, rung.seeds, rng) : [];
            result = filler.fill(slots, plan.dim * plan.dim, {
              ...rung.fill,
              seeds,
              seed: Math.floor(rng() * 1e9),
            });
          }
          if (result) break;
        }
        if (!result) continue;

        const key = result.letters.join("");
        if (seenGrids.has(key)) continue;
        seenGrids.add(key);

        made++;
        puzzles.push(
          toPuzzle({
            user: user.id,
            size: plan.size,
            ordinal: made,
            dim: plan.dim,
            blocks,
            slots,
            result,
            par: plan.par,
            rng,
          }),
        );
        const themed = result.entries.filter((e) => e.tier === TIER.THEME).length;
        process.stderr.write(
          `  ${user.id} ${plan.size} ${made}/${plan.count} (attempt ${attempts}, ` +
            `${slots.length} entries, ${themed} themed = ` +
            `${Math.round((themed / slots.length) * 100)}%)\n`,
        );
      }

      if (made < plan.count) {
        process.stderr.write(
          `  ! only produced ${made}/${plan.count} ${plan.size} puzzles for ${user.id}\n`,
        );
      }
    }
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(puzzles), "utf8");
  await writeFile(
    TOPICS_OUT,
    JSON.stringify(Object.fromEntries(USERS.map((u) => [u.id, topicsOf(u.themes)])), null, 2),
    "utf8",
  );
  process.stderr.write(
    `wrote ${puzzles.length} puzzles to ${path.relative(process.cwd(), OUT)} ` +
      `in ${((Date.now() - started) / 1000).toFixed(1)}s\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
