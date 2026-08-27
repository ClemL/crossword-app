import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("out");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  try {
    const s = await stat(file).catch(() => null);
    if (!s || s.isDirectory()) {
      const alt = `${file.replace(/\/$/, "")}.html`;
      file = (await stat(alt).catch(() => null)) ? alt : path.join(file, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(await readFile(path.join(ROOT, "404.html")).catch(() => "not found"));
  }
});
await new Promise((r) => server.listen(4321, r));

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

const base = "http://localhost:4321";
await page.goto(base, { waitUntil: "networkidle" });
console.log("home title:", await page.title());
console.log("size sections:", await page.locator(".size-section").count());
console.log("puzzle cards:", await page.locator(".pcard").count());

// Open the first micro puzzle
await page.locator(".pcard").first().click();
await page.waitForSelector(".grid", { timeout: 10000 });
const cells = await page.locator(".cell:not(.cell--block)").count();
console.log("play: cells =", cells, "clues =", await page.locator(".clue").count());

// Solve it by typing the solution row by row.
const solution = await page.evaluate(async () => {
  const res = await fetch("/__none__").catch(() => null);
  void res;
  return null;
});
void solution;

await page.locator(".cell:not(.cell--block)").first().click();
await page.keyboard.type("ACE");
console.log("after typing ACE, timer:", await page.locator(".timer__value").innerText());
const filled = await page.locator(".cell__letter").evaluateAll((els) => els.map((e) => e.textContent).join(""));
console.log("grid letters:", JSON.stringify(filled));

await page.screenshot({ path: "/tmp/shot-play.png" });
await page.goto(`${base}/stats`, { waitUntil: "networkidle" });
console.log("stats heading:", await page.locator("h1").innerText());
await page.screenshot({ path: "/tmp/shot-stats.png" });

await page.goto(base, { waitUntil: "networkidle" });
await page.screenshot({ path: "/tmp/shot-home.png", fullPage: true });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await browser.close();
server.close();
