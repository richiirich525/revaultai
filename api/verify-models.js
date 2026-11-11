import { createClient } from "@supabase/supabase-js";

/*
  verify-models — RevaultAI
  Asks fal whether every model id this codebase references actually exists.

  It sends each endpoint an empty input. A real endpoint has a schema, so fal
  validates against it and rejects the empty body with a 422 before any work
  is queued: nothing generates and nothing is charged.

  That holds ONLY for ids that exist. An id fal does not know has no schema
  to check, so the queue accepts the submission and answers 200 with
  {"status":"IN_QUEUE","request_id":...} — a real queued job. Probing a
  speculative id here therefore queues work rather than testing a name, and
  this file is not the tool for that. To ask whether an id exists, read it:
  GET https://api.fal.ai/v1/models/pricing?endpoint_id=<id> returns the unit
  price for a real endpoint and changes nothing.

  Every id below is one this codebase already calls, so every one of them
  should answer 422. What we read is the status code.

    404  the endpoint id is wrong
    422  the endpoint exists and rejected our empty input (what we want)
    401  FAL_KEY is missing or wrong
    200  NOT a pass — fal queued a job, which means it does not know this id

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
  Candidates — ids we are asking about, read rather than submitted.

  The header above says what the right tool is for a speculative id, and
  this is it. A GET to the pricing API answers whether fal knows an endpoint
  and what it charges, without queuing anything, without spending anything,
  and without the ambiguity that made the last attempt at this enqueue
  twenty-seven jobs. Nothing here touches the pass/fail verdict: these are
  questions, not promises.

  Kling 4.0 is the standing question. On 1 November every spelling of it
  came back unknown; fal's own documentation now carries working code for
  these four. One run settles which is true, and the prices come back with
  the answer so the credit rate can be set from fal's own numbers rather
  than a marketing page.
*/
const CANDIDATES = [
  ["kling/v4/text-to-video",        "Kling 4.0 text-to-video"],
  ["kling/v4/image-to-video",       "Kling 4.0 image-to-video"],
  ["kling/v4/reference-to-video",   "Kling 4.0 reference-to-video"],
  ["kling/v4/video-to-video/edit",  "Kling 4.0 edit"],
];

/*
  Read-only. A 200 carries the unit price; a 404 means fal does not know the
  id. Unlike the queue probe, neither outcome changes anything on fal's side.
*/
async function priceOf(id) {
  try {
    const r = await fetch(
      "https://api.fal.ai/v1/models/pricing?endpoint_id=" + encodeURIComponent(id),
      { headers: { Authorization: "Key " + process.env.FAL_KEY } },
    );
    const text = (await r.text().catch(() => "")).slice(0, 200);
    return { status: r.status, body: text };
  } catch (err) {
    return { status: null, body: err.message };
  }
}

const VERDICT = {
  404: ["missing", "This id does not exist on fal."],
  422: ["ok", "Endpoint exists; it rejected the empty input, as expected."],
  401: ["auth", "FAL_KEY is missing or rejected."],
  403: ["auth", "FAL_KEY is not allowed to use this endpoint."],
  // Measured, not assumed: an unknown id answers 200 with IN_QUEUE and a
  // request_id, because there is no schema to reject the empty body against.
  // So a 200 is the same failure as a 404, and queues a job besides.
  200: ["missing", "fal queued this instead of rejecting it — it does not know this id."],
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

    /*
      A status code alone cannot read a 200.

      Nine made-up Kling 4.0 spellings across three namespaces all answered
      200 to an empty body, which no three real namespaces could. So a 200
      is ambiguous: fal may be returning a not-found body under an OK
      status, or the queue may be accepting a submission it has not
      validated. Those mean opposite things — nothing happened, or a job
      was queued — so the body is what settles it, and only for the codes
      where the status is not already conclusive.
    */
    let body = null;
    if (r.status === 200 || r.status === 404) {
      body = (await r.text().catch(() => "")).slice(0, 300);
    }
    return { status: r.status, verdict, note, ...(body === null ? {} : { body }) };
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

    const missing = results.filter((r) => r.verdict === "missing");

    const candidates = [];
    for (const [id, where] of CANDIDATES) candidates.push({ id, where, ...(await priceOf(id)) });
    const realOnes = candidates.filter((c) => c.status === 200);

    // The summary is the one line the admin page shows, so the answer has to
    // travel in it rather than only in the JSON below.
    const tail = candidates.length
      ? realOnes.length
        ? " Candidates fal knows: " + realOnes.map((c) => `${c.id} ${c.body}`).join(" | ")
        : " No candidate is known to fal — " + candidates.map((c) => `${c.id}: HTTP ${c.status}`).join(", ")
      : "";

    return res.status(200).json({
      checked: results.length,
      missing: missing.length,
      summary: (missing.length
        ? "Wrong ids: " + missing.map((r) => r.where).join(", ")
        : "Every model id resolves.") + tail,
      results,
      candidates,
    });
  } catch (err) {
    console.error("verify-models failed:", err);
    return res.status(500).json({ error: "Could not run the check." });
  }
}
