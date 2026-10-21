/*
  check-prerender — run after prerender.js, as part of the build.

  It exists because of one bug. The prerendered body was injected with
  String.replace and a replacement STRING built as `$1${html}$3`. In a
  replacement string "$1" means "capture group 1", so the "$15" in our own
  pricing copy shipped as <div id="root">5 and "$32" shipped as </div>2.
  "$5" was untouched because the pattern had no fifth group, which is exactly
  why the page looked only partly broken and went unnoticed.

  The page is the product's price list, so this is checked on every build
  rather than trusted. Two assertions, both unambiguous:

    1. Every prerendered page has exactly one <div id="root">. A second one
       means a "$1" was interpreted and the opening div was pasted mid-page.
    2. /pricing shows the price of every credit pack, read from the same
       module the page renders from, so this cannot drift when prices change.
*/
import fs from "node:fs";
import path from "node:path";
import { CREDIT_PACKS, priceLabel } from "../src/lib/creditPacks.js";

const DIST = path.join(process.cwd(), "dist");
const problems = [];

function pages(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...pages(p));
    else if (e.name === "index.html") out.push(p);
  }
  return out;
}

if (!fs.existsSync(DIST)) {
  console.error("check-prerender: no dist/ — run the build first.");
  process.exit(1);
}

const files = pages(DIST);

// 1. One #root per page.
for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  const n = (html.match(/<div id="root">/g) || []).length;
  if (n !== 1) {
    problems.push(
      `${path.relative(DIST, f)}: ${n} copies of <div id="root"> (expected 1). ` +
      `A replacement string interpreted a $-directive in the page content.`
    );
  }
}

// 2. The pricing page shows every price.
const pricing = path.join(DIST, "pricing", "index.html");
if (!fs.existsSync(pricing)) {
  problems.push("pricing/index.html was not prerendered.");
} else {
  const html = fs.readFileSync(pricing, "utf8");
  for (const pack of CREDIT_PACKS) {
    const want = priceLabel(pack);
    if (!html.includes(want)) {
      problems.push(
        `pricing/index.html does not contain ${want} for the ${pack.label} pack ` +
        `(${pack.credits} credits). Check how the body is injected in scripts/prerender.js.`
      );
    }
  }
}

if (problems.length) {
  console.error("\ncheck-prerender FAILED:\n");
  for (const p of problems) console.error("  - " + p);
  console.error("");
  process.exit(1);
}

console.log(`check-prerender: ${files.length} pages, one #root each, all ${CREDIT_PACKS.length} pack prices present.`);
