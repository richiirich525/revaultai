#!/usr/bin/env node
/*
  fetch-fal-schemas — RevaultAI

  Records what each fal endpoint will actually accept.

  Run it by hand:   npm run fal:schemas

  It reads fal's own OpenAPI document for every endpoint this codebase can
  submit to, and writes the accepted and required input fields to
  src/lib/falSchemas.json. check-payload then compares what the generator
  sends against that file on every build, offline.

  Why a committed file rather than a live check at build time: a build that
  needs fal to be up is a build that fails when fal is down, and a deploy
  blocked by somebody else's outage is worse than the bug this prevents.
  The same split as falCosts.js — measure on demand, enforce offline.

  Why it exists at all: Kling 4.0's image endpoint requires start_image_url
  where every other model here takes an optional image_url. The generator
  sent image_url, fal answered 422, and two Part 2 attempts failed before
  anyone knew. The text endpoint's schema had been read carefully; the image
  endpoint's had never been opened. One wrong field name is not something a
  person should find out from a failed generation.

  No API key: these documents are public.
*/

import fs from "node:fs";
import path from "node:path";
import { readTables, payloadFor, ROOT } from "./lib/genTables.mjs";

const OUT = path.join(ROOT, "src", "lib", "falSchemas.json");
const { MODELS, REF_MODELS } = readTables();

const endpoints = [
  ...new Set(
    Object.keys(MODELS).flatMap((key) => payloadFor(key, MODELS, REF_MODELS).map((r) => r.endpoint)),
  ),
].sort();

/* The input schema sits behind the POST body's $ref. Resolved rather than
   guessed by name: the schema names are per-endpoint (V4TextToVideoInput,
   ImageToVideoInput, ...) and not derivable from the endpoint id. */
function inputSchemaOf(doc, id) {
  const route = doc?.paths?.["/" + id] ?? Object.values(doc?.paths ?? {}).find((p) => p?.post?.requestBody);
  const ref = route?.post?.requestBody?.content?.["application/json"]?.schema?.$ref;
  if (!ref) return null;
  const name = ref.split("/").pop();
  return doc?.components?.schemas?.[name] ?? null;
}

const out = {};
let failed = 0;

for (const id of endpoints) {
  const url = "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=" + encodeURIComponent(id);
  process.stdout.write(`  ${id} … `);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`HTTP ${res.status} — skipped, left as it was`);
      failed += 1;
      continue;
    }
    const schema = inputSchemaOf(await res.json(), id);
    if (!schema?.properties) {
      console.log("no input schema in the document — skipped");
      failed += 1;
      continue;
    }
    /* Enums as well as names. A field name can be right and its value still
       wrong — '480P' where the endpoint says '480p', or an aspect ratio a
       model offers that the endpoint has never heard of. Both are a 422,
       and neither is visible from the field name alone. */
    const enums = {};
    for (const [field, spec] of Object.entries(schema.properties)) {
      const values = spec?.enum ?? spec?.anyOf?.find((a) => a?.enum)?.enum;
      if (Array.isArray(values)) enums[field] = values;
    }
    out[id] = {
      accepts: Object.keys(schema.properties).sort(),
      required: [...(schema.required ?? [])].sort(),
      ...(Object.keys(enums).length ? { enums } : {}),
    };
    console.log(
      `${out[id].accepts.length} fields, ${out[id].required.length} required, ${Object.keys(enums).length} with fixed values`,
    );
  } catch (err) {
    console.log("unreachable: " + err.message);
    failed += 1;
  }
  await new Promise((done) => setTimeout(done, 200));   // fal rate-limits
}

/* Endpoints that could not be read keep whatever was recorded before. A
   partial run must not silently delete a schema and turn a real check into
   a skipped one. */
let previous = {};
try { previous = JSON.parse(fs.readFileSync(OUT, "utf8")).endpoints ?? {}; } catch { /* first run */ }

const merged = { ...previous, ...out };
fs.writeFileSync(
  OUT,
  JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), endpoints: merged }, null, 2) + "\n",
);

console.log(`\nwrote ${Object.keys(merged).length} endpoints to src/lib/falSchemas.json`);
if (failed) console.log(`${failed} could not be read this run and kept their previous entry — run again to refresh them.`);
