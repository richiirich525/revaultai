import { createClient } from "@supabase/supabase-js";

/*
  verify-models — RevaultAI
  Asks fal whether every model id this codebase references actually exists.

  It sends each endpoint an empty input. Every one of these models requires a
  prompt, so validation fails before any work is queued: nothing generates and
  nothing is charged. What we read is the status code.

    404  the endpoint id is wrong
    422  the endpoint exists and rejected our empty input (what we want)
    401  FAL_KEY is missing or wrong
    200  unexpected — treat as suspicious and check by hand

  Admin only, and safe to re-run whenever a model is added or a provider
  renames something underneath us.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

// Every id referenced in api/generate-video.js and api/generate-image.js,
// with where it is used so a failure points at the right line.
const ENDPOINTS = [
  ["wan/v2.6/text-to-video",                          "wan-2.6 falId"],
  ["wan/v2.6/image-to-video",                         "wan-2.6 imageFalId"],
  ["fal-ai/kling-video/v3/standard/text-to-video",    "kling-3.0 falId"],
  ["fal-ai/kling-video/v3/standard/image-to-video",   "kling-3.0 imageFalId"],
  ["fal-ai/kling-video/o3/standard/reference-to-video", "kling-3.0 reference"],
  ["bytedance/seedance-2.0/fast/text-to-video",       "seedance-2.0 falId"],
  ["bytedance/seedance-2.0/fast/image-to-video",      "seedance-2.0 imageFalId"],
  ["bytedance/seedance-2.0/fast/reference-to-video",  "seedance-2.0 reference"],
  ["bytedance/seedance-2.5/text-to-video",            "seedance-2.5 falId"],
  ["bytedance/seedance-2.5/image-to-video",           "seedance-2.5 imageFalId"],
  ["bytedance/seedance-2.5/reference-to-video",       "seedance-2.5 reference"],
  ["fal-ai/veo3.1/fast",                              "veo-3.1 (bare path)"],
  ["fal-ai/veo3.1/fast/text-to-video",                "veo-3.1 falId"],
  ["fal-ai/veo3.1/fast/image-to-video",               "veo-3.1 imageFalId"],
  ["fal-ai/veo3.1/fast/reference-to-video",           "veo-3.1 reference"],
  ["fal-ai/bytedance/seedream/v5/text-to-image",      "seedream-5.0 image"],
  ["fal-ai/nano-banana-2",                            "nano-banana-2 image"],
];

/*
  Candidates — ids we are testing, not ids we depend on.

  Kept apart from ENDPOINTS on purpose. ENDPOINTS is a contract: every one
  of those must resolve, and a single 404 there is a real failure worth
  turning the check amber for. A candidate is the opposite — most of these
  are *expected* to 404, because the whole point is to find which spelling
  is real. Counting them as problems would leave the check permanently
  failing and teach us to ignore it.

  fal's model pages write Kling 4.0 as `kling/v4/...` with no owner prefix,
  but its request log strips prefixes from every id it displays, so those
  pages are not proof. The v3 family we already call lives under
  `fal-ai/kling-video/v3/...`. Probe all three spellings; the one that
  answers 422 is real. Once it is wired into generate-video.js, move the
  winner into ENDPOINTS and delete the rest.
*/
const CANDIDATES = [
  ["kling/v4/text-to-video",                   "Kling 4.0 text — A"],
  ["fal-ai/kling/v4/text-to-video",            "Kling 4.0 text — B"],
  ["fal-ai/kling-video/v4/text-to-video",      "Kling 4.0 text — C"],
  ["kling/v4/image-to-video",                  "Kling 4.0 image — A"],
  ["fal-ai/kling/v4/image-to-video",           "Kling 4.0 image — B"],
  ["fal-ai/kling-video/v4/image-to-video",     "Kling 4.0 image — C"],
  ["kling/v4/reference-to-video",              "Kling 4.0 reference — A"],
  ["fal-ai/kling/v4/reference-to-video",       "Kling 4.0 reference — B"],
  ["fal-ai/kling-video/v4/reference-to-video", "Kling 4.0 reference — C"],
];

const VERDICT = {
  404: ["missing", "This id does not exist on fal."],
  422: ["ok", "Endpoint exists; it rejected the empty input, as expected."],
  401: ["auth", "FAL_KEY is missing or rejected."],
  403: ["auth", "FAL_KEY is not allowed to use this endpoint."],
  200: ["suspicious", "Accepted an empty input — check this one by hand."],
};

async function probe(id) {
  try {
    const r = await fetch("https://queue.fal.run/" + id, {
      method: "POST",
      headers: {
        "Authorization": "Key " + process.env.FAL_KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const [verdict, note] = VERDICT[r.status] ?? ["unknown", "Unexpected status."];
    return { status: r.status, verdict, note };
  } catch (err) {
    return { status: null, verdict: "unreachable", note: err.message };
  }
}

export default async function handler(req, res) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (!ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: "FAL_KEY is not set in this environment." });
    }

    const results = [];
    for (const [id, where] of ENDPOINTS) {
      results.push({ id, where, ...(await probe(id)) });
    }

    const candidates = [];
    for (const [id, where] of CANDIDATES) {
      candidates.push({ id, where, ...(await probe(id)) });
    }

    const missing = results.filter((r) => r.verdict === "missing");
    const live = candidates.filter((c) => c.verdict === "ok");

    // "missing" counts only ENDPOINTS, so a candidate that does not exist
    // never turns this check amber. The summary is the one line the admin
    // page shows, so the candidate verdict has to travel in it.
    const head = missing.length
      ? "Wrong ids: " + missing.map((r) => r.where).join(", ")
      : "Every model id resolves.";
    /*
      A candidate that fails is not all one thing, and the difference is the
      whole answer: 404 means the id does not exist, while 403 means it does
      and this key may not call it yet. Reporting only the 422s threw that
      away and left "none resolved" meaning either. Group by verdict instead.
    */
    const byVerdict = {};
    for (const c of candidates) (byVerdict[c.verdict] ??= []).push(c.id);
    const tail = candidates.length
      ? live.length
        ? " Candidates that exist: " + live.map((c) => c.id).join(", ") + "."
        : " No candidate resolved — " + Object.entries(byVerdict)
          .map(([v, ids]) => `${v} (${ids.length}): ${ids.join(", ")}`)
          .join(" | ")
      : "";

    return res.status(200).json({
      checked: results.length,
      missing: missing.length,
      summary: head + tail,
      results,
      candidates,
    });
  } catch (err) {
    console.error("verify-models failed:", err);
    return res.status(500).json({ error: "Could not run the check." });
  }
}
