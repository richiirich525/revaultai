#!/usr/bin/env node
/*
  check-vercel — RevaultAI

  vercel.json is the one file in this repo that `npm run build` never looks
  at. Vite does not read it, the eleven other checks do not read it, and the
  first thing that validates it is Vercel, after a push, by failing the
  deployment.

  This exists because of one bug. A redirect was given a "comment" property
  to explain why it was there — JSON has no comments, so the explanation
  went in as a key. The local build passed. Vercel answered "redirects[1]
  should NOT have additional property `comment`" and refused, and because
  the bad file stayed on main, the next push failed too. Two deployments
  lost to a key that could not have survived the first second of a schema
  check.

  So: a schema check, before the push rather than after.

    1. The file is valid JSON at all.
    2. Every redirect and rewrite uses only properties Vercel accepts.
    3. Every one has the properties it needs.
    4. Every rewrite destination that points at a local path points at
       something this repo can actually serve.

  Run by `npm run build`. Exits non-zero naming the offending entry.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

let config;
const raw = fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8");
try {
  config = JSON.parse(raw);
} catch (err) {
  console.error("check-vercel FAILED:\n  - vercel.json is not valid JSON: " + err.message);
  process.exit(1);
}

// Taken from Vercel's configuration schema. Anything outside these is
// rejected at deploy time, whatever it is and however well-meant.
const SHAPES = {
  redirects: { required: ["source", "destination"], optional: ["permanent", "statusCode", "has", "missing"] },
  rewrites: { required: ["source", "destination"], optional: ["has", "missing"] },
  headers: { required: ["source", "headers"], optional: ["has", "missing"] },
};

for (const [key, shape] of Object.entries(SHAPES)) {
  const list = config[key];
  if (list === undefined) continue;
  if (!Array.isArray(list)) {
    problems.push(`"${key}" should be an array`);
    continue;
  }
  const allowed = new Set([...shape.required, ...shape.optional]);
  list.forEach((entry, i) => {
    const where = `${key}[${i}]`;
    if (entry === null || typeof entry !== "object") {
      problems.push(`${where} should be an object`);
      return;
    }
    for (const prop of Object.keys(entry)) {
      if (!allowed.has(prop)) {
        problems.push(`${where} has a property Vercel does not allow: "${prop}" (allowed: ${[...allowed].join(", ")})`);
      }
    }
    for (const prop of shape.required) {
      if (!(prop in entry)) problems.push(`${where} is missing "${prop}"`);
    }
  });
}

/*
  A rewrite that sends traffic to a file is a promise that the file exists.
  Only local paths are checked: an external destination is somebody else's
  to serve, and /api/... is a function rather than a file on disk.
*/
for (const [i, r] of (config.rewrites ?? []).entries()) {
  const dest = String(r?.destination ?? "");
  if (!dest.startsWith("/") || dest.startsWith("/api/")) continue;
  const target = dest.replace(/^\//, "").split("?")[0];
  const inPublic = fs.existsSync(path.join(ROOT, "public", target));
  const isIndex = target === "index.html";   // written by vite into dist
  if (!inPublic && !isIndex) {
    problems.push(`rewrites[${i}] sends traffic to "${dest}", which is neither in public/ nor the built index.html`);
  }
}

if (problems.length) {
  console.error("check-vercel FAILED:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

const counts = Object.keys(SHAPES)
  .map((k) => `${(config[k] ?? []).length} ${k}`)
  .join(", ");
console.log(`check-vercel: ${counts} — every entry uses properties Vercel accepts.`);
