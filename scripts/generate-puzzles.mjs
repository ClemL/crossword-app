#!/usr/bin/env node
// Builds the puzzle bank that ships with the app.
//
// Run with `npm run gen:puzzles`. Output is committed, so the app itself never
// needs the network or the generator at runtime — which is what lets it work
// fully offline.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLexicon, indexLexicon, TIER } from "./lib/lexicon.mjs";
import { analyze, emptyPattern, makeRng, randomPattern } from "./lib/grid.mjs";
import { createFiller } from "./lib/fill.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "src", "data", "puzzles.json");

const PLANS = [
  {
    size: "micro",
    count: 24,
    dim: 3,
    blocks: 0,
    maxRun: 3,
    maxTier: TIER.COMMON,
    par: 75,
    fill: { timeBudgetMs: 2500, branch: 30, restarts: 4 },
  },
  {
    size: "mini",
    count: 20,
    dim: 5,
    blocks: [0, 2, 4],
    maxRun: 5,
    maxTier: TIER.FAMILIAR,
    par: 240,
    fill: { timeBudgetMs: 6000, branch: 24, restarts: 4 },
  },
  {
    size: "daily",
    count: 10,
    dim: 15,
    blocks: [54, 56, 58],
    maxRun: 7,
    maxTier: TIER.UNCOMMON,
    par: 1500,
    fill: { timeBudgetMs: 25000, branch: 18, restarts: 2 },
  },
];

function toPuzzle({ size, ordinal, dim, blocks, slots, result, par, rng }) {
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
    id: `${size}-${String(ordinal).padStart(3, "0")}`,
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

async function main() {
  const started = Date.now();
  process.stderr.write("building lexicon...\n");
  const words = await buildLexicon({ maxTier: TIER.UNCOMMON });
  process.stderr.write(`  ${words.length} clued answers\n`);

  const byTier = new Map();
  for (const maxTier of new Set(PLANS.map((p) => p.maxTier))) {
    byTier.set(maxTier, indexLexicon(words.filter((w) => w.tier <= maxTier)));
  }
  const fillers = new Map([...byTier].map(([tier, idx]) => [tier, createFiller(idx)]));

  const puzzles = [];
  const seenGrids = new Set();

  for (const plan of PLANS) {
    const rng = makeRng(0xc0ffee + plan.dim * 7919);
    const filler = fillers.get(plan.maxTier);
    let made = 0;
    let attempts = 0;
    const attemptCap = plan.count * 12;

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
      const result = filler.fillWithRestarts(slots, plan.dim * plan.dim, {
        ...plan.fill,
        seed: Math.floor(rng() * 1e9),
      });
      if (!result) continue;

      const key = result.letters.join("");
      if (seenGrids.has(key)) continue;
      seenGrids.add(key);

      made++;
      puzzles.push(
        toPuzzle({
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
      process.stderr.write(
        `  ${plan.size} ${made}/${plan.count} (attempt ${attempts}, ${slots.length} entries, ` +
          `avg tier ${(result.tierSum / slots.length).toFixed(2)})\n`,
      );
    }

    if (made < plan.count) {
      process.stderr.write(`  ! only produced ${made}/${plan.count} ${plan.size} puzzles\n`);
    }
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(puzzles), "utf8");
  process.stderr.write(
    `wrote ${puzzles.length} puzzles to ${path.relative(process.cwd(), OUT)} ` +
      `in ${((Date.now() - started) / 1000).toFixed(1)}s\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
