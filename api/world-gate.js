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

    const { data: takes, error: takesError } = await supabase
      .from("generations")
      .select("id, user_id, prompt, model, status, project_id, film_spec_id, film_spec_version, vault_ref_ids, end_frame_url, end_frame_at, created_at, completed_at")
      .eq("user_id", user.id)
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
        ? supabase.from("film_specs").select("id, spec").eq("user_id", user.id).in("id", specIds)
        : Promise.resolve({ data: [] }),
      refIds.length
        ? supabase.from("vault_entries")
            .select("id, kind, name, description, wardrobe, distinguishing, images, voice_preset, voice_sample_url")
            .eq("user_id", user.id).in("id", refIds)
        : Promise.resolve({ data: [] }),
      supabase.from("observed_states").select("generation_id, observed_end, differences")
        .eq("user_id", user.id).in("generation_id", takeIds),
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
        if (worst.length < 10) worst.push({ id: take.id, prompt: String(take.prompt ?? "").slice(0, 80), missing: gaps.missing });
      }
    }

    const byCount = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([reason, count]) => ({ reason, count }));

    return res.status(200).json({
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
