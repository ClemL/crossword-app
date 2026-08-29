#!/usr/bin/env node
// End-to-end check of the built app: solves a puzzle, confirms the stats it
// records, and verifies the service worker really serves the app offline.
// Run `npm run build` first, then `node scripts/dev/smoke.mjs`.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("out");
const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".txt": "text/plain",
  ".webmanifest": "application/manifest+json", ".ico": "image/x-icon",
};

let online = true;
const server = createServer(async (req, res) => {
  if (!online) {
    req.socket.destroy();
    return;
  }
  const url = new URL(req.url, BASE);
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  try {
    const info = await stat(file).catch(() => null);
    if (!info || info.isDirectory()) {
      const alt = `${file.replace(/\/$/, "")}.html`;
      file = (await stat(alt).catch(() => null)) ? alt : path.join(file, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  }
});
await new Promise((resolve) => server.listen(PORT, resolve));

const puzzles = JSON.parse(await readFile("src/data/puzzles.json", "utf8"));
const schedule = JSON.parse(await readFile("src/data/schedule.json", "utf8"));
const PLAYER = "clem";
const mine = puzzles.filter((p) => p.user === PLAYER);
const target = mine.find((p) => p.size === "micro") ?? mine[0];

const browser = await chromium.launch({ executablePath: CHROME });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();

const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e}`));
page.on("console", (m) => {
  const text = m.text();
  // A failed fetch while we are deliberately offline is the service worker
  // doing its job, not a bug.
  const expected = /favicon|ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(text);
  if (m.type() === "error" && !expected) problems.push(`console: ${text}`);
});

const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) problems.push(`assertion failed: ${label}`);
};

// --- picking a player ------------------------------------------------------
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".picker__card");
check("first visit asks who is playing", true);
await page.screenshot({ path: "/tmp/shot-picker.png" });
await page.locator(".picker__card").first().click();
await page.waitForSelector(".today");
await page.screenshot({ path: "/tmp/shot-home.png", fullPage: true });

const todayCards = await page.locator(".tcard").count();
check("today offers one puzzle per size", todayCards === 3, `${todayCards} cards`);

const todayLinks = await page.locator(".tcard").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
await page.reload({ waitUntil: "networkidle" });
const todayAgain = await page.locator(".tcard").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
check(
  "the same date always resolves to the same puzzles",
  JSON.stringify(todayLinks) === JSON.stringify(todayAgain),
  todayLinks.join(" "),
);

const dayRows = await page.locator(".earlier__day").count();
check("earlier days are listed", dayRows === 14, `${dayRows} days`);

const epochDays = Math.round(
  (new Date().setHours(0, 0, 0, 0) -
    new Date(...schedule.epoch.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))).setHours(0, 0, 0, 0)) /
    86400000,
);
const expected = schedule.players[PLAYER].micro[
  ((epochDays % schedule.days) + schedule.days) % schedule.days
];
check(
  "today's micro matches the committed schedule",
  todayLinks.some((href) => href.endsWith(expected)),
  `${expected} in ${todayLinks.join(" ")}`,
);
await page.getByRole("button", { name: "Show more days" }).click();
check("show-more extends the history", (await page.locator(".earlier__day").count()) === 28);

// --- the other player's puzzles are kept separate ---------------------------
const theirs = puzzles.find((p) => p.user !== PLAYER);
if (theirs) {
  await page.goto(`${BASE}/play?id=${theirs.id}`, { waitUntil: "networkidle" });
  const offered = await page.locator("h1").innerText();
  check("another player's link offers to switch", /'s$/.test(offered), offered);
  await page.goto(BASE, { waitUntil: "networkidle" });
}

// --- undo, redo, clear-incorrect and the all-clues panel --------------------
const scratch = mine.find((p) => p.size === "mini") ?? target;
await page.goto(`${BASE}/play?id=${scratch.id}`, { waitUntil: "networkidle" });
await page.waitForSelector(".grid");

const firstAcross = scratch.clues.find((c) => c.direction === "across");
const lettersNow = () =>
  page.locator(".cell:not(.cell--block) .cell__letter").allInnerTexts().then((t) => t.join(""));

await page.locator(".grid > *").nth(firstAcross.cells[0]).click();
if ((await page.locator(".clue-list").first().locator(".clue--active").count()) === 0) {
  await page.keyboard.press(" ");
}
await page.keyboard.type("ZZZ");
const typed = await lettersNow();
check("typing lands in the grid", typed.includes("ZZZ"), typed.slice(0, 12));

const partWidth = await page.locator(".progress__fill").evaluate((el) => el.style.width);
const partLabel = await page.locator(".progress").getAttribute("aria-label");
check(
  "progress bar tracks letters entered",
  partWidth !== "0%" && partWidth !== "100%" && /3 of \d+ squares filled/.test(partLabel ?? ""),
  `${partWidth} — ${partLabel}`,
);

await page.keyboard.press("Control+z");
await page.keyboard.press("Control+z");
await page.keyboard.press("Control+z");
const undone = await lettersNow();
check("undo walks the letters back out", !undone.includes("ZZZ"), undone.slice(0, 12) || "(empty)");

await page.keyboard.press("Control+Shift+z");
const redone = await lettersNow();
check("redo puts one back", redone.length > undone.length, redone.slice(0, 12));

// Clear-incorrect should remove the deliberate junk and keep correct letters.
await page.locator(".grid > *").nth(firstAcross.cells[0]).click();
if ((await page.locator(".clue-list").first().locator(".clue--active").count()) === 0) {
  await page.keyboard.press(" ");
}
await page.keyboard.type(firstAcross.answer);
const withReal = await lettersNow();
check("a real answer goes in", withReal.startsWith(firstAcross.answer), withReal.slice(0, 12));

const secondAcross = scratch.clues.filter((c) => c.direction === "across")[1];
await page.locator(".grid > *").nth(secondAcross.cells[0]).click();
if ((await page.locator(".clue-list").first().locator(".clue--active").count()) === 0) {
  await page.keyboard.press(" ");
}
await page.keyboard.type("Q".repeat(secondAcross.answer.length));
await page.getByRole("button", { name: "More" }).click();
await page.getByRole("button", { name: "Clear incorrect letters" }).click();
const cleaned = await lettersNow();
check(
  "clear-incorrect keeps the right letters and drops the wrong ones",
  cleaned.includes(firstAcross.answer) && !cleaned.includes("QQ"),
  cleaned.slice(0, 16),
);

// The skip-filled toggle should be reachable and should stick.
await page.getByRole("button", { name: "More" }).click();
const skipLabel = await page.getByRole("button", { name: /Skip filled squares/ }).innerText();
check("skip-filled toggle is in the menu", /on|off/.test(skipLabel), skipLabel);
await page.getByRole("button", { name: /Skip filled squares/ }).click();
await page.getByRole("button", { name: "More" }).click();
const skipAfter = await page.getByRole("button", { name: /Skip filled squares/ }).innerText();
check("skip-filled toggle flips", skipAfter !== skipLabel, `${skipLabel} -> ${skipAfter}`);
await page.getByRole("button", { name: /Skip filled squares/ }).click();
await page.keyboard.press("Escape");

// --- solve -----------------------------------------------------------------
await page.goto(`${BASE}/play?id=${target.id}`, { waitUntil: "networkidle" });
await page.waitForSelector(".grid");

const acrossClues = target.clues.filter((c) => c.direction === "across");
for (const clue of acrossClues) {
  await page.locator(".grid > *").nth(clue.cells[0]).click();
  // The first square of an entry is usually also the start of a down entry, so
  // make sure we are pointed across before typing the answer.
  const acrossActive = await page.locator(".clue-list").first().locator(".clue--active").count();
  if (acrossActive === 0) await page.keyboard.press(" ");
  await page.keyboard.type(clue.answer);
}

await page.waitForSelector(".dialog", { timeout: 5000 });
check("solving shows the completion dialog", true);
check("confetti fires on the solve", (await page.locator("canvas.confetti").count()) === 1);
await page.waitForTimeout(700);
await page.screenshot({ path: "/tmp/shot-confetti.png" });
const doneWidth = await page.locator(".progress__fill").evaluate((el) => el.style.width);
check("progress bar reaches full on a solved grid", doneWidth === "100%", doneWidth);
const badges = await page.locator(".badge").allInnerTexts();
check("clean solve is credited", badges.some((b) => /no help/i.test(b)), badges.join(", "));
await page.getByRole("button", { name: "Share" }).click();
const shared = await page.evaluate(() => navigator.clipboard.readText());
check(
  "share copies a result card",
  shared.includes("Crossword") && shared.includes("clem-crossword-app.vercel.app"),
  shared.split("\n")[0],
);
await page.screenshot({ path: "/tmp/shot-solved.png" });

// --- options menu, topics and changelog ------------------------------------
await page.goto(BASE, { waitUntil: "networkidle" });
await page.locator(".menu > .btn").click();
await page.getByRole("button", { name: "Puzzle topics" }).click();
await page.waitForSelector(".dialog--panel");
const topicCount = await page.locator(".dialog__list li").count();
check("options menu shows the topic list", topicCount > 20, `${topicCount} topics`);
await page.screenshot({ path: "/tmp/shot-topics.png" });

// A click inside the panel must not close it; only the backdrop should.
await page.locator(".dialog__list").click({ position: { x: 5, y: 5 } });
check("clicking inside the modal keeps it open", (await page.locator(".dialog--panel").count()) === 1);
await page.mouse.click(5, 5);
check("clicking the backdrop closes the modal", (await page.locator(".dialog--panel").count()) === 0);

const latest = await page.locator(".build-info__latest").innerText();
check("footer shows the newest changelog line", /^2026-/.test(latest), latest);
await page.locator(".build-info__latest").click();
await page.waitForSelector(".dialog--panel");
const entries = await page.locator(".dialog__list li").allInnerTexts();
const changelogLines = (await readFile("public/updates.txt", "utf8"))
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
check(
  "changelog lists every entry, newest first",
  entries.length === changelogLines.length && entries[0] === latest,
  `${entries.length} of ${changelogLines.length} entries`,
);
await page.screenshot({ path: "/tmp/shot-changelog.png" });
await page.mouse.click(5, 5);

// --- themed packs ----------------------------------------------------------
const packs = JSON.parse(await readFile("src/data/packs.json", "utf8"));
await page.goto(BASE, { waitUntil: "networkidle" });
await page.locator(".menu > .btn").click();
await page.getByRole("link", { name: "Themed packs" }).click();
await page.waitForSelector(".pack");
const packCount = await page.locator(".pack").count();
check("packs page lists every pack", packCount === packs.length, `${packCount} packs`);
const packChips = await page.locator(".pack").first().locator(".chip").count();
check("a pack offers its puzzles", packChips === packs[0].puzzles.length, `${packChips} puzzles`);
await page.screenshot({ path: "/tmp/shot-packs.png", fullPage: true });

// A pack puzzle is shared, so it must open for either player without the
// "that one is someone else's" guard.
await page.locator(".pack").first().locator(".chip").first().click();
await page.waitForSelector(".grid", { timeout: 10000 });
check("a shared pack puzzle opens without a player guard", true);
await page.goto(BASE, { waitUntil: "networkidle" });

// --- stats -----------------------------------------------------------------
await page.goto(`${BASE}/stats`, { waitUntil: "networkidle" });
const heading = await page.locator("h1").innerText();
check("stats are shown per player", heading.toLowerCase().startsWith(PLAYER), heading);
const solvedValue = await page.locator(".strip__item").first().locator(".strip__value").innerText();
check("stats records the solve", solvedValue === "1", `shows ${solvedValue}`);
const streak = await page.locator(".strip__item").nth(1).locator(".strip__value").innerText();
check("streak starts at 1", streak === "1", `shows ${streak}`);
await page.screenshot({ path: "/tmp/shot-stats.png", fullPage: true });

// --- resume ----------------------------------------------------------------
await page.goto(`${BASE}/play?id=${target.id}`, { waitUntil: "networkidle" });
const letters = await page.locator(".cell__letter").allInnerTexts();
check(
  "a solved grid comes back filled in",
  letters.join("") === target.solution.filter((c) => c !== "#").join(""),
);

// --- offline ---------------------------------------------------------------
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 })
  .then(() => check("service worker took control", true))
  .catch(() => check("service worker took control", false));

online = false;
await context.setOffline(true);
await page.goto(`${BASE}/play?id=${target.id}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".grid", { timeout: 15000 })
  .then(() => check("a puzzle route loads with the network down", true))
  .catch(() => check("a puzzle route loads with the network down", false));
