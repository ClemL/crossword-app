// Turns a raw Webster's 1913 definition into something that reads like a
// crossword clue: one short sense, no self-reference, no dictionary cruft.

const DEACCENT = { "ä": "a", "ö": "o", "ü": "u", "é": "e", "è": "e", "ê": "e", "á": "a", "à": "a", "í": "i", "ó": "o", "ú": "u", "ç": "c", "ñ": "n", "æ": "ae", "œ": "oe", "—": "-", "–": "-", "“": '"', "”": '"', "‘": "'", "’": "'" };

const BAD_SUBSTRINGS = [
  "etym", "obs.", "archaic", "same as", "see ", "cf.", "pl. of", "imp. of",
  "p. p.", "sing. of", "3d pers", "alt. of", "compar. of", "superl.",
  "a form of", "variant of", "one of the", "chem.", "her.",
];

// The 1913 source carries plenty of period racism and other language we will
// not put in front of a player. Any definition touching these is dropped.
const SENSITIVE = [
  "negro", "savage", "heathen", "barbarian", "mohammedan", "mahometan",
  "oriental", "idiot", "lunatic", "imbecile", "cripple", "dwarf", "half-breed",
  "gypsy", "papist", "infidel", "harlot", "concubine", "slave", "slavery",
  "hottentot", "aborigin", "negress", "jewess", "mulatto", "squaw", "redskin",
  "insane", "feeble-minded", "deformed", "monstrous birth", "leper",
];

// Definitions that only make sense next to the headword.
const BAD_PREFIXES = ["of or", "that which", "one who", "the act of", "a "];

function deaccent(s) {
  return s.replace(/[^\x00-\x7F]/g, (c) => DEACCENT[c.toLowerCase()] ?? "");
}

function stem(word) {
  const w = word.toLowerCase();
  if (w.length > 5 && (w.endsWith("ing") || w.endsWith("ies"))) return w.slice(0, -3);
  if (w.length > 4 && (w.endsWith("ed") || w.endsWith("es") || w.endsWith("er") || w.endsWith("ly"))) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

export function cleanClue(word, raw) {
  if (!raw || typeof raw !== "string") return null;
  let t = deaccent(raw).replace(/\s+/g, " ").trim();

  // "Defn:" marks the actual definition in this dataset; everything before it
  // is etymology and part-of-speech noise.
  const defn = t.indexOf("Defn:");
  if (defn !== -1) t = t.slice(defn + 5);

  t = t.replace(/^\s*\d+\.\s*/, "");            // leading sense number
  t = t.replace(/^\([^)]{0,40}\)\s*/, "");      // leading (Zool.) style tag
  t = t.split(/\s\d+\.\s/)[0];                  // stop at the next sense
  t = t.split(/\bEtym:/i)[0];
  t = t.split(/ -- /)[0];

  // First clause only — Webster piles senses up behind semicolons and colons.
  t = t.split(/[;:]/)[0];
  const period = t.search(/\.(\s|$)/);
  if (period !== -1) t = t.slice(0, period);

  t = t.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ");
  t = t.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
  t = t.replace(/[,\s]+$/, "");

  if (t.length < 12 || t.length > 68) return null;

  const lower = t.toLowerCase();
  if (BAD_SUBSTRINGS.some((b) => lower.includes(b))) return null;
  if (SENSITIVE.some((b) => lower.includes(b))) return null;
  if (BAD_PREFIXES.some((b) => lower === b.trim())) return null;
  if (/[^A-Za-z0-9 ,'"\-!?%$&/]/.test(t)) return null;
  if (!/[a-z]{3}/.test(lower)) return null;

  // Never let the answer (or a close relative) appear in its own clue.
  const s = stem(word);
  if (lower.includes(word.toLowerCase()) || (s.length >= 4 && lower.includes(s))) return null;

  return t.charAt(0).toUpperCase() + t.slice(1);
}
