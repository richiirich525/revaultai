#!/usr/bin/env node
/*
  check-links — RevaultAI

  Every internal link must point at a page the app actually routes.

  This exists because it found a real one: the Nav linked to /discovered, the
  router had a case for it, DiscoveredPage.jsx existed and the sitemap sent
  Google there — but the slug was missing from KNOWN_PAGES, so a direct visit
  or a refresh fell through to the home page. Three places agreed and the one
  that mattered did not.

  Checks:
    1. Every setPage("…") target is a routed page.
    2. Every href="/…" to an internal path is a routed page.
    3. Every page the sitemap advertises is routed — a sitemap entry is a
       promise to a crawler, and a 404-by-fallback is worse than no entry.
    4. Every routed slug has a `case` in the router's switch.

  Run by `npm run build`. Exits non-zero naming the mismatch.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const app = read("src/App.jsx");
const listed = app.match(/const KNOWN_PAGES = \[([^\]]+)\]/);
if (!listed) { console.error("check-links: could not read KNOWN_PAGES from src/App.jsx"); process.exit(1); }
const KNOWN = new Set(listed[1].split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean));

const fail = [];

/* Slugs that are not pages: anchors, external, or deliberately unrouted. */
const NOT_A_PAGE = new Set(["", "#", "http:", "https:"]);

/*
  Page states that carry an argument and so are absent from KNOWN_PAGES on
  purpose: their real URLs are /film/:id, /@handle, /blog/:slug and so on,
  built by pathFor() in App.jsx and read back by the popstate handler. They are
  checked for a router case below instead, which is the part that can break.
*/
const PARAMETERIZED = new Set(["detail", "profile", "blog-post", "prompt-model", "prompt-genre"]);

/* 1 + 2 — links in the source. */
const sourceFiles = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(rel); continue; }
    if (/\.jsx?$/.test(e.name)) sourceFiles.push(rel);
  }
};
walk("src");

let linkCount = 0;
for (const f of sourceFiles) {
  const s = read(f);
  const targets = new Set();
  for (const m of s.matchAll(/setPage\??\.?\(\s*["']([a-z0-9-]+)["']/g)) targets.add(m[1]);
  for (const m of s.matchAll(/\bpage=\{?["']([a-z0-9-]+)["']/g)) targets.add(m[1]);
  for (const m of s.matchAll(/href="\/([a-z0-9-]*)"/g)) targets.add(m[1]);
  for (const t of targets) {
    if (NOT_A_PAGE.has(t)) continue;
    linkCount++;
    if (PARAMETERIZED.has(t)) {
      if (!app.includes(`case "${t}":`)) fail.push(`${f} links to the "${t}" page state, which has no case in the router`);
      continue;
    }
    if (!KNOWN.has(t)) fail.push(`${f} links to "/${t}", which KNOWN_PAGES does not route`);
  }
}

/* 3 — the sitemap's promises. */
const sitemap = read("api/sitemap.js");
const staticBlock = sitemap.slice(sitemap.indexOf("const STATIC_PAGES = ["), sitemap.indexOf("\n];", sitemap.indexOf("const STATIC_PAGES = [")));
let advertised = 0;
for (const m of staticBlock.matchAll(/\["\/([a-z0-9-]*)"/g)) {
  const slug = m[1] === "" ? "home" : m[1];
  advertised++;
  if (slug === "home") continue;
  if (!KNOWN.has(slug)) fail.push(`the sitemap advertises "/${m[1]}", which KNOWN_PAGES does not route`);
}

/* 4 — a routed slug with no case renders nothing. */
let missingCase = 0;
for (const slug of KNOWN) {
  if (slug === "home") continue;
  if (!app.includes(`case "${slug}":`)) { missingCase++; fail.push(`"${slug}" is in KNOWN_PAGES but has no case in the router`); }
}

console.log("check-links:");
console.log(`  ${KNOWN.size} routed pages`);
console.log(`  ${linkCount} internal link targets across ${sourceFiles.length} source files`);
console.log(`  ${advertised} pages advertised by the sitemap`);
console.log(`  ${KNOWN.size - 1 - missingCase} routed slugs with a router case`);

if (fail.length) {
  console.error("\ncheck-links FAILED:");
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-links: every internal link and sitemap entry points at a routed page.");
