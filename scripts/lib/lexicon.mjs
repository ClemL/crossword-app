// Builds the answer bank: every word we are willing to put in a grid, together
// with at least one clue for it. Curated clues win; Webster's 1913 fills the
// long tail so the 15x15 grids have enough to work with.
import { loadCommon, loadWebster, loadWordSet } from "./fetch-sources.mjs";
import { derive, tagClue } from "./inflect.mjs";
import { cleanClue } from "./clean-clue.mjs";
import { CURATED } from "./curated-clues.mjs";
import { CURATED_LONG } from "./curated-clues-long.mjs";

// Words we never want to see in a family puzzle, plus a few that read badly as
// fill. Substring matches are deliberate.
const BLOCKED = [
  "RAPE", "SLUT", "WHORE", "NIGGE", "SPIC", "KIKE", "CHINK", "FAGG", "DYKE",
  "SHIT", "FUCK", "CUNT", "PISS", "TURD", "DAMN", "HELL", "NAZI", "KKK",
  "SUICID", "COCAIN", "HEROIN", "MURDER", "CORPSE", "SEMEN", "PENIS", "VAGIN",
  "ANUS", "BOOB", "TITS", "CRAP", "DEATH", "KILL", "BOMB", "WAR", "GUN",
  // Religions, ethnicities and nationalities: fine words, but we only have a
  // 1913 dictionary to clue them from, so keep them out of the auto-fill.
  "ISLAM", "MUSLIM", "MOSLEM", "JEW", "HINDU", "CHRIST", "PAGAN", "GENTILE",
  "NEGRO", "RACE", "TRIBE", "CASTE", "SECT", "CULT", "ARSE", "BUTT",
];

// The frequency list is built from subtitles, so a handful of very common
// German/French/Spanish words rank highly. They are not English answers.
const FOREIGN = new Set([
  "AUF", "NUR", "DER", "DAS", "UND", "ICH", "NICHT", "EIN", "EINE", "MIT",
  "SIE", "IST", "DEN", "DEM", "ABER", "NOCH", "WIR", "IHR", "ODER", "SEHR",
  "QUE", "POR", "PARA", "LOS", "LAS", "DEL", "MAS", "PERO", "COMO", "ESTA",
  "ESTO", "TODO", "MUY", "BIEN", "AQUI", "ESO", "ESE", "ELLA", "NADA", "SOLO",
  "UNE", "DANS", "POUR", "AVEC", "MAIS", "TOUT", "PLUS", "VOUS", "NOUS",
  "CEST", "QUI", "PAS", "SUR", "BIN", "WAS", "WIE", "VON", "AUS", "MIR",
  "DICH", "SICH", "DOCH", "HIER", "MEIN", "DIES", "ALLE", "MEHR", "GUT",
]);

// Function words: real words, but their "inflections" are nonsense.
const STOP_BASES = new Set([
  "THE", "AND", "BUT", "FOR", "NOR", "YET", "SO", "THAT", "THIS", "THESE",
  "THOSE", "WHAT", "WHICH", "WHOSE", "WHOM", "WHO", "WHY", "HOW", "WHEN",
  "WHERE", "THERE", "HERE", "HAVE", "HAS", "HAD", "BEEN", "WERE", "WAS",
  "ARE", "IS", "AM", "BE", "BEING", "DOES", "DID", "DONE", "WILL", "WOULD",
  "SHALL", "SHOULD", "MAY", "MIGHT", "MUST", "CAN", "COULD", "OUR", "YOUR",
  "THEIR", "THEM", "THEY", "HIS", "HER", "HERS", "ITS", "OURS", "YOURS",
  "INTO", "ONTO", "UPON", "UNTO", "WITH", "FROM", "THAN", "THEN", "ALSO",
  "VERY", "ONLY", "EVEN", "EVER", "SUCH", "MUCH", "MANY", "MOST", "MORE",
  "SOME", "EACH", "BOTH", "ELSE", "OVER", "UNDER", "AFTER", "ABOUT", "ABOVE",
  "BELOW", "AMONG", "UNTIL", "WHILE", "SINCE", "OUGHT", "WHETHER",
]);

// Fine words in a dictionary, wrong for a puzzle you might hand to a kid.
// Matched whole, not as substrings, so CLASS and ASSET are unaffected.
const BLOCKED_EXACT = new Set([
  "ASS", "ASSES", "TIT", "TITS", "BUM", "FART", "FARTS", "SNOT", "PUKE",
  "TURDS", "LOO", "POO", "PEE", "BOOZE", "SOT",
]);

function blocked(word) {
  return FOREIGN.has(word) || BLOCKED_EXACT.has(word) || BLOCKED.some((b) => word.includes(b));
}

// Tier drives both eligibility and how eagerly the filler reaches for a word.
// 0 = hand-clued, 1-3 = increasingly rare but still in the 50k frequency list,
// 4 = dictionary-only. Small puzzles stay near the top of this scale.
export const TIER = { CURATED: 0, COMMON: 1, FAMILIAR: 2, UNCOMMON: 3, OBSCURE: 4 };

