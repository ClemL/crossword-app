// Downloads (and caches) the public word/definition sources used to build the
// clued lexicon. Everything here is public domain or an open word list; no
// commercial crossword content is used.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(HERE, "..", ".cache");

const SOURCES = {
  // Webster's Unabridged (1913) — public domain.
  "webster.json":
    "https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary_compact.json",
  // 50k words ordered by corpus frequency (CC-BY-SA). Gives us a much finer
  // "is this word fair game?" signal than a flat word list.
  "common.txt":
    "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt",
  // ~370k English words, used only to confirm that a derived form (plural,
  // past tense, ...) is a real word before we put it in a grid.
  "words.txt":
    "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
};

async function ensure(name) {
  await mkdir(CACHE_DIR, { recursive: true });
  const dest = path.join(CACHE_DIR, name);
  if (existsSync(dest)) return dest;
  process.stderr.write(`fetching ${name}...\n`);
  const res = await fetch(SOURCES[name]);
  if (!res.ok) throw new Error(`failed to fetch ${name}: ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

export async function loadWebster() {
  return JSON.parse(await readFile(await ensure("webster.json"), "utf8"));
}

export async function loadWordSet() {
  const text = await readFile(await ensure("words.txt"), "utf8");
  const set = new Set();
  for (const line of text.split("\n")) {
    const w = line.trim().toUpperCase();
    if (w) set.add(w);
  }
  return set;
}

export async function loadCommon() {
  const text = await readFile(await ensure("common.txt"), "utf8");
  const rank = new Map();
  text.split("\n").forEach((line, i) => {
    const word = line.trim().split(/\s+/)[0]?.toUpperCase();
    if (word && /^[A-Z]+$/.test(word) && !rank.has(word)) rank.set(word, i);
  });
  return rank;
}
