// Crossword grid filler.
//
// This is a constraint-satisfaction search: every entry is a variable whose
// domain is the set of words that still fit, held as a bitset over the words of
// that length. After each guess the domains are made arc-consistent — a word
// survives only if every crossing entry can still supply the letters it needs —
// which is what keeps a 15x15 tractable. Variable choice is most-constrained-
// first, values are ordered by how common the word is, and the whole search
// restarts with a new seed when it stalls.
import { makeRng } from "./grid.mjs";

function popcount(v) {
  v = v - ((v >> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
  return (((v + (v >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

export function createFiller(index) {
  // Cache of "words of this length with any of these letters at this position".
  const unionCache = new Map();

  function unionMask(len, pos, letters) {
    const key = `${len}|${pos}|${letters}`;
    let hit = unionCache.get(key);
    if (hit) return hit;
    const bucket = index.get(len);
    const out = new Uint32Array(bucket.blocks);
    for (let c = 0; c < 26; c++) {
      if (!(letters & (1 << c))) continue;
      const mask = bucket.masks[pos][c];
      for (let b = 0; b < bucket.blocks; b++) out[b] |= mask[b];
    }
    if (unionCache.size < 200_000) unionCache.set(key, out);
    return out;
  }

  function fullDomain(len) {
    const bucket = index.get(len);
    if (!bucket) return null;
    const bits = new Uint32Array(bucket.blocks);
    bits.fill(0xffffffff);
    const extra = bucket.blocks * 32 - bucket.list.length;
    if (extra > 0) bits[bucket.blocks - 1] = 0xffffffff >>> extra;
    return bits;
  }

  /**
   * @param {object} [options]
   * @param {{slot: number, word: string}[]} [options.seeds] entries pinned before
   *   the search starts. This is how a themed puzzle gets built: the themed
   *   answers are placed first and the rest of the grid is filled around them.
   */
  function fill(
    slots,
    cellCount,
    { seed = 1, timeBudgetMs = 5000, branch = 20, nodeLimit = 200_000, seeds = null } = {},
  ) {
    const rng = makeRng(seed);
    const deadline = Date.now() + timeBudgetMs;

    const domains = slots.map((s) => fullDomain(s.cells.length));
    if (domains.some((d) => d === null)) return null;
    const assigned = new Array(slots.length).fill(null);
    const trail = [];
    let nodes = 0;

    const setDomain = (si, bits) => {
      trail.push([si, domains[si]]);
      domains[si] = bits;
    };
    const mark = () => trail.length;
    const undo = (m) => {
      while (trail.length > m) {
        const [si, prev] = trail.pop();
        domains[si] = prev;
      }
    };

    // 26-bit mask of the letters that can still appear at `pos` of slot `si`.
    function letterOptions(si, pos) {
      const bucket = index.get(slots[si].cells.length);
      const dom = domains[si];
      let out = 0;
      for (let c = 0; c < 26; c++) {
        const mask = bucket.masks[pos][c];
        for (let b = 0; b < bucket.blocks; b++) {
          if (dom[b] & mask[b]) { out |= 1 << c; break; }
        }
      }
      return out;
    }

    /**
     * Push letter constraints outward until nothing changes. Each pass can only
     * shave a word or two off a large domain, so the work is capped: the first
     * rounds do nearly all the useful pruning and the rest is not worth the
     * clock.
     */
    function propagate(queue, budget) {
      let work = budget ?? slots.length * 8;
      while (queue.length && work-- > 0) {
        const si = queue.pop();
        const slot = slots[si];
        for (let p = 0; p < slot.cells.length; p++) {
          const cross = slot.cross[p];
          if (!cross) continue;
          const letters = letterOptions(si, p);
          if (letters === 0) return false;
          if (letters === 0x3ffffff) continue; // every letter still possible

          const sj = cross.slot;
          const other = domains[sj];
          const allowed = unionMask(slots[sj].cells.length, cross.pos, letters);
          let changed = false;
          let empty = true;
          const next = new Uint32Array(other.length);
          for (let b = 0; b < other.length; b++) {
            const v = other[b] & allowed[b];
            next[b] = v;
            if (v !== other[b]) changed = true;
            if (v !== 0) empty = false;
          }
          if (empty) return false;
          if (changed) {
            setDomain(sj, next);
            if (!queue.includes(sj)) queue.push(sj);
          }
        }
      }
      return true;
    }

    function domainSize(si) {
      const dom = domains[si];
      let n = 0;
      for (let b = 0; b < dom.length; b++) n += popcount(dom[b]);
      return n;
    }

    function wordsOf(si, usedWords) {
      const bucket = index.get(slots[si].cells.length);
      const dom = domains[si];
      const out = [];
      for (let b = 0; b < dom.length; b++) {
        let v = dom[b];
        while (v) {
          const t = v & -v;
          const entry = bucket.list[(b << 5) + (31 - Math.clz32(t))];
          if (entry && !usedWords.has(entry.word)) out.push({ entry, id: (b << 5) + (31 - Math.clz32(t)) });
          v ^= t;
        }
      }
      return out;
    }

    const used = new Set();
    let tierSum = 0;

    function search() {
      if (++nodes > nodeLimit || (nodes % 32 === 0 && Date.now() > deadline)) return false;

      let bestSlot = -1;
      let bestSize = Infinity;
      for (let si = 0; si < slots.length; si++) {
        if (assigned[si]) continue;
        const size = domainSize(si);
        if (size === 0) return false;
        if (size < bestSize) { bestSlot = si; bestSize = size; }
      }
      if (bestSlot === -1) return true;

      const options = wordsOf(bestSlot, used);
      if (options.length === 0) return false;
      for (const o of options) o.k = o.entry.tier * 1000 + rng() * 950;
      options.sort((a, b) => a.k - b.k);

      const bucket = index.get(slots[bestSlot].cells.length);
      for (let i = 0; i < Math.min(options.length, branch); i++) {
        const { entry, id } = options[i];
        const m = mark();
        const single = new Uint32Array(bucket.blocks);
        single[id >> 5] = 1 << (id & 31);
        setDomain(bestSlot, single);
        assigned[bestSlot] = entry;
        used.add(entry.word);
        tierSum += entry.tier;

        if (propagate([bestSlot]) && search()) return true;

        tierSum -= entry.tier;
        used.delete(entry.word);
        assigned[bestSlot] = null;
        undo(m);
        if (nodes > nodeLimit || Date.now() > deadline) return false;
      }
      return false;
    }

    for (const { slot: si, word } of seeds ?? []) {
      const bucket = index.get(slots[si].cells.length);
      const id = bucket?.byWord.get(word);
      if (id === undefined) return null;
      const single = new Uint32Array(bucket.blocks);
      single[id >> 5] = 1 << (id & 31);
      setDomain(si, single);
      assigned[si] = bucket.list[id];
      used.add(word);
      tierSum += bucket.list[id].tier;
    }

    if (!propagate(slots.map((_, i) => i), slots.length * 40)) return null;
    if (!search()) {
      if (process.env.FILL_DEBUG) console.log("  fill failed after", nodes, "nodes");
      return null;
    }

    const letters = new Array(cellCount).fill("");
    slots.forEach((slot, si) => {
      slot.cells.forEach((cell, p) => { letters[cell] = assigned[si].word[p]; });
    });
    return { entries: assigned, letters, tierSum, nodes };
  }

  function fillWithRestarts(slots, cellCount, opts = {}) {
    const { restarts = 6, seed = 1, ...rest } = opts;
    let best = null;
    for (let i = 0; i < restarts; i++) {
      const result = fill(slots, cellCount, { ...rest, seed: seed + i * 7919 });
      if (result && (!best || result.tierSum < best.tierSum)) best = result;
      if (best && opts.stopOnFirst !== false) return best;
    }
    return best;
  }

  return { fill, fillWithRestarts };
}
