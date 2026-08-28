// Picking which entries a themed puzzle is built around.
//
// Seeds must not cross each other. Two crossing themed answers pin a shared
// letter from both sides, which is what makes a themed grid impossible to close;
// keeping them independent is how themed crosswords are actually laid out.

/** @returns {Map<number, string[]>} themed answers bucketed by length */
export function themedByLength(words) {
  const out = new Map();
  for (const entry of words) {
    if (!entry.topics) continue;
    const len = entry.word.length;
    if (!out.has(len)) out.set(len, []);
    out.get(len).push(entry.word);
  }
  return out;
}

/**
 * Choose up to `count` mutually non-crossing slots and a themed answer for each.
 * Longer slots come first: a nine-letter themed answer carries far more of the
 * theme than a three-letter one.
 */
export function pickSeeds(slots, byLength, count, rng) {
  const order = slots
    .map((slot, index) => ({ index, len: slot.cells.length, k: rng() }))
    .sort((a, b) => b.len - a.len || a.k - b.k);

  const takenCells = new Set();
  const usedWords = new Set();
  const seeds = [];

  for (const { index, len } of order) {
    if (seeds.length >= count) break;
    const slot = slots[index];
    if (slot.cells.some((cell) => takenCells.has(cell))) continue;

    const options = byLength.get(len);
    if (!options || options.length === 0) continue;

    // Random start so repeated attempts on the same grid try different answers.
    const from = Math.floor(rng() * options.length);
    let word = null;
    for (let i = 0; i < options.length; i++) {
      const candidate = options[(from + i) % options.length];
      if (!usedWords.has(candidate)) { word = candidate; break; }
    }
    if (!word) continue;

    usedWords.add(word);
    for (const cell of slot.cells) takenCells.add(cell);
    seeds.push({ slot: index, word });
  }

  return seeds;
}
