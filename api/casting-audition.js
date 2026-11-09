import { createClient } from "@supabase/supabase-js";

/*
  casting-audition — RevaultAI

  Somebody puts themselves up for a role.

  Transposed from crew-join, and the important part is what it does NOT do.
  Joining a crew invite is agreeing to appear in a scene you can see on the
  page in front of you. Auditioning is not: the owner decides the scene
  afterwards, and nobody can consent in advance to a film that has not been
  described. So an audition is a candidacy and nothing more. It shoots
  nothing, charges nothing, and gives the owner no claim on the face.

  When the owner picks somebody, casting-cast creates an ordinary crew
  invite addressed to them, with the scene written on it, and THAT is the
  consent that puts a person in a film. Two consents, and the second one is
  specific.

  The auditioner arrives with a pack they built themselves from their own
  selfie, seconds ago, through build-pack and its three gates. Nobody is
  ever cast from a photo somebody else uploaded of them.
*/

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { callId, packId, packToken, displayName } = req.body || {};
    if (typeof callId !== "string" || !callId) {
      return res.status(400).json({ error: "Which role are you auditioning for?" });
    }

    const authToken = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = authToken
      ? await supabase.auth.getUser(authToken)
      : { data: { user: null } };

    const { data: call, error: callError } = await supabase
      .from("casting_calls")
      .select("id, owner_id, status, expires_at, max_auditions")
      .eq("id", callId)
      .maybeSingle();
    if (callError) {
      console.error("casting-audition could not read the call:", callError);
      return res.status(502).json({ error: "Could not read that call: " + callError.message });
    }
    if (!call) return res.status(404).json({ error: "That casting call does not exist any more." });
    if (call.status !== "open") {
      return res.status(409).json({
        error: call.status === "cast" ? "That role has already been cast." : "That call is closed.",
      });
    }
    if (new Date(call.expires_at) < new Date()) {
      return res.status(410).json({ error: "That casting call has closed." });
    }

    /* The cap is a cost guard, not a security boundary: every audition
       spends a vision call in build-pack before it reaches this route, and
       a link can be opened from any number of addresses, so the per-IP cap
       there does not bound one call. Two submissions arriving together can
       land one over the line; a cost guard can afford that, and tightening
       it would mean a lock on a table a stranger is waiting on. */
    const { count } = await supabase
      .from("casting_auditions").select("id", { count: "exact", head: true }).eq("call_id", callId);
    if ((count ?? 0) >= call.max_auditions) {
      return res.status(409).json({ error: "This role has had all the auditions it can take." });
    }

    /* ---- the auditioner's own pack, and only their own ------------------ */
    let entry = null;
    if (user && typeof packId === "string" && packId) {
      const { data: pack } = await supabase
        .from("vault_entries").select("id, name")
        .eq("id", packId).eq("user_id", user.id).eq("kind", "character").maybeSingle();
      if (!pack) return res.status(404).json({ error: "That character is not in your Vault." });
      entry = { pack_id: pack.id, pending_token: null, user_id: user.id, display_name: pack.name };
    } else if (typeof packToken === "string" && packToken) {
      const { data: pending } = await supabase
        .from("pending_packs").select("token, pack, claimed_by").eq("token", packToken).maybeSingle();
      if (!pending) return res.status(404).json({ error: "That pack has expired. Take another selfie." });
      if (pending.claimed_by && pending.claimed_by !== user?.id) {
        return res.status(403).json({ error: "That pack belongs to somebody else." });
      }
      if (!pending.pack?.images?.length) {
        return res.status(422).json({ error: "That pack has no photo, so you could not be kept consistent in a scene." });
      }
      entry = {
        pack_id: null, pending_token: packToken, user_id: user?.id ?? null,
        display_name: String(displayName ?? pending.pack?.name ?? "").slice(0, 60) || "Auditioner",
      };
    } else {
      return res.status(400).json({ error: "Take a selfie first so you can audition." });
    }

    /* Casting yourself in your own call is not an audition. */
    if (user && user.id === call.owner_id) {
      return res.status(409).json({ error: "This is your own casting call." });
    }

    const { error: insertError } = await supabase
      .from("casting_auditions").insert({ call_id: callId, ...entry });
    if (insertError) {
      /* The unique index did its job: a double tap, or a second tab. Saying
         "you are in" is the truthful answer and the kind one. */
      if (insertError.code === "23505") {
        return res.status(200).json({ submitted: true, already: true });
      }
      console.error("casting-audition could not record the audition:", insertError);
      return res.status(502).json({ error: "Could not put you up for that role: " + insertError.message });
    }

    return res.status(200).json({ submitted: true, already: false });
  } catch (error) {
    console.error("casting-audition failed:", error);
    return res.status(500).json({ error: "Something went wrong with that audition." });
  }
}
