import { createClient } from "@supabase/supabase-js";

/*
  memory-grant — RevaultAI

  A standing pass: one person letting another cast their character in that
  other person's life films.

  THE DIRECTION IS EASY TO GET BACKWARDS. I want my sister in my films, so
  SHE grants it. I create an empty request and send her the link; she opens
  it, picks a character of her own, and that acceptance is the only moment a
  pack id is attached to the row. Nothing here looks a person up by email: a
  product that can find somebody by their email address is a product that
  leaks who is on it, so this is a link, like every other invitation here.

  WHAT A PASS IS NOT. It is not permission to publish, not a transfer of her
  character, and not permanent. She can revoke it, it expires on its own in
  fourteen days, and deleting her character deletes it outright by cascade.
  generate-video re-checks it at the moment of filming rather than trusting
  the day it was saved into, because the moment the face is used is the only
  moment consent has to be true.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { grantId, packId, revoke } = req.body || {};

    /* ---- the thin public read, for somebody opening the link ----------- */
    if (typeof grantId === "string" && grantId && !packId && !revoke) {
      const { data, error } = await supabase.rpc("memory_grant_view", { p_grant: grantId });
      if (error) {
        console.error("memory-grant could not read the request:", error);
        return res.status(502).json({ error: "Could not read that request: " + error.message });
      }
      const view = Array.isArray(data) ? data[0] : data;
      if (!view) return res.status(404).json({ error: "That request does not exist any more." });
      return res.status(200).json({
        askerName: view.asker_name,
        status: view.expired && view.status === "pending" ? "expired" : view.status,
      });
    }

    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (!user) return res.status(401).json({ error: "Sign in first." });

    /* ---- revoking: the grantor's, and only theirs ---------------------- */
    if (revoke && typeof grantId === "string" && grantId) {
      const { data: gone, error } = await supabase
        .from("memory_grants")
        .update({ status: "revoked" })
        .eq("id", grantId).eq("granted_by", user.id)
        .select("id");
      if (error) {
        console.error("memory-grant could not revoke:", error);
        return res.status(502).json({ error: "Could not withdraw that: " + error.message });
      }
      if (!gone?.length) return res.status(404).json({ error: "That is not yours to withdraw." });
      return res.status(200).json({ revoked: true });
    }

    /* ---- accepting: with a character of your own ----------------------- */
    if (typeof grantId === "string" && grantId && typeof packId === "string" && packId) {
      const { data: grant, error: readError } = await supabase
        .from("memory_grants")
        .select("id, granted_to, status, expires_at")
        .eq("id", grantId).maybeSingle();
      if (readError) {
        console.error("memory-grant could not read the request:", readError);
        return res.status(502).json({ error: "Could not read that request: " + readError.message });
      }
      if (!grant) return res.status(404).json({ error: "That request does not exist any more." });
      if (grant.status === "revoked") {
        return res.status(409).json({ error: "That request was withdrawn." });
      }
      if (new Date(grant.expires_at) < new Date()) {
        return res.status(410).json({ error: "That request has expired." });
      }
      if (grant.granted_to === user.id) {
        return res.status(409).json({ error: "That is your own request. Send the link to the person you want in your films." });
      }

      const { data: pack } = await supabase
        .from("vault_entries").select("id, name")
        .eq("id", packId).eq("user_id", user.id).eq("kind", "character").maybeSingle();
      if (!pack) return res.status(404).json({ error: "That character is not in your Vault." });

      const { error: writeError } = await supabase
        .from("memory_grants")
        .update({
          granted_by: user.id,
          pack_id: pack.id,
          status: "live",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", grantId);
      if (writeError) {
        /* The unique constraint on (granted_to, pack_id) means this person
           has already given this same character to this same person. That is
           one pass, not an error worth alarming anybody about. */
        if (writeError.code === "23505") {
          return res.status(200).json({ granted: true, already: true, name: pack.name });
        }
        console.error("memory-grant could not record the pass:", writeError);
        return res.status(502).json({ error: "Could not record that: " + writeError.message });
      }
      return res.status(200).json({ granted: true, name: pack.name });
    }

    /* ---- creating a request -------------------------------------------- */
    const { data: made, error } = await supabase
      .from("memory_grants")
      .insert({ granted_to: user.id })
      .select("id, expires_at")
      .single();
    if (error) {
      console.error("memory-grant could not open a request:", error);
      return res.status(502).json({ error: "Could not start that request: " + error.message });
    }
    return res.status(200).json({ grantId: made.id, expiresAt: made.expires_at });
  } catch (error) {
    console.error("memory-grant failed:", error);
    return res.status(500).json({ error: "Something went wrong with that request." });
  }
}
