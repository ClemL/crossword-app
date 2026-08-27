// Grid geometry: block patterns, entry slots and clue numbering.

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function emptyPattern(size) {
  return new Uint8Array(size * size); // 0 = white, 1 = block
}

function runsOk(blocks, size, minRun, maxRun) {
  for (let axis = 0; axis < 2; axis++) {
    for (let a = 0; a < size; a++) {
      let run = 0;
      for (let b = 0; b <= size; b++) {
        const isBlock = b === size || blocks[axis === 0 ? a * size + b : b * size + a] === 1;
        if (isBlock) {
          if (run > 0 && (run < minRun || run > maxRun)) return false;
          run = 0;
        } else run++;
      }
    }
  }
  return true;
}

function connected(blocks, size) {
  const total = blocks.length;
  let start = -1;
  let whites = 0;
  for (let i = 0; i < total; i++) {
    if (blocks[i] === 0) { whites++; if (start === -1) start = i; }
  }
  if (start === -1) return false;
  const seen = new Uint8Array(total);
  const stack = [start];
  seen[start] = 1;
  let count = 0;
  while (stack.length) {
    const i = stack.pop();
    count++;
    const r = Math.floor(i / size);
    const c = i % size;
    const push = (rr, cc) => {
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) return;
      const j = rr * size + cc;
      if (blocks[j] === 1 || seen[j]) return;
      seen[j] = 1;
      stack.push(j);
    };
    push(r - 1, c); push(r + 1, c); push(r, c - 1); push(r, c + 1);
  }
  return count === whites;
}

export function isValidPattern(blocks, size, { minRun = 3, maxRun = size } = {}) {
  return runsOk(blocks, size, minRun, maxRun) && connected(blocks, size);
}

/**
 * Random 180°-rotationally-symmetric block pattern, the way American-style
 * crosswords are built. Retries until the run-length and connectivity rules
 * hold, so callers always get a legal grid.
 */
export function randomPattern(size, { blocks: blockTarget, maxRun = size, rng = Math.random, tries = 600 } = {}) {
  const total = size * size;
  for (let attempt = 0; attempt < tries; attempt++) {
    const blocks = emptyPattern(size);
    let placed = 0;
    let guard = 0;
    const budget = blockTarget * 60 + 400;
    while (placed < blockTarget && guard++ < budget) {
      const i = Math.floor(rng() * total);
      const mirror = total - 1 - i;
      if (blocks[i] === 1) continue;
      const wasMirror = blocks[mirror];
      blocks[i] = 1;
      blocks[mirror] = 1;
      // Only the minimum-run rule is checked while placing; the maximum-run
      // rule can only be satisfied once enough blocks are down.
      if (!runsOk(blocks, size, 3, size)) {
        blocks[i] = 0;
        blocks[mirror] = wasMirror;
        continue;
      }
      placed += i === mirror ? 1 : 2 - wasMirror;
    }
    if (placed < blockTarget - 2 || placed > blockTarget + 4) continue;
    if (isValidPattern(blocks, size, { minRun: 3, maxRun })) return blocks;
  }
  return null;
}

/** Entries (slots) plus the standard crossword numbering. */
export function analyze(blocks, size) {
  const slots = [];
  const numbers = new Int16Array(blocks.length).fill(0);
  let next = 1;

  const isBlock = (r, c) => r < 0 || c < 0 || r >= size || c >= size || blocks[r * size + c] === 1;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isBlock(r, c)) continue;
      const startsAcross = isBlock(r, c - 1) && !isBlock(r, c + 1);
      const startsDown = isBlock(r - 1, c) && !isBlock(r + 1, c);
      if (!startsAcross && !startsDown) continue;
      const num = next++;
      numbers[r * size + c] = num;
      if (startsAcross) {
        const cells = [];
        for (let cc = c; !isBlock(r, cc); cc++) cells.push(r * size + cc);
        slots.push({ dir: "across", number: num, row: r, col: c, cells });
      }
      if (startsDown) {
        const cells = [];
        for (let rr = r; !isBlock(rr, c); rr++) cells.push(rr * size + c);
        slots.push({ dir: "down", number: num, row: r, col: c, cells });
      }
    }
  }

  // Which slots pass through each cell — the filler needs this for crossings.
  const slotsByCell = new Map();
  slots.forEach((slot, si) => {
    slot.index = si;
    for (const cell of slot.cells) {
      if (!slotsByCell.has(cell)) slotsByCell.set(cell, []);
      slotsByCell.get(cell).push(si);
    }
  });
  slots.forEach((slot) => {
    const crossing = new Set();
    // cross[p] = the perpendicular entry through this slot's p-th cell, and
    // which position of that entry the shared cell sits at.
    slot.cross = slot.cells.map((cell, p) => {
      const others = slotsByCell.get(cell).filter((si) => si !== slot.index);
      if (others.length === 0) return null;
      const si = others[0];
      crossing.add(si);
      return { slot: si, pos: slots[si].cells.indexOf(cell), at: p };
    });
    slot.crossing = [...crossing];
  });

  return { slots, numbers };
}
