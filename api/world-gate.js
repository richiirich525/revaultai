import { createClient } from "@supabase/supabase-js";
import { capsuleFrom, capsuleGaps } from "../src/lib/worldCapsule.js";

/*
  world-gate — RevaultAI

  Runs capsule extraction across takes already made and reports how many of
  them would yield a world worth walking into. Writes nothing.

  This exists because the decision to build the room rests on an assumption
  that can be checked rather than argued about: that a take carries enough
  structure to become a place, without the creator filling in a form. If most
  takes come back unusable, the answer is not a better room — it is that
  locking needs to ask for one or two things after all, and it is much cheaper
  to learn that from takes that already exist than from a room nobody can
  furnish.

  It also names WHY each take falls short, counted across the whole set, so
  the fix is aimed. "Nine of twenty, and sixteen of them have no observed
  ending" is a different instruction from "nine of twenty".

  Read-only, own takes only, and capped. Three queries rather than three per
  take, because the honest version of this runs over a hundred takes and an
  N+1 would time out and report a worse number than the truth.
*/

const MAX_TAKES = 200;

/* Matches every other admin route here, checked server-side rather than
   trusted from the client. */
const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const limit = Math.min(Number(req.query?.limit ?? req.body?.limit) || 50, MAX_TAKES);

    /*
      Whose takes to measure.

      "mine" is the honest default and the only thing a normal user can ask
      for. "all" exists because the question this answers is a product
      question — do takes in general carry enough structure to become a world
      — and the account that asks it is not necessarily the account that makes
      the films. Measuring one person's own takes from an admin account that
      has never generated anything returns zero and means nothing.

      Across everybody, the numbers come back as counts only. Nobody else's
      prompts are shown: the reasons are the useful part, and a list of other
      people's ideas is not something an aggregate needs to include.
    */
    const everyone = (req.body?.scope ?? req.query?.scope) === "all";
    if (everyone && !ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Only an admin can measure every account." });
    }
    /* Applied to every read below or none of them. Filtering takes by owner
       but not the Vault entries they reference would resolve other people's
       casts to nothing and report their worlds as empty — a wrong number that
       looks exactly like a real one. */
    const mine = (q) => (everyone ? q : q.eq("user_id", user.id));

    const { data: takes, error: takesError } = await mine(
      supabase
        .from("generations")
        .select("id, user_id, prompt, model, status, project_id, film_spec_id, film_spec_version, vault_ref_ids, end_frame_url, end_frame_at, created_at, completed_at"),
    )
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(limit);

    /*
      A failed query must not read as an empty one. The first version of this
      ignored the error and reported "no finished takes to measure yet", which
      is what a database with hundreds of takes looks like when one column in
      the select does not exist. A wrong zero sends you looking in the wrong
      place; the error says which column.
    */
    if (takesError) {
      console.error("world-gate could not read takes:", takesError);
      return res.status(502).json({ error: "Could not read your takes: " + takesError.message });
    }

    const rows = takes ?? [];
    if (!rows.length) {
      return res.status(200).json({ takes: 0, usable: 0, rate: null, note: "No finished takes to measure yet." });
    }

    /* Everything the whole set refers to, in three queries. */
    const specIds = [...new Set(rows.map((r) => r.film_spec_id).filter(Boolean))];
    const refIds = [...new Set(rows.flatMap((r) => (Array.isArray(r.vault_ref_ids) ? r.vault_ref_ids : [])).filter((v) => typeof v === "string"))];
    const takeIds = rows.map((r) => r.id);

    const [specsRes, vaultRes, observedRes] = await Promise.all([
      specIds.length
        ? mine(supabase.from("film_specs").select("id, spec")).in("id", specIds)
        : Promise.resolve({ data: [] }),
      refIds.length
        ? mine(supabase.from("vault_entries")
            .select("id, kind, name, description, wardrobe, distinguishing, images, voice_preset, voice_sample_url"))
            .in("id", refIds)
        : Promise.resolve({ data: [] }),
      mine(supabase.from("observed_states").select("generation_id, observed_end, differences"))
        .in("generation_id", takeIds),
    ]);

    /*
      Same reasoning one level down. A spec or Vault read that quietly failed
      would not break the measurement — it would make every take look thinner
      than it is and report a gate number that is simply wrong, which is the
      most expensive kind of answer to get back.
    */
    const readError = specsRes.error ?? vaultRes.error ?? observedRes.error;
    if (readError) {
      console.error("world-gate could not read what the takes refer to:", readError);
      return res.status(502).json({ error: "Could not read what your takes refer to: " + readError.message });
    }

    const specById = new Map((specsRes.data ?? []).map((s) => [s.id, s.spec]));
    const vaultById = new Map((vaultRes.data ?? []).map((v) => [v.id, v]));
    const observedByTake = new Map((observedRes.data ?? []).map((o) => [o.generation_id, o]));

    let usable = 0;
    const reasons = new Map();
    const shortfalls = new Map();
    const worst = [];

    for (const take of rows) {
      const refs = Array.isArray(take.vault_ref_ids) ? take.vault_ref_ids : [];
      const capsule = capsuleFrom({
        generation: take,
        spec: specById.get(take.film_spec_id) ?? null,
        vault: refs.map((id) => vaultById.get(id)).filter(Boolean),
        observed: observedByTake.get(take.id) ?? null,
        /* No rehearsal: nothing links a take to the scene it was blocked in,
           so this measurement is the floor rather than the ceiling. Takes
           locked with a rehearsal named will do better than this number. */
        rehearsal: null,
      });
      const gaps = capsuleGaps(capsule);

      if (gaps.usable) {
        usable++;
        /* Counted only for the worlds that work. For one that does not, the
           missing list is the whole story, and folding its shortfalls in here
           would inflate every count with takes that were never worlds. */
        for (const t of gaps.thin) shortfalls.set(t, (shortfalls.get(t) ?? 0) + 1);
      } else {
        for (const m of gaps.missing) reasons.set(m, (reasons.get(m) ?? 0) + 1);
        /* Not across everybody: see the note on scope above. */
        if (!everyone && worst.length < 10) {
          worst.push({ id: take.id, prompt: String(take.prompt ?? "").slice(0, 80), missing: gaps.missing });
        }
      }
    }

    const byCount = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([reason, count]) => ({ reason, count }));

    return res.status(200).json({
      scope: everyone ? "all" : "mine",
      accounts: everyone ? new Set(rows.map((r) => r.user_id)).size : 1,
      takes: rows.length,
      usable,
      rate: Math.round((usable / rows.length) * 100) / 100,
      /* The gate as the plan states it: seven in ten. */
      passesGate: usable / rows.length >= 0.7,
      whyNot: byCount(reasons),
      thinEvenWhenUsable: byCount(shortfalls),
      examples: worst,
    });
  } catch (error) {
    console.error("world-gate failed:", error);
    return res.status(500).json({ error: "Something went wrong measuring takes." });
  }
}
