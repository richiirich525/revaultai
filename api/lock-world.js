import { createClient } from "@supabase/supabase-js";
import { capsuleFrom, capsuleGaps } from "../src/lib/worldCapsule.js";

/*
  lock-world — RevaultAI

  Turns a take into a place somebody can walk into.

  There is no form. The creator picks a take and that is the whole
  interaction, because everything a world needs has already been written down
  for some other reason: the Vault entries the take referenced, the Shot Spec
  it compiled from, the ending state the Script Supervisor observed in the
  footage, and — if they say which — the rehearsal it was blocked in. Asking
  them to describe the world a second time would be asking them to retype
  their own Vault.

  Why this is a server route rather than a client insert. The capsule is
  assembled from five tables, and the one that matters most is the Vault: a
  world says who is in it and what they sound like, and if the client sent
  that, a forged request could put somebody else's character in a room and
  give it a voice it does not own. So every source here is read server-side
  and keyed to the signed-in user, the same rule the Recording Studio
  follows. The client sends an id and nothing else that reaches the capsule.

  Locking is free. It derives from work already paid for, and a toll on the
  step between making a take and getting a world out of it would mean most
  takes never became worlds.
*/

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { generationId, rehearsalId } = req.body || {};
    if (typeof generationId !== "string" || !generationId) {
      return res.status(400).json({ error: "Which take should this world come from?" });
    }

    /* ---- The take ------------------------------------------------------ */
    const { data: gen, error: genError } = await supabase
      .from("generations")
      .select("id, user_id, prompt, model, status, project_id, film_spec_id, film_spec_version, vault_ref_ids, end_frame_url, end_frame_at, created_at, completed_at")
      .eq("id", generationId)
      .maybeSingle();

    /* Distinguish a take that is not there from a query that did not run.
       Both produce no row, and "that take does not exist" sends you looking
       for a missing take rather than a missing column. */
    if (genError) {
      console.error("lock-world could not read the take:", genError);
      return res.status(502).json({ error: "Could not read that take: " + genError.message });
    }
    if (!gen) return res.status(404).json({ error: "That take does not exist." });
    if (gen.user_id !== user.id) return res.status(403).json({ error: "Not your take" });
    if (gen.status !== "complete") {
      return res.status(400).json({
        error: gen.status === "failed"
          ? "That take failed, so there is no world in it yet."
          : "That take is still generating. Lock it once it has finished.",
      });
    }

    /*
      ---- Everything the take already knows ------------------------------

      Read in parallel and each one keyed to this user. A spec or a rehearsal
      that belongs to somebody else must come back empty rather than being
      quietly folded into their world, which is why the ownership filter is on
      the query and not checked afterwards.
    */
    const refIds = Array.isArray(gen.vault_ref_ids) ? gen.vault_ref_ids.filter((v) => typeof v === "string") : [];

    const [specRes, vaultRes, observedRes, rehearsalRes, extractedRes] = await Promise.all([
      gen.film_spec_id
        ? supabase.from("film_specs").select("spec").eq("id", gen.film_spec_id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      refIds.length
        ? supabase.from("vault_entries")
            .select("id, kind, name, description, wardrobe, distinguishing, images, voice_preset, voice_sample_url")
            .eq("user_id", user.id)
            .in("id", refIds)
        : Promise.resolve({ data: [] }),
      supabase.from("observed_states").select("observed_end, differences")
        .eq("generation_id", gen.id).eq("user_id", user.id).maybeSingle(),
      typeof rehearsalId === "string" && rehearsalId
        ? supabase.from("rehearsals").select("id, title, data").eq("id", rehearsalId).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("prompt_extractions").select("extracted")
        .eq("generation_id", gen.id).eq("user_id", user.id).maybeSingle(),
    ]);

    /* A read that failed here would not fail the lock — it would lock a
       thinner world than the creator actually has, or refuse one that was
       fine. Either is worse than saying so. */
    /* Not fatal, for the same reason as the gate: a world locked without it
       is thinner, not broken. */
    if (extractedRes.error) console.error("lock-world: no prompt extraction read:", extractedRes.error.message);
    const readError = specRes.error ?? vaultRes.error ?? observedRes.error ?? rehearsalRes.error;
    if (readError) {
      console.error("lock-world could not read what the take refers to:", readError);
      return res.status(502).json({ error: "Could not read what this take refers to: " + readError.message });
    }

    /* The Vault rows come back in whatever order Postgres likes. The take
       recorded the order the creator picked them in, and the first character
       is the one a viewer meets first, so put them back. */
    const vault = (vaultRes.data ?? []).slice()
      .sort((a, b) => refIds.indexOf(a.id) - refIds.indexOf(b.id));

    const capsule = capsuleFrom({
      generation: gen,
      spec: specRes.data?.spec ?? null,
      vault,
      observed: observedRes.data ?? null,
      rehearsal: rehearsalRes.data ?? null,
      extracted: extractedRes.data?.extracted ?? null,
    });
    const gaps = capsuleGaps(capsule);

    /*
      A world below the floor is refused, and the refusal says which of the
      three things is missing. "This take cannot be locked" would send the
      creator back to guess; naming the gap tells them it is one Vault entry
      away.
    */
    if (!gaps.usable) {
      return res.status(422).json({
        error: "There is not enough in this take to walk into yet.",
        missing: gaps.missing,
      });
    }

    /* ---- Lock it -------------------------------------------------------
       Re-locking the same take is expected: observe the footage after the
       fact and the world gets a real ending state instead of a planned one.
       So an existing world is updated in place — and deliberately NOT
       retitled, because by then the creator may have named it themselves and
       a better capsule is no reason to overwrite their name for it. */
    const { data: existing } = await supabase
      .from("world_capsules")
      .select("id")
      .eq("user_id", user.id)
      .eq("generation_id", gen.id)
      .maybeSingle();

    const derived = {
      capsule,
      usable: gaps.usable,
      gaps: [...gaps.missing, ...gaps.thin],
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase.from("world_capsules").update(derived).eq("id", existing.id);
      if (error) throw error;
      return res.status(200).json({ id: existing.id, capsule, gaps, relocked: true });
    }

    const { data: made, error: insertError } = await supabase
      .from("world_capsules")
      .insert({
        user_id: user.id,
        generation_id: gen.id,
        title: capsule.title || "Untitled world",
        ...derived,
      })
      .select("id")
      .single();

    /* Two clicks in the same second. The unique constraint catches the race,
       and the right answer is the world the first one made. */
    if (insertError?.code === "23505") {
      const { data: raced } = await supabase
        .from("world_capsules").select("id")
        .eq("user_id", user.id).eq("generation_id", gen.id).maybeSingle();
      if (raced?.id) {
        await supabase.from("world_capsules").update(derived).eq("id", raced.id);
        return res.status(200).json({ id: raced.id, capsule, gaps, relocked: true });
      }
    }
    if (insertError) throw insertError;

    /*
      The first beat: how the world came to exist. Written as a row rather
      than into the capsule so that a later re-lock cannot overwrite the
      room's memory, and so two people adding a beat at once in a shared room
      cannot lose one of them.
    */
    if (capsule.origin?.text) {
      const { error: beatError } = await supabase.from("world_beats").insert({
        capsule_id: made.id,
        author_id: user.id,
        kind: "origin",
        text: capsule.origin.text.slice(0, 1200),
      });
      // A world with no origin beat is still a world. Do not fail the lock.
      if (beatError) console.error("lock-world: could not write the origin beat:", beatError.message);
    }

    return res.status(200).json({ id: made.id, capsule, gaps, relocked: false });
  } catch (error) {
    console.error("lock-world failed:", error);
    return res.status(500).json({ error: "Something went wrong locking this world." });
  }
}