const offlineBadge = await page.locator(".offline-badge").count();
check("offline banner appears", offlineBadge === 1);
await page.screenshot({ path: "/tmp/shot-offline.png" });

online = true;
await context.setOffline(false);

// --- mobile + dark ---------------------------------------------------------
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark",
});
const mp = await mobile.newPage();
await mp.goto(BASE, { waitUntil: "networkidle" });
await mp.locator(".picker__card").first().click().catch(() => {});
const daily = mine.find((p) => p.size === "daily") ?? target;
await mp.goto(`${BASE}/play?id=${daily.id}`, { waitUntil: "networkidle" });
await mp.waitForSelector(".grid");
await mp.screenshot({ path: "/tmp/shot-mobile-dark.png" });

// Put something in the grid first, so the fill column has letters to show.
const mobileAcross = daily.clues.find((c) => c.direction === "across");
await mp.locator(".grid > *").nth(mobileAcross.cells[0]).tap();
for (const letter of mobileAcross.answer) await mp.locator(`.key:text-is("${letter}")`).tap();

await mp.locator(".clue-bar__all").click();
await mp.waitForSelector(".allclues");
const rows = await mp.locator(".allclues__row").count();
check("all-clues panel lists every clue", rows === daily.clues.length, `${rows} rows`);
const fills = await mp.locator(".allclues__fill").first().innerText();
check(
  "all-clues shows what is already in the grid",
  fills.replace(/·/g, "") === mobileAcross.answer,
  `${fills} (answer ${mobileAcross.answer})`,
);
await mp.screenshot({ path: "/tmp/shot-allclues.png" });
await mp.locator(".allclues__row").first().click();
check("tapping a clue closes the panel", (await mp.locator(".allclues").count()) === 0);
await mp.goto(BASE, { waitUntil: "networkidle" });
await mp.screenshot({ path: "/tmp/shot-mobile-home.png", fullPage: true });

