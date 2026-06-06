import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import Mux from "@mux/mux-node";

// Admins can delete any creation. Everyone is still blocked from deleting
// a premium creation that has sales (see the guard below).
const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Auth: caller must be a signed-in user ---
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { creationId } = req.body ?? {};
  if (!creationId) {
    return res.status(400).json({ error: "Missing creationId" });
  }

  // --- Service-role client for the privileged work ---
  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- Load the creation (and the storage refs we'll need to purge) ---
  const { data: creation, error: fetchError } = await admin
    .from("creations")
    .select("id, user_id, is_premium, mux_asset_id, video_url, preview_video, hero_image, thumbnail_image")
    .eq("id", creationId)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ error: "Could not load creation." });
  }
  if (!creation) {
    return res.status(404).json({ error: "Creation not found." });
  }

  // --- Ownership: must own it, or be an admin ---
  const isOwner = creation.user_id === user.id;
  const isAdmin = ADMIN_EMAILS.includes((user.email ?? "").toLowerCase());
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "You can only delete your own creations." });
  }

  // --- Guard: a premium creation that has sales can't be deleted (anyone) ---
  if (creation.is_premium) {
    const { count, error: salesError } = await admin
      .from("purchases")
      .select("creation_id", { count: "exact", head: true })
      .eq("creation_id", creationId);

    if (salesError) {
      return res.status(500).json({ error: "Could not verify sales before deleting." });
    }
    if ((count ?? 0) > 0) {
      return res.status(409).json({
        error: "This premium creation has sales, so it can't be deleted.",
        reason: "has_sales",
      });
    }
  }

  // --- Delete the database row first (the source of truth for the UI) ---
  const { error: deleteError } = await admin
    .from("creations")
    .delete()
    .eq("id", creationId);

  if (deleteError) {
    return res.status(500).json({ error: "Could not delete creation." });
  }

  // --- Best-effort storage cleanup. The row is already gone, so we never
  //     fail the request on these — we just log anything that doesn't purge. ---
  const cleanup = { mux: null, r2: [] };

  // Mux asset
  if (creation.mux_asset_id) {
    try {
      const mux = new Mux({
        tokenId: process.env.MUX_TOKEN_ID,
        tokenSecret: process.env.MUX_TOKEN_SECRET,
      });
      await mux.video.assets.delete(creation.mux_asset_id);
      cleanup.mux = "deleted";
    } catch (err) {
      console.error("[delete-creation] Mux delete failed:", err.message);
      cleanup.mux = "failed: " + err.message;
    }
  }

  // R2 files — only purge URLs that actually live on our R2 public host
  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const bucket = process.env.R2_BUCKET_NAME;
  const r2Ready =
    publicUrl &&
    bucket &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY;

  if (r2Ready) {
    const r2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      requestChecksumCalculation: "when_required",
      responseChecksumValidation: "when_required",
    });

    const keys = new Set();
    for (const u of [creation.video_url, creation.preview_video, creation.hero_image, creation.thumbnail_image]) {
      if (typeof u === "string" && u.startsWith(publicUrl + "/")) {
        const key = decodeURIComponent(u.slice(publicUrl.length + 1));
        if (key) keys.add(key);
      }
    }

    for (const key of keys) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        cleanup.r2.push({ key, status: "deleted" });
      } catch (err) {
        console.error("[delete-creation] R2 delete failed for", key, err.message);
        cleanup.r2.push({ key, status: "failed: " + err.message });
      }
    }
  }

  return res.status(200).json({ success: true, cleanup });
}