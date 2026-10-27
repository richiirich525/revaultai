import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";
import { completeGeneration, failGeneration } from "./generation-webhook.js";
import { endpointsFor } from "./generate-video.js";

/*
  reconcile-takes — RevaultAI

  Finishes takes the webhook never finished.

  A generation is submitted to fal's queue and completed by a callback. That
  callback is the only thing that ever marks a take done, which means a single
  missed delivery — a deploy mid-generation, a transient 500 in the handler,
  fal retrying and giving up — leaves a row in `processing` forever with the
  credits already spent and nothing in the system aware of it. The person sees
  a take that never arrives and no error, which is the worst shape a failure
  can take: it looks like patience is the answer.

  So this asks fal directly about anything that has been waiting too long, and
  finishes it through the same two functions the webhook uses. Not a second
  implementation of "mark it complete and store the video" — the rare path and
  the common path have to agree, and the one that drifts is always the rare one.

  IT CANNOT DOUBLE-SPEND OR DOUBLE-REFUND. Both finishers write with
  `.in("status", ["queued", "processing"])`, so a webhook arriving late after a
  reconcile has already settled a take changes nothing, and so does a second
  reconcile.

  Safe to run often and safe to run twice.
*/

export const config = { maxDuration: 60 };

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/* Long enough that nothing healthy is ever examined. The slowest model here
   is a 30-second shot, which lands well inside this. */
const STUCK_AFTER_MINUTES = 10;

/* After this, a job is not coming. set-status.js uses the same two hours for
   Marble worlds and for the same reason: an unfinished thing that old is a
   lost thing, and the credits belong back with the person. */
const GIVE_UP_AFTER_MINUTES = 120;

const MAX_PER_RUN = 25;

async function askFal(gen) {
  const endpoints = endpointsFor(gen.model);
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const status = await fal.queue.status(endpoint, { requestId: gen.fal_request_id });
      return { endpoint, status };
    } catch (err) {
      /* Wrong endpoint for this job reads as not-found; try the next. Any
         other failure is worth keeping if none of them answer. */
      lastError = err;
    }
  }
  return { endpoint: null, status: null, error: lastError };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    /*
      Two ways in. A signed-in person reconciling their own stuck takes, which
      is what the Takes page does when it notices one, and a scheduled caller
      holding CRON_SECRET, which reconciles everybody's. Neither can ask for
      somebody else's takes without the secret.
    */
    const bearer = (req.headers.authorization || "").replace("Bearer ", "");
    const cronSecret = process.env.CRON_SECRET;
    const asCron = !!cronSecret && bearer === cronSecret;

    let userId = null;
    if (!asCron) {
      const { data: { user } } = bearer
        ? await supabase.auth.getUser(bearer)
        : { data: { user: null } };
      if (!user) return res.status(401).json({ error: "Sign in first." });
      userId = user.id;
    }

    const stuckBefore = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000).toISOString();
    let q = supabase
      .from("generations")
      .select("id, user_id, model, status, credits_spent, fal_request_id, created_at")
      .in("status", ["queued", "processing"])
      .lt("created_at", stuckBefore)
      .order("created_at", { ascending: true })
      .limit(MAX_PER_RUN);
    if (userId) q = q.eq("user_id", userId);

    const { data: stuck, error: readError } = await q;
    if (readError) {
      console.error("reconcile-takes could not read:", readError);
      return res.status(502).json({ error: "Could not read takes: " + readError.message });
    }
    if (!stuck?.length) {
      return res.status(200).json({ checked: 0, completed: 0, failed: 0, waiting: 0 });
    }

    let completed = 0, failed = 0, waiting = 0;
    const notes = [];

    for (const gen of stuck) {
      const ageMinutes = (Date.now() - new Date(gen.created_at).getTime()) / 60_000;
      const tooOld = ageMinutes > GIVE_UP_AFTER_MINUTES;

      /*
        No request id means the submit itself never completed, so fal never
        heard about this take at all. Nothing to ask about and nothing coming:
        refund it.
      */
      if (!gen.fal_request_id) {
        await failGeneration(gen, "This take never reached the generator, so nothing was made. Credits refunded.");
        failed++;
        notes.push({ id: gen.id, did: "refunded", why: "never submitted" });
        continue;
      }

      const { endpoint, status } = await askFal(gen);

      if (!status) {
        /* fal does not recognize the job on any endpoint this model uses.
           Recent enough and that is probably a transient read, so leave it
           alone; old enough and it is gone. */
        if (tooOld) {
          await failGeneration(gen, "The generator has no record of this job. Credits refunded.");
          failed++;
          notes.push({ id: gen.id, did: "refunded", why: "unknown to fal" });
        } else {
          waiting++;
        }
        continue;
      }

      const state = status.status;

      if (state === "COMPLETED") {
        let url = null;
        try {
          const result = await fal.queue.result(endpoint, { requestId: gen.fal_request_id });
          url = result?.data?.video?.url ?? null;
        } catch (err) {
          console.error("reconcile-takes could not fetch a finished result:", err.message);
        }
        if (url) {
          await completeGeneration(gen, url);
          completed++;
          notes.push({ id: gen.id, did: "completed", why: "the webhook never arrived" });
        } else {
          await failGeneration(gen, "The generator finished without producing a video. Credits refunded.");
          failed++;
          notes.push({ id: gen.id, did: "refunded", why: "finished with no video" });
        }
        continue;
      }

      if (tooOld) {
        await failGeneration(gen, `Still ${String(state).toLowerCase().replace(/_/g, " ")} after two hours. Credits refunded.`);
        failed++;
        notes.push({ id: gen.id, did: "refunded", why: "stalled in the queue" });
        continue;
      }

      waiting++;
    }

    return res.status(200).json({ checked: stuck.length, completed, failed, waiting, notes });
  } catch (error) {
    console.error("reconcile-takes failed:", error);
    return res.status(500).json({ error: "Could not reconcile." });
  }
}
