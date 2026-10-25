import { createClient } from "@supabase/supabase-js";

/*
  claim-pack — RevaultAI

  Signing up keeps the pack you already made.

  The product's hook is that a stranger takes a selfie and sees themselves
  drawn with no account at all. That pack waits in pending_packs under a
  random token. This is the route that makes "sign up to keep your pack"
  true rather than a promise on a button — it moves the pack into their
  Vault and brings every set they drew with it.

  Idempotent on purpose. The interface calls this the moment a session
  appears, which can happen more than once — a second tab, a refresh mid
  sign-in, a magic link opened twice. Claiming an already-claimed pack is a
  success, not an error, and it must not create a second copy of somebody.
*/

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { packToken } = req.body || {};
    if (typeof packToken !== "string" || !packToken) {
      return res.status(400).json({ error: "Which pack should we keep?" });
    }

    const { data: pending, error: readError } = await supabase
      .from("pending_packs")
      .select("token, pack, claimed_by")
      .eq("token", packToken)
      .maybeSingle();

    if (readError) {
      console.error("claim-pack could not read the pack:", readError);
      return res.status(502).json({ error: "Could not read that pack: " + readError.message });
    }
    /* Swept, or never existed. Both look the same and both mean the same
       thing to the person: it is gone, and the next one will be kept. */
    if (!pending) {
      return res.status(404).json({ error: "That pack is no longer waiting. Take another selfie — this one will be kept." });
    }
    if (pending.claimed_by && pending.claimed_by !== user.id) {
      return res.status(403).json({ error: "That pack belongs to somebody else." });
    }
    /* Already theirs. Say so and change nothing, rather than making a second
       copy of the same person in their Vault. */
    if (pending.claimed_by === user.id) {
      return res.status(200).json({ alreadyKept: true });
    }

    const pack = pending.pack ?? {};
    const { data: entry, error: insertError } = await supabase
      .from("vault_entries")
      .insert({
        user_id: user.id,
        kind: "character",
        name: pack.name || "You",
        description: pack.identity || "",
        build: pack.build || null,
        distinguishing: pack.distinguishing || null,
        wardrobe: pack.wardrobe || null,
        images: Array.isArray(pack.images) ? pack.images : [],
        capture: pack.capture ?? null,
        consent: pack.consent ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("claim-pack could not keep the pack:", insertError);
      return res.status(502).json({ error: "Could not keep that pack: " + insertError.message });
    }

    /*
      If this pack came out of a capture, the session has been waiting for a
      vault row to point at. Linking it now is what keeps deletion whole:
      capture_sessions.pack_id cascades, and delete-pack purges the frame
      objects by asking capture_keys_for_pack first. Unlinked, the frames
      would outlive every path that knows about them.
    */
    const captureCode = pending.pack?.capture?.code;
    if (typeof captureCode === "string" && captureCode) {
      const { error: linkError } = await supabase
        .from("capture_sessions")
        .update({ pack_id: entry.id })
        .eq("code", captureCode)
        .is("pack_id", null);
      if (linkError) {
        console.error("claim-pack kept the pack but could not link its capture:", linkError.message, entry.id);
      }
    }

    /* Marked only after the Vault entry exists. The other order loses the
       pack entirely if the insert fails: marked as claimed, nowhere to be. */
    const { error: markError } = await supabase
      .from("pending_packs")
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
      .eq("token", packToken);
    if (markError) console.error("claim-pack kept the pack but could not mark it:", markError.message);

    /* And the drawings they already made come across with it. A failure
       here is worth reporting but not worth failing the claim over — the
       pack is the thing they were promised. */
    let sets = 0;
    const { data: moved, error: setsError } = await supabase
      .rpc("claim_animated_sets", { p_token: packToken, p_user: user.id });
    if (setsError) console.error("claim-pack could not move the sets:", setsError.message);
    else sets = Number(moved) || 0;

    return res.status(200).json({ packId: entry.id, sets, alreadyKept: false });
  } catch (error) {
    console.error("claim-pack failed:", error);
    return res.status(500).json({ error: "Something went wrong keeping your pack." });
  }
}
