#!/usr/bin/env node
/*
  check-payload — RevaultAI

  Every field the generator sends to fal must be one fal accepts, and every
  field fal requires must be one the generator sends.

  This exists because of a 422. Kling 4.0's image endpoint requires
  start_image_url; the generator sent image_url, which that endpoint does
  not have. fal rejected it with both faults at once — an unknown field and
  a missing required one — and the only way anyone found out was a creator
  pressing Part 2 and watching it fail. Twice.

  The failure before that one was the same shape. v4's TEXT endpoint had
  been read carefully, its duration and resolution confirmed field by field,
  and the image endpoint was assumed to match. It did not. Checking one
  thing and generalizing to its neighbour is the error this file exists to
  make impossible.

  Offline. It reads src/lib/falSchemas.json, which `npm run fal:schemas`
  writes from fal's own OpenAPI documents. A build never touches the network.

  Four things are checked, for every model and every route it can take:

    1. No field is sent that the endpoint does not accept.
    2. Every required field of that endpoint is one the generator sends.
    3. A required opening frame is not left to chance — if a route can be
       entered with only a closing frame, the opening frame cannot be
       required.
    4. Every value the generator can send for a field with fixed choices is
       one of those choices — the durations offered, the aspect ratios
       offered, and anything in extraInput. A right field name carrying a
       wrong value is the same 422 as a wrong name, and Veo 3.1's duration
       being '8s' rather than 8 is exactly the kind of thing nobody
       remembers per model.

    5. Every endpoint the generator can submit to has a recorded schema.
       An endpoint with no schema is NOT a pass: it is an unchecked one, and
       saying so out loud is the whole lesson of the week.
*/

import fs from "node:fs";
import path from "node:path";
import { readTables, payloadFor, ROOT } from "./lib/genTables.mjs";

const MANIFEST = path.join(ROOT, "src", "lib", "falSchemas.json");
const problems = [];
const unchecked = [];

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
} catch {
  console.error(
    "check-payload FAILED:\n  - src/lib/falSchemas.json is missing or unreadable. " +
      "Run `npm run fal:schemas` to write it.",
  );
  process.exit(1);
}

const schemas = manifest.endpoints ?? {};
const { MODELS, REF_MODELS } = readTables();
let routesChecked = 0;

for (const modelKey of Object.keys(MODELS)) {
  for (const route of payloadFor(modelKey, MODELS, REF_MODELS)) {
    const schema = schemas[route.endpoint];
    if (!schema) {
      unchecked.push(`${modelKey} ${route.route} -> ${route.endpoint}`);
      continue;
    }
    routesChecked += 1;
    const accepts = new Set(schema.accepts ?? []);
    const sends = route.keys;

    // 1. Nothing we send may be unknown to the endpoint.
    for (const key of sends) {
      if (!accepts.has(key)) {
        problems.push(
          `${modelKey} on its ${route.route} route sends "${key}", which ` +
            `${route.endpoint} does not accept. It accepts: ${[...accepts].join(", ")}`,
        );
      }
    }

    // 2. Nothing the endpoint requires may be missing.
    for (const key of schema.required ?? []) {
      if (!sends.has(key)) {
        problems.push(
          `${route.endpoint} requires "${key}" and ${modelKey}'s ${route.route} route never sends it`,
        );
      }
    }

    // 3. A closing frame alone must not land on a route that demands an
    //    opening one — that route is reachable with no start frame at all.
    if (route.route === "image" && route.endFrameAlone && (schema.required ?? []).includes(route.startParam)) {
      problems.push(
        `${modelKey} can reach ${route.endpoint} with only an end frame, but that endpoint ` +
          `requires "${route.startParam}" — an end-frame-only generation would be rejected`,
      );
    }

    /*
      4. Values, where the endpoint fixes them. Only enums are checked, not
         types: fal's validator coerces a numeric string to a number, so
         flagging that would be a false alarm, and a check that cries wolf
         is a check somebody turns off.
    */
    const enums = schema.enums ?? {};
    const model = MODELS[modelKey];
    const values = [
      ["duration", Object.values(model.durationParam ?? {})],
      ["aspect_ratio", sends.has("aspect_ratio") ? (model.aspectRatios ?? []) : []],
      ...Object.entries(model.extraInput ?? {}).map(([k, v]) => [k, [v]]),
    ];
    for (const [field, sent] of values) {
      const allowed = enums[field];
      if (!allowed || !sent.length) continue;
      for (const value of sent) {
        if (!allowed.includes(value)) {
          problems.push(
            `${modelKey} on its ${route.route} route can send ${field}=${JSON.stringify(value)}, ` +
              `which ${route.endpoint} does not allow. It allows: ${allowed.map((v) => JSON.stringify(v)).join(", ")}`,
          );
        }
      }
    }
  }
}

if (problems.length) {
  console.error("check-payload FAILED:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

let line = `check-payload: ${routesChecked} model routes send only fields fal accepts, and every required field is covered (schemas fetched ${manifest.fetched ?? "unknown"}).`;
if (unchecked.length) {
  line += `\n  no recorded schema, so NOT checked: ${unchecked.join("; ")} — run \`npm run fal:schemas\`.`;
}
console.log(line);
