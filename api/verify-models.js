import { createClient } from "@supabase/supabase-js";
import { FAL_COST_PER_SECOND, MODEL_FOR_ENDPOINT } from "../src/lib/falCosts.js";

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
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/*
  fal rate-limits the pricing API, and twenty-one reads in a row trips it.
  A 429 is not a wrong id — it is "ask again in a moment" — so it gets its
  own verdict and three retries. Conflating the two cost a whole run: four
  live Kling 4.0 endpoints were reported as unknown to fal when they had
  returned real prices thirty minutes earlier.
*/
async function priceOf(id, clock) {
  for (let attempt = 0; ; attempt += 1) {
    let r;
    try {
      r = await fetch(
        "https://api.fal.ai/v1/models/pricing?endpoint_id=" + encodeURIComponent(id),
        { headers: { Authorization: "Key " + process.env.FAL_KEY } },
      );
    } catch (err) {
      return { status: null, verdict: "unreachable", price: null, note: err.message };
    }

    if (r.status === 429) {
      if (attempt >= 3) {
        return { status: 429, verdict: "limited", price: null, note: "rate-limited after 4 tries" };
      }
      /*
        Retries are bounded by one clock for the whole run rather than per
        endpoint. Four tries each is seven seconds, and twenty-one endpoints
        all being limited would be two and a half minutes — a rate limit
        turning itself into a gateway timeout. Once the budget is spent every
        remaining read gives up without sleeping, and the summary reports them
        as unanswered. Slower news, but true news.
      */
      if (Date.now() > clock.deadline) {
        return { status: 429, verdict: "limited", price: null, note: "rate-limited, retry budget spent" };
      }
      clock.limited += 1;
      // Honor fal's own Retry-After when it sends one, else back off.
      const after = Number(r.headers.get("retry-after"));
      await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 10) * 1000 : 1000 * 2 ** attempt);
      continue;
    }

    if (r.status !== 200) {
      return { status: r.status, verdict: r.status === 404 ? "missing" : "auth", price: null };
    }

    const body = await r.json().catch(() => null);
    const row = body?.prices?.[0];
    return {
      status: 200,
      verdict: "ok",
      price: row ? `${row.unit_price} ${row.currency ?? "USD"}/${row.unit ?? "unit"}` : "no price listed",
    };
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

    // Paced, because the limit is on how fast the reads arrive rather than
    // how many. Twenty-one at 150ms is three seconds, well inside the
    // function timeout.
    const clock = { deadline: Date.now() + 15_000, limited: 0 };

    const results = [];
    for (const [id, where] of ENDPOINTS) {
      results.push({ id, where, ...(await priceOf(id, clock)) });
      await sleep(150);
    }

    const missing = results.filter((r) => r.verdict === "missing");
    // Anything that is neither a price nor a 404 is an unanswered question,
    // not a pass. Counting only 404s as failure is how eight rate-limited
    // endpoints were reported as resolving.
    const unclear = results.filter((r) => r.verdict !== "ok" && r.verdict !== "missing");

    const candidates = [];
    for (const [id, where] of CANDIDATES) {
      candidates.push({ id, where, ...(await priceOf(id, clock)) });
      await sleep(150);
    }
    const realOnes = candidates.filter((c) => c.verdict === "ok");
    const unclearCandidates = candidates.filter((c) => c.verdict !== "ok" && c.verdict !== "missing");

    /*
      The summary is the one line the admin page shows, so everything worth
      knowing has to travel in it. Prices included: this is the only place
      that records what fal charges, and a rate set from a marketing page
      rather than from here is how the Kling 3.0 reference path came to lose
      money on every generation.
    */
    const head = missing.length
      ? "Wrong ids: " + missing.map((r) => r.where).join(", ")
      : unclear.length
        ? `No wrong ids, but ${unclear.length} of ${results.length} went unanswered: ` +
          unclear.map((r) => `${r.where} (${r.verdict}${r.status ? " " + r.status : ""})`).join(", ")
        : `Every model id resolves (${results.length} checked).`;
    const prices = results
      .filter((r) => r.verdict === "ok" && r.price)
      .map((r) => `${r.id} ${r.price}`)
      .join(" | ");

    /*
      Drift. src/lib/falCosts.js is what every credit rate was set from, and
      check-margin fails the build against it — but that file is a snapshot
      typed in by hand, and fal can raise a price any day without telling
      anybody. This is the only place that sees both numbers, so it is the
      only place that can notice. A rise reported here is a rate to revisit;
      silence means the recorded figures still hold.
    */
    const drift = [];
    // Candidates included: Kling 4.0's price is recorded but it is not wired
    // yet, so its endpoints are read as candidates. A recorded figure that
    // nothing re-reads is a figure that quietly goes stale.
    for (const r of [...results, ...candidates]) {
      if (r.verdict !== "ok" || !r.price) continue;
      const key = MODEL_FOR_ENDPOINT[r.id];
      if (!key) continue;                           // an endpoint nothing is priced from
      const recorded = FAL_COST_PER_SECOND[key];
      if (recorded == null) continue;               // never measured, nothing to compare
      const perSecond = r.price.match(/^([\d.]+) \S+\/second$/);
      if (!perSecond) continue;                     // token-priced, not per-second
      const live = Number(perSecond[1]);
      if (Math.abs(live - recorded) > 0.0005) {
        drift.push(
          `${key}: recorded $${recorded.toFixed(3)}/sec, fal now charges $${live.toFixed(3)}/sec`,
        );
      }
    }
    const driftLine = drift.length
      ? " || PRICE DRIFT, revisit the credit rates — " + [...new Set(drift)].join("; ")
      : "";
    const tail = candidates.length
      ? realOnes.length
        ? " || Candidates fal knows: " + realOnes.map((c) => `${c.id} ${c.price}`).join(" | ")
        : unclearCandidates.length
          ? " || Candidates went unanswered, nothing proved either way — " +
            candidates.map((c) => `${c.id}: ${c.verdict}${c.status ? " " + c.status : ""}`).join(", ")
          : " || No candidate is known to fal — " + candidates.map((c) => `${c.id}: HTTP ${c.status}`).join(", ")
      : "";

    return res.status(200).json({
      checked: results.length,
      missing: missing.length,
      unanswered: unclear.length,
      drift,
      summary: head + (prices ? " || Prices: " + prices : "") + driftLine + tail,
      results,
      candidates,
    });
  } catch (err) {
    console.error("verify-models failed:", err);
    return res.status(500).json({ error: "Could not run the check." });
  }
}
