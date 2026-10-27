#!/usr/bin/env node
/*
  check-fal — RevaultAI

  Every route that sends a URL to fal has to sign it first.

  An object in R2 is recorded as R2_PUBLIC_URL/key, which says where the
  object lives. The bucket is private, so that form is not a link anybody can
  fetch. fal fetches reference images and start frames itself, from outside,
  and handing it the stored form hands it a 403.

  This has now shipped twice. generate-video.js did it with start frames and
  it looked like a model-specific bug for three attempts; animate-pack.js did
  it with reference images months later, in a route written after the fix, and
  it made Animate Yourself fail for everyone who tried it. Both times the code
  read fine. The rule is mechanical, so it is checked mechanically.

  A route may opt out by naming itself below with a reason. The point is not
  to forbid it — it is that skipping the signing should be a decision somebody
  wrote down.
*/
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EXEMPT = {
  "generate-video.js": "defines signForFal",
  "verify-models.js": "resolves model ids and sends no URLs",
  "generate-image.js": "sends a prompt and no URL at all",
  "photoreal-plate.js": "uploads the bytes to fal storage first and uses the URL fal returns, which fal can obviously fetch",
};

const problems = [];

for (const name of readdirSync("api").filter((f) => f.endsWith(".js"))) {
  const src = readFileSync(join("api", name), "utf8");

  /* Does it hand anything to fal at all? */
  const callsFal = /\bfal\.(subscribe|run|queue\.submit)\b/.test(src);
  if (!callsFal) continue;
  if (EXEMPT[name]) continue;

  if (!/signForFal|signIfOurs/.test(src)) {
    problems.push(`${name} sends work to fal and never signs a URL`);
    continue;
  }

  /*
    Signing somewhere is not the same as signing the input. Catch the exact
    shape that broke animate-pack: a pack's or a spec's stored images handed
    straight to the model.
  */
  const raw = src.match(/^\s*\[?[A-Za-z_.]*(image_urls|image_url|reference_image_urls|start_image_url)\]?:\s*([^,\n]+)/gm) ?? [];
  for (const line of raw) {
    const value = line.split(":").slice(1).join(":").trim();
    if (/^["'`]/.test(value)) continue;                 // a literal
    if (/sign|signed|references|refs\b/i.test(value)) continue;  // already through signing
    problems.push(`${name} passes ${line.trim().slice(0, 70)} — is that signed?`);
  }
}

if (problems.length) {
  console.error("check-fal FAILED:");
  for (const p of problems) console.error("  - " + p);
  console.error("\n  Pass the URL through signForFal first, or add the route to EXEMPT with a reason.");
  process.exit(1);
}
console.log("check-fal: every route that sends URLs to fal signs them first.");
