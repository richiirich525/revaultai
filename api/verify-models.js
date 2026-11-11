import { createClient } from "@supabase/supabase-js";

/*
  verify-models — RevaultAI
  Asks fal whether every model id this codebase references actually exists,
  and what fal charges for it.

  It reads. GET https://api.fal.ai/v1/models/pricing?endpoint_id=<id> answers
  with a unit price for an endpoint fal knows and a 404 for one it does not.
  Nothing is submitted, nothing is queued, nothing is charged, and the answer
  is unambiguous.

  It did not always. Two earlier versions posted an empty body to the queue
  and read the status code, on the reasoning that a real endpoint has a
  schema and would reject it with a 422. That was true when it was measured
  and is not true now: fal has moved validation to the worker, so the queue
  answers 200 IN_QUEUE for every id, real or invented. The check that was
  built on that difference reported all seventeen working models as wrong
  ids — and queued seventeen empty jobs saying so. A probe that changes
  something on the other side is a probe that can bill you for being
  curious, and this one did, twice.

    200  the endpoint exists; the price comes back with it
    404  fal does not know this id
    401  FAL_KEY is missing or wrong
    403  this key may not use that endpoint

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
  One read per endpoint. Returns the price when fal knows it, so this check
  doubles as the only automatic record of what each model actually costs —
  the figure every credit rate should have been set from.
*/
async function priceOf(id) {
  try {
    const r = await fetch(
      "https://api.fal.ai/v1/models/pricing?endpoint_id=" + encodeURIComponent(id),
      { headers: { Authorization: "Key " + process.env.FAL_KEY } },
    );
    if (r.status !== 200) return { status: r.status, verdict: r.status === 404 ? "missing" : "auth", price: null };
    const body = await r.json().catch(() => null);
    const row = body?.prices?.[0];
    return {
      status: 200,
      verdict: "ok",
      price: row ? `${row.unit_price} ${row.currency ?? "USD"}/${row.unit ?? "unit"}` : "no price listed",
    };
  } catch (err) {
    return { status: null, verdict: "unreachable", price: null, note: err.message };
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
      results.push({ id, where, ...(await priceOf(id)) });
    }

    const missing = results.filter((r) => r.verdict === "missing");

    const candidates = [];
    for (const [id, where] of CANDIDATES) candidates.push({ id, where, ...(await priceOf(id)) });
    const realOnes = candidates.filter((c) => c.verdict === "ok");

    /*
      The summary is the one line the admin page shows, so everything worth
      knowing has to travel in it. Prices included: this is the only place
      that records what fal charges, and a rate set from a marketing page
      rather than from here is how the Kling 3.0 reference path came to lose
      money on every generation.
    */
    const head = missing.length
      ? "Wrong ids: " + missing.map((r) => r.where).join(", ")
      : `Every model id resolves (${results.length} checked).`;
    const prices = results
      .filter((r) => r.verdict === "ok" && r.price)
      .map((r) => `${r.id} ${r.price}`)
      .join(" | ");
    const tail = candidates.length
      ? realOnes.length
        ? " || Candidates fal knows: " + realOnes.map((c) => `${c.id} ${c.price}`).join(" | ")
        : " || No candidate is known to fal — " + candidates.map((c) => `${c.id}: HTTP ${c.status}`).join(", ")
      : "";

    return res.status(200).json({
      checked: results.length,
      missing: missing.length,
      summary: head + (prices ? " || Prices: " + prices : "") + tail,
      results,
      candidates,
    });
  } catch (err) {
    console.error("verify-models failed:", err);
    return res.status(500).json({ error: "Could not run the check." });
  }
}
