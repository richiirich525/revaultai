import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

/*
  delete-pack — RevaultAI

  Removes a character pack, everything drawn from it, and every image of that
  person this product is holding.

  THIS IS NOT A ROW DELETE. A pack is a photograph of somebody's face and a
  set of drawings derived from it, and those live in object storage. Deleting
  the rows and leaving the files is not deletion, it is hiding — and it is
  the version that gets a company in trouble, because the files are still
  served to anybody with the URL.

  So the order is: find every file, purge the files, then drop the rows. If a
  file fails to purge it is reported rather than swallowed, and the rows stay,
  because a row is the only remaining record of a file that needs removing.
  A half-done deletion that still knows what it has is recoverable; one that
  has forgotten is not.

  Built in week one on purpose. Retrofitting deletion is how companies end up
  unable to comply with a request they are obliged to honor.
*/

/* Only ever purge things that live on our own public host. A URL pointing
   anywhere else is not ours to delete, and trying is how an unrelated
   bucket loses an object. */
function keyFromUrl(url) {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!base || typeof url !== "string" || !url.startsWith(base + "/")) return null;
  const key = decodeURIComponent(url.slice(base.length + 1).split("?")[0]);
  return key || null;
}

export function keysForPack({ packImages = [], sets = [] } = {}) {
  const keys = new Set();
  for (const u of packImages) {
    const k = keyFromUrl(u);
    if (k) keys.add(k);
  }
  for (const set of sets) {
    for (const still of Array.isArray(set?.stills) ? set.stills : []) {
      const k = keyFromUrl(still?.url);
      if (k) keys.add(k);
    }
  }
  return [...keys];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { packId, packToken } = req.body || {};
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };

    let packImages = [];
    let sets = [];
    let mode = null;

    if (user && typeof packId === "string" && packId) {
      const { data: pack, error } = await supabase
        .from("vault_entries").select("id, images")
        .eq("id", packId).eq("user_id", user.id).eq("kind", "character").maybeSingle();
      if (error) {
        console.error("delete-pack could not read the pack:", error);
        return res.status(502).json({ error: "Could not read that pack: " + error.message });
      }
      if (!pack) return res.status(404).json({ error: "That pack is not in your Vault." });
      packImages = Array.isArray(pack.images) ? pack.images : [];
      const { data: rows } = await supabase
        .from("animated_sets").select("id, stills").eq("pack_id", packId).eq("user_id", user.id);
      sets = rows ?? [];
      mode = "vault";
    } else if (typeof packToken === "string" && packToken) {
      /* An anonymous pack. The token is the credential, exactly as it is for
         drawing one — somebody who made a pack without an account must be
         able to remove it without making one either. */
      const { data: pending, error } = await supabase
        .from("pending_packs").select("token, pack, claimed_by").eq("token", packToken).maybeSingle();
      if (error) {
        console.error("delete-pack could not read the pending pack:", error);
        return res.status(502).json({ error: "Could not read that pack: " + error.message });
      }
      if (!pending) return res.status(404).json({ error: "That pack is already gone." });
      if (pending.claimed_by && pending.claimed_by !== user?.id) {
        return res.status(403).json({ error: "That pack belongs to somebody else." });
      }
      packImages = Array.isArray(pending.pack?.images) ? pending.pack.images : [];
      const { data: rows } = await supabase
        .from("animated_sets").select("id, stills").eq("pending_token", packToken);
      sets = rows ?? [];
      mode = "pending";
    } else {
      return res.status(400).json({ error: "Which pack should we delete?" });
    }

    /* ---- the files first ------------------------------------------------ */
    const keys = keysForPack({ packImages, sets });
    const stuck = [];

    const ready = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID
      && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME;
    if (keys.length && !ready) {
      /* Refusing is the honest answer. Dropping the rows here would leave
         every image served from a URL nobody can find any more. */
      console.error("delete-pack: object storage is not configured, refusing to drop rows");
      return res.status(503).json({ error: "We cannot complete that deletion right now. Nothing was removed." });
    }

    if (keys.length) {
      const r2 = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });
      for (const key of keys) {
        try {
          await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
        } catch (err) {
          console.error("delete-pack: could not purge", key, err.message);
          stuck.push(key);
        }
      }
    }

    if (stuck.length) {
      /* The rows stay. They are the only remaining record of which files
         still need removing, and a deletion that has forgotten what it was
         holding cannot be finished by anybody. */
      return res.status(502).json({
        error: `We removed ${keys.length - stuck.length} of ${keys.length} images and could not remove the rest. Nothing has been dropped, so this can be retried.`,
        remaining: stuck.length,
      });
    }

    /* ---- then the rows --------------------------------------------------- */
    if (sets.length) {
      const { error } = await supabase.from("animated_sets").delete().in("id", sets.map((s) => s.id));
      if (error) {
        console.error("delete-pack could not drop the sets:", error);
        return res.status(502).json({ error: "The images are gone but the records are not: " + error.message });
      }
    }

    if (mode === "vault") {
      const { error } = await supabase.from("vault_entries").delete().eq("id", packId).eq("user_id", user.id);
      if (error) {
        console.error("delete-pack could not drop the pack:", error);
        return res.status(502).json({ error: "The images are gone but the pack record is not: " + error.message });
      }
    } else {
      const { error } = await supabase.from("pending_packs").delete().eq("token", packToken);
      if (error) {
        console.error("delete-pack could not drop the pending pack:", error);
        return res.status(502).json({ error: "The images are gone but the pack record is not: " + error.message });
      }
    }

    return res.status(200).json({ deleted: true, images: keys.length, sets: sets.length });
  } catch (error) {
    console.error("delete-pack failed:", error);
    return res.status(500).json({ error: "Something went wrong deleting that pack." });
  }
}
