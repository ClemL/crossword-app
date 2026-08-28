import TOPICS from "@/data/topics.json";

const LISTS = TOPICS as Record<string, string[]>;

// Topic keys are lowercase identifiers shared with the generator; these are how
// they should read to a person. Anything not listed gets title-cased.
const LABELS: Record<string, string> = {
  "apple watch": "Apple Watch",
  airpods: "AirPods",
  amex: "Amex",
  "arlington ma": "Arlington, MA",
  "big pharma": "Big pharma",
  csharp: "C#",
  "chase reserve": "Chase Sapphire Reserve",
  "high end cards": "High-end cards",
  "elden ring": "Elden Ring",
  "hong kong": "Hong Kong",
  iphone: "iPhone",
  "leominster ma": "Leominster, MA",
  "magic the gathering": "Magic: the Gathering",
  pcs: "PCs",
  "quincy ma": "Quincy, MA",
  "red dead redemption": "Red Dead Redemption 2",
  reddit: "Reddit",
  sql: "SQL",
  "sysadmin and helpdesk": "Sysadmin and helpdesk",
  "united airlines": "United Airlines",
  "worcester ma": "Worcester, MA",
};

function label(topic: string): string {
  // Sentence case, not title case: "Board games" reads better next to
  // "Big pharma" than "Board Games" does.
  return LABELS[topic] ?? topic[0].toUpperCase() + topic.slice(1);
}

/** The topics a player's puzzles are built from, ready to display. */
export function topicsFor(user: string): string[] {
  return (LISTS[user] ?? []).map(label).sort((a, b) => a.localeCompare(b));
}