// --- the options sheet on a phone ------------------------------------------
// A right-aligned dropdown opens into the margin at this width; the sheet has
// to sit entirely on screen instead. Measure it only once it has finished
// sliding, or the box read back is wherever the transition happened to be.
const sheetSettled = () =>
  mp.locator(".menu__panel").evaluate(
    (el) =>
      new Promise((resolve) => {
        const done = () => resolve();
        el.addEventListener("transitionend", done, { once: true });
        setTimeout(done, 500);
      }),
  );

await mp.locator(".menu > .btn").tap();
await mp.waitForSelector(".menu__panel.is-open");
await sheetSettled();
const sheet = await mp.locator(".menu__panel").boundingBox();
check(
  "the options sheet is fully on screen",
  sheet.x >= 0 && sheet.x + sheet.width <= 390.5 && sheet.width > 200,
  `x ${Math.round(sheet.x)} w ${Math.round(sheet.width)}`,
);
check(
  "the sheet is full height",
  sheet.height >= 800,
  `${Math.round(sheet.height)}px tall`,
);
await mp.screenshot({ path: "/tmp/shot-mobile-menu.png" });
await mp.locator(".menu__scrim").tap({ position: { x: 20, y: 400 } });
await mp.waitForSelector(".menu__panel", { state: "detached" });
check("tapping the scrim closes the sheet", (await mp.locator(".menu__panel").count()) === 0);

// The toolbar's own menu sits at the same edge and gets the same treatment.
await mp.goto(`${BASE}/play?id=${daily.id}`, { waitUntil: "networkidle" });
await mp.waitForSelector(".grid");
await mp.locator(".toolbar__narrow .menu > .btn").tap();
await mp.waitForSelector(".menu__panel.is-open");
await sheetSettled();
const actions = await mp.locator(".menu__panel").boundingBox();
check(
  "the toolbar sheet is fully on screen",
  actions.x >= 0 && actions.x + actions.width <= 390.5,
  `x ${Math.round(actions.x)} w ${Math.round(actions.width)}`,
);
await mp.screenshot({ path: "/tmp/shot-mobile-actions.png" });
await mp.locator(".menu__close").tap();
await mp.waitForSelector(".menu__panel", { state: "detached" });
check("the sheet's close button dismisses it", (await mp.locator(".menu__panel").count()) === 0);

console.log(problems.length ? `\nPROBLEMS:\n${problems.join("\n")}` : "\nall checks passed");
await browser.close();
server.close();
process.exit(problems.length ? 1 : 0);
