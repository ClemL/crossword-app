#!/usr/bin/env node
// Checks the generated bank before it ships: that every clue matches the grid
// it was written for, that the schedule points at puzzles that exist, and that
// nothing obviously wrong (a clue containing its own answer, two identical
// answers in one grid) survived generation.
//
// Run after `npm run gen:puzzles`, or any time puzzles.json is edited by hand.
import { readFile } from "node:fs/promises";

const puzzles = JSON.parse(await readFile("src/data/puzzles.json", "utf8"));
const schedule = JSON.parse(await readFile("src/data/schedule.json", "utf8"));
const packs = JSON.parse(await readFile("src/data/packs.json", "utf8"));

const DIMS = { nano: 3, micro: 5, mini: 7, daily: 15 };

const problems = [];
const fail = (msg) => problems.push(msg);

const byId = new Map();
for (const puzzle of puzzles) {
  if (byId.has(puzzle.id)) fail(`duplicate id ${puzzle.id}`);
  byId.set(puzzle.id, puzzle);

  const dim = DIMS[puzzle.size];
  if (!dim) fail(`${puzzle.id}: unknown size ${puzzle.size}`);
  else if (puzzle.rows !== dim || puzzle.cols !== dim) {
    fail(`${puzzle.id}: ${puzzle.rows}x${puzzle.cols} for size ${puzzle.size}`);
  }
  if (puzzle.solution.length !== puzzle.rows * puzzle.cols) fail(`${puzzle.id}: solution length`);

  const seen = new Set();
  for (const clue of puzzle.clues) {
    const spelled = clue.cells.map((cell) => puzzle.solution[cell]).join("");
    if (spelled !== clue.answer) {
      fail(`${puzzle.id} ${clue.number}${clue.direction[0]}: grid says ${spelled}, clue says ${clue.answer}`);
    }
    if (seen.has(clue.answer)) fail(`${puzzle.id}: ${clue.answer} appears twice`);
    seen.add(clue.answer);
    if (new RegExp(`\\b${clue.answer}\\b`, "i").test(clue.text)) {
      fail(`${puzzle.id}: clue for ${clue.answer} contains it — "${clue.text}"`);
    }
    if (!clue.text.trim()) fail(`${puzzle.id}: ${clue.answer} has an empty clue`);
  }

  // Every white square must be covered by an across and a down entry, or the
  // solver can leave a letter no clue ever asks for.
  const covered = new Set(puzzle.clues.flatMap((c) => c.cells));
  const whites = puzzle.solution.reduce((n, ch, i) => (ch === "#" ? n : (covered.has(i) ? n : n + 1)), 0);
  if (whites > 0) fail(`${puzzle.id}: ${whites} squares belong to no entry`);
}

// Ordinals should be unique within a user and size, since they are what the
// title shows ("Micro #4").
const ordinals = new Map();
for (const puzzle of puzzles) {
  if (puzzle.pack) continue;
  const key = `${puzzle.user}:${puzzle.size}:${puzzle.ordinal}`;
  if (ordinals.has(key)) fail(`ordinal clash: ${key}`);
  ordinals.set(key, puzzle.id);
}

for (const [user, sizes] of Object.entries(schedule.players)) {
  for (const [size, days] of Object.entries(sizes)) {
    if (days.length !== schedule.days) fail(`${user}/${size}: ${days.length} days, expected ${schedule.days}`);
    for (const id of days) {
      const puzzle = byId.get(id);
      if (!puzzle) fail(`${user}/${size}: schedule points at missing ${id}`);
      else if (puzzle.user !== user || puzzle.size !== size) {
        fail(`${user}/${size}: scheduled ${id}, which is ${puzzle.user}/${puzzle.size}`);
      } else if (puzzle.pack) fail(`${user}/${size}: pack puzzle ${id} is in the daily schedule`);
    }
  }
}

for (const pack of packs) {
  if (!pack.sets?.length) fail(`pack ${pack.id}: no sets`);
  for (const set of pack.sets ?? []) {
    for (const id of set.puzzles) {
      const puzzle = byId.get(id);
      if (!puzzle) fail(`pack ${pack.id}: missing ${id}`);
      else if (puzzle.pack !== pack.id) fail(`pack ${pack.id}: ${id} says pack ${puzzle.pack}`);
      else if (puzzle.user !== "shared") fail(`pack ${pack.id}: ${id} belongs to ${puzzle.user}`);
      else if (puzzle.size !== set.size) fail(`pack ${pack.id}: ${id} is a ${puzzle.size} in the ${set.size} set`);
    }
  }
}

const counts = {};
for (const puzzle of puzzles) {
  const key = puzzle.pack ? `pack ${puzzle.size}` : `${puzzle.user} ${puzzle.size}`;
  counts[key] = (counts[key] ?? 0) + 1;
}
for (const [key, n] of Object.entries(counts).sort()) process.stdout.write(`  ${key.padEnd(14)} ${n}\n`);

if (problems.length) {
  process.stderr.write(`\n${problems.length} problems:\n${problems.slice(0, 40).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`\n${puzzles.length} puzzles, ${schedule.days} scheduled days, ${packs.length} packs — all valid\n`);
