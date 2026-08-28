// Turns a raw Webster's 1913 entry into something that reads like a crossword
// clue: one short sense, no self-reference, no dictionary cruft.
//
// Webster lists senses oldest-first, so the first sense is often an archaic one
// ("lever: more agreeable"). We clean several senses and let the caller pick,
// preferring the most substantial, which in practice is the modern noun sense.

const DEACCENT = { "ä": "a", "ö": "o", "ü": "u", "é": "e", "è": "e", "ê": "e", "á": "a", "à": "a", "í": "i", "ó": "o", "ú": "u", "ç": "c", "ñ": "n", "æ": "ae", "œ": "oe", "—": "-", "–": "-", "“": '"', "”": '"', "‘": "'", "’": "'" };

const BAD_SUBSTRINGS = [
  "etym", "obs.", "archaic", "same as", "see ", "cf.", "pl. of", "imp. of",
  "p. p.", "sing. of", "3d pers", "alt. of", "compar. of", "superl.",
  "a form of", "variant of", "chem.", "her.",
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

// Senses often get cut mid-phrase; a clue ending on a dangling function word is
// one of those.
const DANGLING =
  /\b(of|to|in|on|by|for|with|as|that|which|from|the|a|an|and|or|is|are|was|were|signifying|denoting|meaning|called|used|having|being)$/i;

function deaccent(s) {
  return s.replace(/[^\x00-\x7F]/g, (c) => DEACCENT[c.toLowerCase()] ?? "");
}

function stem(word) {
  const w = word.toLowerCase();
  if (w.length > 5 && (w.endsWith("ing") || w.endsWith("ies"))) return w.slice(0, -3);
  if (w.length > 4 && (w.endsWith("ed") || w.endsWith("es") || w.endsWith("er") || w.endsWith("ly")))
    return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

function cleanSense(word, chunk) {
  let t = chunk;
  t = t.replace(/^\s*\d+\.\s*/, "");            // leading sense number
  t = t.replace(/^\([^)]{0,40}\)\s*/, "");      // leading (Zool.) style tag
  t = t.split(/\bEtym:/i)[0];
  t = t.split(/ -- /)[0];

  // First clause only — Webster piles sub-senses up behind semicolons.
  t = t.split(/[;:]/)[0];
  const period = t.search(/\.(\s|$)/);
  if (period !== -1) t = t.slice(0, period);

  t = t.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ");
  t = t.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
  t = t.replace(/[,\s]+$/, "");

  if (t.length < 12 || t.length > 68) return null;
  if (DANGLING.test(t)) return null;

  const lower = t.toLowerCase();
  if (BAD_SUBSTRINGS.some((b) => lower.includes(b))) return null;
  if (SENSITIVE.some((b) => lower.includes(b))) return null;
  if (/[^A-Za-z0-9 ,'"\-!?%$&/]/.test(t)) return null;
  if (!/[a-z]{3}/.test(lower)) return null;

  // Never let the answer (or a close relative) appear in its own clue.
  const s = stem(word);
  if (lower.includes(word.toLowerCase()) || (s.length >= 4 && lower.includes(s))) return null;

  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Every usable sense, in the order Webster lists them. */
export function cleanClues(word, raw, { maxSenses = 5 } = {}) {
  if (!raw || typeof raw !== "string") return [];
  let text = deaccent(raw).replace(/\s+/g, " ").trim();

  // "Defn:" marks the actual definition; everything before it is etymology and
  // part-of-speech noise.
  const defn = text.indexOf("Defn:");
  if (defn !== -1) text = text.slice(defn + 5);

  const chunks = text.split(/\s(?=\d+\.\s)/).slice(0, maxSenses);
  const out = [];
  for (const chunk of chunks) {
    const clue = cleanSense(word, chunk);
    if (clue && !out.includes(clue)) out.push(clue);
  }
  return out;
}

// Below this a sense is usually a stub of an archaic one ("lever: more
// agreeable") rather than the definition a solver would recognise.
const SUBSTANTIAL = 20;

/**
 * The single best clue for a word: the first sense with some substance to it.
 * Webster orders senses oldest-first, so taking the first sense outright leads
 * with archaic meanings, while always taking the longest skips past the plain
 * modern definition in favour of some technical nineteenth-century usage.
 */
export function cleanClue(word, raw) {
  const options = cleanClues(word, raw);
  if (options.length === 0) return null;
  return (
    options.find((c) => c.length >= SUBSTANTIAL) ??
    options.reduce((best, c) => (c.length > best.length ? c : best))
  );
}