function tierForRank(rank) {
  if (rank === undefined) return TIER.OBSCURE;
  if (rank < 6000) return TIER.COMMON;
  if (rank < 18000) return TIER.FAMILIAR;
  return TIER.UNCOMMON;
}

export async function buildLexicon({ maxTier = TIER.OBSCURE } = {}) {
  const webster = await loadWebster();
  const commonRank = await loadCommon();

  /** @type {Map<string, {word: string, clues: string[], tier: number, rank: number}>} */
  const entries = new Map();

  // A clue that spells out its own answer is not a clue. Checked on whole
  // words, so "Hearing organ" is still fine for EAR.
  const givesItAway = (word, clue) => new RegExp(`\\b${word}\\b`, "i").test(clue);

  const add = (word, clues, tier, rank) => {
    if (!/^[A-Z]{3,15}$/.test(word) || blocked(word)) return;
    clues = clues.filter((c) => !givesItAway(word, c));
    if (clues.length === 0) return;
    const existing = entries.get(word);
    if (existing) {
      if (tier < existing.tier) {
        existing.tier = tier;
        existing.clues = clues;
      } else {
        for (const c of clues) if (!existing.clues.includes(c)) existing.clues.push(c);
      }
      return;
    }
    entries.set(word, { word, clues: [...clues], tier, rank });
  };

  for (const [word, clues] of Object.entries({ ...CURATED, ...CURATED_LONG })) {
    add(word, clues, TIER.CURATED, commonRank.get(word) ?? 5000);
  }

  for (const [raw, def] of Object.entries(webster)) {
    const word = raw.toUpperCase();
    if (entries.has(word) && entries.get(word).tier === TIER.CURATED) continue;
    const clue = cleanClue(word, def);
    if (!clue) continue;
    const rank = commonRank.get(word);
    const tier = tierForRank(rank);
    if (tier > maxTier) continue;
    add(word, [clue], tier, rank ?? 60000);
  }

  // Inflected forms of words we can already clue. A derived form is only kept
  // when the frequency list confirms people actually use it — that filters out
  // the "AREST"/"THATS" junk a naive suffix rule produces — and it is also
  // spell-checked against a large word list.
  const realWords = await loadWordSet();
  // Only derive from words that are genuinely common and whose clue is a
  // definition. A fill-in-the-blank base ("Cape ___") produces nonsense once an
  // ending is bolted on.
  const bases = [...entries.values()].filter(
    (e) =>
      !STOP_BASES.has(e.word) &&
      (e.tier === TIER.CURATED || e.rank < 10_000) &&
      e.clues.some((c) => !c.includes("___")),
  );
  for (const base of bases) {
    for (const [form, kind] of derive(base.word)) {
      if (entries.has(form) || blocked(form)) continue;
      const ownRank = commonRank.get(form);
      if (ownRank === undefined || !realWords.has(form)) continue;
      const tier = Math.max(TIER.COMMON, tierForRank(ownRank));
      if (tier > maxTier) continue;
      const clues = base.clues
        .filter((c) => !c.includes("___"))
        .slice(0, 2)
        .map((c) => tagClue(c, kind))
        .filter((c) => !givesItAway(form, c));
      if (clues.length === 0) continue;
      entries.set(form, { word: form, clues, tier, rank: ownRank, derived: true });
    }
  }

  const words = [...entries.values()].filter((e) => e.tier <= maxTier);
  words.sort((a, b) => a.tier - b.tier || a.rank - b.rank || a.word.localeCompare(b.word));
  return words;
}

// Length-bucketed bitset index so the solver can ask "which words fit A_R_?"
// without scanning the whole bank.
/**
 * Short answers show up in every puzzle and are the most jarring when they are
 * obscure, so the shorter the word the commoner it has to be. Longer entries
 * are more forgiving because the crossings carry them.
 */
export function tierCapForLength(length) {
  if (length <= 3) return TIER.COMMON;
  if (length === 4) return TIER.FAMILIAR;
  return TIER.UNCOMMON;
}

export function indexLexicon(words) {
  const byLength = new Map();
  for (const entry of words) {
    const len = entry.word.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push(entry);
  }

  const index = new Map();
  for (const [len, list] of byLength) {
    const blocks = Math.ceil(list.length / 32);
    // masks[pos][letter] -> bitset of word slots that have `letter` at `pos`
    const masks = Array.from({ length: len }, () =>
      Array.from({ length: 26 }, () => new Uint32Array(blocks)),
    );
    list.forEach((entry, i) => {
      for (let p = 0; p < len; p++) {
        const c = entry.word.charCodeAt(p) - 65;
        masks[p][c][i >> 5] |= 1 << (i & 31);
      }
    });
    index.set(len, { list, masks, blocks });
  }
  return index;
}
