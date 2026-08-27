#!/usr/bin/env node
// Draws the app icons as small crossword grids. Run with `npm run gen:icons`;
// the output is committed so the build stays dependency-free.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./lib/png.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, "..", "public");

const INK = [17, 18, 22, 255];
const PAPER = [250, 250, 247, 255];
const ACCENT = [47, 109, 246, 255];

// A 5x5 mini-grid: 1 = block, 2 = accent square.
const PATTERN = [
  [0, 0, 0, 1, 1],
  [0, 2, 0, 0, 0],
  [0, 0, 0, 2, 0],
  [0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0],
];

function draw(size, { padding }) {
  const px = new Uint8Array(size * size * 4);
  const set = (x, y, color) => {
    const i = (y * size + x) * 4;
    px[i] = color[0];
    px[i + 1] = color[1];
    px[i + 2] = color[2];
    px[i + 3] = color[3];
  };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, INK);

  const inner = size - padding * 2;
  const cell = Math.floor(inner / 5);
  const grid = cell * 5;
  const offset = Math.floor((size - grid) / 2);
  const line = Math.max(1, Math.round(size / 96));

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const kind = PATTERN[row][col];
      const color = kind === 1 ? INK : kind === 2 ? ACCENT : PAPER;
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const onEdge = x < line || y < line || x >= cell - line || y >= cell - line;
          set(offset + col * cell + x, offset + row * cell + y, onEdge ? INK : color);
        }
      }
    }
  }
  return px;
}

await mkdir(PUBLIC, { recursive: true });
const outputs = [
  ["icon-192.png", 192, 14],
  ["icon-512.png", 512, 36],
  // Maskable icons get cropped to a circle by some launchers, so keep more air.
  ["icon-maskable-512.png", 512, 84],
];

for (const [name, size, padding] of outputs) {
  const png = encodePng(size, size, draw(size, { padding }));
  await writeFile(path.join(PUBLIC, name), png);
  console.log(`wrote public/${name} (${png.length} bytes)`);
}
