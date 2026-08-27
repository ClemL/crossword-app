// Real crossword fill leans heavily on inflected forms, and a 1913 dictionary
// only lists headwords. We derive the usual endings from words we already have
// clues for, keep the ones a large English word list confirms, and clue them by
// tagging the base clue with the ending. That keeps every answer honest: the
// solver is told exactly what transformation to apply.

// Spelled out as an instruction rather than a grammar label: it is always
// literally true, even where the derived word has drifted from its base.
const TAGS = {
  s: "S",
  ed: "ED",
  ing: "ING",
  er: "ER",
  est: "EST",
  ly: "LY",
};

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function doubles(word) {
  const n = word.length;
  if (n < 3) return null;
  const [a, b, c] = [word[n - 3], word[n - 2], word[n - 1]];
  // consonant-vowel-consonant, e.g. STOP -> STOPPING
  if (!VOWELS.has(a) && VOWELS.has(b) && !VOWELS.has(c) && !"WXY".includes(c)) {
    return word + c;
  }
  return null;
}

/** Candidate surface forms for one base word, as [form, kind] pairs. */
export function derive(word) {
  const out = [];
  const last = word[word.length - 1];
  const prev = word[word.length - 2];
  const push = (form, kind) => { if (form && form.length <= 15) out.push([form, kind]); };

  if ("SXZ".includes(last) || word.endsWith("CH") || word.endsWith("SH")) push(word + "ES", "s");
  else if (last === "Y" && !VOWELS.has(prev)) push(word.slice(0, -1) + "IES", "s");
  else push(word + "S", "s");

  if (last === "E") {
    push(word + "D", "ed");
    push(word.slice(0, -1) + "ING", "ing");
    push(word + "R", "er");
    push(word + "ST", "est");
  } else if (last === "Y" && !VOWELS.has(prev)) {
    push(word.slice(0, -1) + "IED", "ed");
    push(word + "ING", "ing");
    push(word.slice(0, -1) + "IER", "er");
    push(word.slice(0, -1) + "IEST", "est");
  } else {
    const dbl = doubles(word);
    push(word + "ED", "ed");
    push(word + "ING", "ing");
    push(word + "ER", "er");
    push(word + "EST", "est");
    if (dbl) {
      push(dbl + "ED", "ed");
      push(dbl + "ING", "ing");
      push(dbl + "ER", "er");
      push(dbl + "EST", "est");
    }
  }

  if (last === "Y" && !VOWELS.has(prev)) push(word.slice(0, -1) + "ILY", "ly");
  else if (last !== "L" || prev !== "L") push(word + "LY", "ly");

  return out;
}

export function tagClue(clue, kind) {
  return `${clue}, with "${TAGS[kind]}" added`;
}
