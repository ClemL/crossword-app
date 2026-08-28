#!/usr/bin/env node
// Rewrites the service worker in the export output with the real list of files
// to precache. Without this the first offline visit could be missing the JS
// chunk for a route the player had not opened yet.
import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "out");

async function walk(dir, base = "") {
  const found = [];
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const item of items) {
    const abs = path.join(dir, item.name);
    const rel = `${base}/${item.name}`;
    if (item.isDirectory()) found.push(...(await walk(abs, rel)));
    else found.push(rel);
  }
  return found;
}

const swPath = path.join(OUT, "sw.js");
try {
  await stat(swPath);
} catch {
  console.error("postbuild: out/sw.js not found — did `next build` run with output: 'export'?");
  process.exit(1);
}

const files = await walk(OUT);

const precache = new Set(["/"]);
for (const file of files) {
  if (file.startsWith("/_next/static/") && /\.(js|css|woff2?)$/.test(file)) precache.add(file);
  if (/^\/[^/]+\.(png|svg|ico|webmanifest)$/.test(file)) precache.add(file);
  if (file === "/updates.txt") precache.add(file);
  if (file.endsWith(".html")) {
    // "/play.html" is reachable as "/play"; cache both spellings.
    const route = file.replace(/\/index\.html$/, "").replace(/\.html$/, "") || "/";
    precache.add(route === "" ? "/" : route);
  }
}

const buildId = (await readFile(path.join(OUT, "_next", "BUILD_ID"), "utf8").catch(() => null))
  ?.trim() ?? String(Date.now());

const list = [...precache].sort();
const source = await readFile(swPath, "utf8");
const updated = source
  .replace("__PRECACHE__", JSON.stringify(list))
  .replace("__BUILD_ID__", buildId);

await writeFile(swPath, updated, "utf8");
console.log(`postbuild: service worker precaches ${list.length} files (build ${buildId})`);
