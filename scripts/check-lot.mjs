#!/usr/bin/env node
/*
  check-lot — RevaultAI

  The lot had drifted away from the toolkit three separate ways: the meta
  description named one set of rooms, src/LotPage.jsx named another, and
  src/lib/toolCatalog.js — the list the /tools page and the Create menu
  actually read — named a third. Only "script supervisor" appeared in all of
  them, and five shipped tools appeared in none.

  Hand-maintained lists drift. This one cannot any more:

    1. Every tool in the catalog must be reachable from a department on the
       lot, so shipping a tool and forgetting to give it a room fails here.
    2. Every door on the lot must point at a page the app actually routes,
       so a renamed page cannot leave a dead card.
    3. No page may be a door in two different departments.

  Run by `npm run build`. Exits non-zero with the specific mismatch.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { DEPARTMENTS } = await import(path.join(ROOT, "src/lib/lotDepartments.js"));
const { JOBS } = await import(path.join(ROOT, "src/lib/toolCatalog.js"));

const fail = [];

/* The pages the app routes, read from App.jsx rather than duplicated here. */
const appSrc = fs.readFileSync(path.join(ROOT, "src/App.jsx"), "utf8");
const knownLine = appSrc.match(/const KNOWN_PAGES = \[([^\]]+)\]/);
if (!knownLine) fail.push("could not read KNOWN_PAGES from src/App.jsx");
const KNOWN = new Set(
  (knownLine ? knownLine[1] : "").split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean),
);

/* Doors on the lot. */
const doors = new Map();          // page -> department name
const dupes = [];
for (const d of DEPARTMENTS) {
  if (!d.name || !d.lead || !d.body) fail.push(`department "${d.name ?? "(unnamed)"}" is missing name, lead or body`);
  if (!Array.isArray(d.tools) || !d.tools.length) {
    fail.push(`department "${d.name}" has no tools`);
    continue;
  }
  for (const entry of d.tools) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      fail.push(`department "${d.name}" has a malformed tool entry`);
      continue;
    }
    const [label, page] = entry;
    if (!label || !page) fail.push(`department "${d.name}" has a tool with no label or page`);
    if (!KNOWN.has(page)) fail.push(`department "${d.name}" links to "${page}", which App.jsx does not route`);
    if (doors.has(page)) dupes.push(`"${page}" is a door in both "${doors.get(page)}" and "${d.name}"`);
    else doors.set(page, d.name);
  }
}
fail.push(...dupes);

/*
  Every tool needs a room. A tool whose own page is the lot lives on this page
  already — the Script Supervisor's project read sits above the departments —
  so the lot itself counts as its room.
*/
const homeless = [];
let toolCount = 0;
for (const job of JOBS) {
  for (const t of job.tools) {
    toolCount++;
    if (t.page === "lot") continue;
    if (!doors.has(t.page)) homeless.push(`${t.name} (${t.page}) — in job "${job.name}", no department on the lot reaches it`);
  }
}
fail.push(...homeless);

const width = 58;
console.log("check-lot:");
console.log(`  ${String(DEPARTMENTS.length).padStart(3)} departments, ${doors.size} doors`);
console.log(`  ${String(toolCount).padStart(3)} tools in the catalog, all with a room: ${homeless.length === 0 ? "yes" : "NO"}`);
for (const d of DEPARTMENTS) {
  const names = d.tools.map(([l]) => l).join(", ");
  console.log(`    ${d.lead.padEnd(40)} ${names.length > width ? names.slice(0, width - 1) + "…" : names}`);
}

if (fail.length) {
  console.error("\ncheck-lot FAILED:");
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-lot: the lot covers the toolkit, and every door opens.");
