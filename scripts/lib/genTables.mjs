/*
  genTables — RevaultAI

  Reads MODELS and REF_MODELS out of api/generate-video.js.

  They are not exported, and that module builds a Supabase client and an S3
  client the moment it is imported, so a build check cannot simply import it.
  The tables are pure data literals, so they are lifted out by matching their
  braces and evaluated as literals — the same approach check-margin already
  uses to read creditsPerSecond, extended to the whole object.

  If either table ever stops being a literal this throws rather than guessing,
  which is the behavior we want: a payload check that cannot read the table is
  a payload check that must not report success.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const GENERATE_VIDEO = path.join(ROOT, "api", "generate-video.js");

function objectLiteralAfter(src, declaration) {
  const start = src.indexOf(declaration);
  if (start === -1) throw new Error(`could not find "${declaration}" in api/generate-video.js`);
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`"${declaration}" has no closing brace`);
}

function evaluate(literal, what) {
  try {
    // Our own repo file, and a data literal by construction. Anything that is
    // not one — a call, a reference to an import — throws here and the check
    // fails loudly instead of silently reading a partial table.
    return new Function(`"use strict"; return (${literal});`)();
  } catch (err) {
    throw new Error(`${what} is not a plain object literal any more: ${err.message}`);
  }
}

export function readTables() {
  const src = fs.readFileSync(GENERATE_VIDEO, "utf8");
  const MODELS = evaluate(objectLiteralAfter(src, "const MODELS ="), "MODELS");
  const REF_MODELS = evaluate(objectLiteralAfter(src, "const REF_MODELS ="), "REF_MODELS");
  if (!Object.keys(MODELS).length) throw new Error("MODELS came back empty");
  return { MODELS, REF_MODELS };
}

/*
  Every key the generator can put in the fal input for a given model, split by
  which endpoint it would go to. Read straight off the submit block in
  api/generate-video.js — if that block gains a key, this has to gain it too,
  and the comment there says so.
*/
export function payloadFor(modelKey, MODELS, REF_MODELS) {
  const m = MODELS[modelKey];
  const r = REF_MODELS[modelKey];
  const always = new Set(["prompt", "duration", ...Object.keys(m.extraInput ?? {})]);
  const routes = [];

  // Text route: no frame, no references, so aspect_ratio is always sent.
  if (m.falId) {
    routes.push({ endpoint: m.falId, route: "text", keys: new Set([...always, "aspect_ratio"]) });
  }

  // Image route: entered when a start frame OR an end frame is present.
  if (m.imageFalId) {
    const keys = new Set(always);
    if (!m.aspectIgnoredWithImage) keys.add("aspect_ratio");
    keys.add(m.startFrameParam || "image_url");
    if (m.endFrame) keys.add("end_image_url");
    routes.push({
      endpoint: m.imageFalId,
      route: "image",
      keys,
      startParam: m.startFrameParam || "image_url",
      // True when the route can be reached with no opening frame at all.
      endFrameAlone: !!m.endFrame,
    });
  }

  // Reference route: a frame may also be attached, so aspect_ratio can ride along.
  if (r?.falId) {
    const keys = new Set([...always, "aspect_ratio", ...Object.keys(r.extra ?? {})]);
    if (r.mode === "elements") keys.add("elements");
    else keys.add(r.refsParam || "image_urls");
    if (r.startFrameWithRefs) keys.add(m.startFrameParam || "image_url");
    if (m.endFrame) keys.add("end_image_url");
    routes.push({ endpoint: r.falId, route: "reference", keys });
  }

  return routes;
}
