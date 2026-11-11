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
    5. Every "functions" entry names a route file that exists, and sets
       only properties Vercel accepts within the limits it allows. A
       maxDuration above the plan ceiling, or on a path matching no file,
       is refused at deploy time the same way the stray key was.

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
  The "functions" block is per-route configuration, and it is a map rather
  than an array, so the loop above never sees it. A key naming no file is
  "The pattern doesn't match any Serverless Functions" at deploy time, and a
  maxDuration over the plan ceiling is refused outright — both of them the
  same class of failure as the stray "comment" key, caught here instead.
*/
const FUNCTION_PROPS = new Set(["maxDuration", "memory", "runtime", "includeFiles", "excludeFiles"]);
const MAX_DURATION_CEILING = 300;   // Vercel Pro. Hobby is 60.

const functions = config.functions;
if (functions !== undefined) {
  if (functions === null || typeof functions !== "object" || Array.isArray(functions)) {
    problems.push('"functions" should be an object keyed by route path');
  } else {
    for (const [pattern, entry] of Object.entries(functions)) {
      const where = `functions["${pattern}"]`;
      if (pattern.startsWith("/")) {
        problems.push(`${where} starts with "/" — Vercel expects a path relative to the project root, like "api/thing.js"`);
      }
      // No globbing used here, so the key is a plain path and must exist.
      if (!/[*?[\]]/.test(pattern) && !fs.existsSync(path.join(ROOT, pattern))) {
        problems.push(`${where} matches no file in this repo`);
      }
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        problems.push(`${where} should be an object`);
        continue;
      }
      for (const prop of Object.keys(entry)) {
        if (!FUNCTION_PROPS.has(prop)) {
          problems.push(`${where} has a property Vercel does not allow: "${prop}" (allowed: ${[...FUNCTION_PROPS].join(", ")})`);
        }
      }
      if ("maxDuration" in entry) {
        const d = entry.maxDuration;
        if (!Number.isInteger(d) || d < 1 || d > MAX_DURATION_CEILING) {
          problems.push(`${where} maxDuration is ${JSON.stringify(d)} — it must be a whole number of seconds between 1 and ${MAX_DURATION_CEILING}`);
        }
      }
    }
  }
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
const fnCount = Object.keys(config.functions ?? {}).length;
console.log(
  `check-vercel: ${counts}, ${fnCount} configured functions — every entry uses properties Vercel accepts.`,
);
