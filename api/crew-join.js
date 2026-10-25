import { createClient } from "@supabase/supabase-js";

/*
  crew-join — RevaultAI

  A guest takes the last seat in somebody's scene.

  The guest arrives with a pack they built themselves, from their own selfie,
  seconds ago. That is the consent: joining this invite is agreeing to appear
  in THIS scene, and nothing else. It does not make their pack duetable, it
  does not add them to the host's Vault, and it does not carry over to the
  host's next invite.

  Joining does not shoot the scene. It reports that the seats are full and
  leaves the shooting to the host, who is the one paying for it. A guest who
  could trigger a generation on somebody else's credits is a guest who could
  empty their balance.
*/

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { inviteId, packId, packToken, displayName } = req.body || {};
    if (typeof inviteId !== "string" || !inviteId) {
      return res.status(400).json({ error: "Which scene are you joining?" });
    }

    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };

    const { data: invite, error: inviteError } = await supabase
      .from("crew_invites")
      .select("id, host_id, host_pack, seats, status, expires_at")
      .eq("id", inviteId)
      .maybeSingle();
    if (inviteError) {
      console.error("crew-join could not read the invite:", inviteError);
      return res.status(502).json({ error: "Could not read that invite: " + inviteError.message });
    }
    if (!invite) return res.status(404).json({ error: "That invite does not exist any more." });
    if (invite.status !== "open") {
      return res.status(409).json({ error: invite.status === "shot" ? "That scene has already been shot." : "That scene is not taking anybody else." });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: "That invite has expired." });
    }

    /* ---- the guest's own pack, and only their own ----------------------- */
    let member = null;
    if (user && typeof packId === "string" && packId) {
      const { data: pack } = await supabase
        .from("vault_entries").select("id, name")
        .eq("id", packId).eq("user_id", user.id).eq("kind", "character").maybeSingle();
      if (!pack) return res.status(404).json({ error: "That character is not in your Vault." });
      member = { pack_id: pack.id, pending_token: null, user_id: user.id, display_name: pack.name };
    } else if (typeof packToken === "string" && packToken) {
      const { data: pending } = await supabase
        .from("pending_packs").select("token, pack, claimed_by, expires_at").eq("token", packToken).maybeSingle();
      if (!pending) return res.status(404).json({ error: "That pack has expired. Take another selfie." });
      if (pending.claimed_by && pending.claimed_by !== user?.id) {
        return res.status(403).json({ error: "That pack belongs to somebody else." });
      }
      if (!pending.pack?.images?.length) {
        return res.status(422).json({ error: "That pack has no photo, so you cannot be kept consistent in the scene." });
      }
      member = {
        pack_id: null, pending_token: packToken, user_id: user?.id ?? null,
        display_name: String(displayName ?? pending.pack?.name ?? "").slice(0, 60) || "Guest",
      };
    } else {
      return res.status(400).json({ error: "Take a selfie first so you can be in the scene." });
    }

    /* The host is already in seat one. A host joining their own invite as a
       guest would take a seat from the person they asked. */
    if (member.pack_id && member.pack_id === invite.host_pack) {
      return res.status(409).json({ error: "You are already in this scene." });
    }

    const { error: joinError } = await supabase.from("crew_members").insert({ invite_id: inviteId, ...member });
    if (joinError) {
      /* The unique index did its job: a double tap, or a second tab. Saying
         "you are in" is the truthful answer and the kind one. */
      if (joinError.code === "23505") {
        const { data: already } = await supabase
          .from("crew_members").select("id", { count: "exact", head: true }).eq("invite_id", inviteId);
        return res.status(200).json({ joined: true, already: true, taken: (already?.length ?? 0) + 1, seats: invite.seats });
      }
      console.error("crew-join could not add the member:", joinError);
      return res.status(502).json({ error: "Could not add you to that scene: " + joinError.message });
    }

    const { count } = await supabase
      .from("crew_members").select("id", { count: "exact", head: true }).eq("invite_id", inviteId);
    const taken = (count ?? 0) + 1;

    /* Full. Marked here so a late arrival is turned away rather than added
       to a scene that is already being shot. */
    let ready = false;
    if (taken >= invite.seats) {
      const { error: markError } = await supabase
        .from("crew_invites").update({ status: "full" }).eq("id", inviteId).eq("status", "open");
      if (markError) console.error("crew-join could not mark the invite full:", markError.message);
      ready = true;
    }

    return res.status(200).json({ joined: true, taken, seats: invite.seats, ready });
  } catch (error) {
    console.error("crew-join failed:", error);
    return res.status(500).json({ error: "Something went wrong joining that scene." });
  }
}
