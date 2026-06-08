import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import Mux from "@mux/mux-node";

// A signed-in user can delete their OWN account. This tears down their
// creations (Mux + R2 + rows), their purchases, their follow relationships,
// their profile, and finally their auth login. It refuses if they have any
// premium creation with sales (same buyer-protection rule as delete-creation).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Auth: caller must be signed in; they can only delete themselves ---
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

  const userId = user.id;

  // --- Service-role client for the privileged work ---
  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- Load this user's creations (with the storage refs we'll need to purge) ---
  const { data: creations, error: fetchError } = await admin
    .from("creations")
    .select("id, is_premium, mux_asset_id, video_url, preview_video, hero_image, thumbnail_image")
    .eq("user_id", userId);

  if (fetchError) {
    return res.status(500).json({ error: "Could not load your creations." });
  }

  // --- Guard: refuse if any premium creation has sales (protects buyers) ---
  const premiumIds = (creations ?? []).filter((c) => c.is_premium).map((c) => c.id);
  if (premiumIds.length > 0) {
    const { count, error: salesError } = await admin
      .from("purchases")
      .select("creation_id", { count: "exact", head: true })
      .in("creation_id", premiumIds);

    if (salesError) {
      return res.status(500).json({ error: "Could not verify sales before deleting." });
    }
    if ((count ?? 0) > 0) {
      return res.status(409).json({
        error: "You have premium work that's been purchased, so your account can't be deleted automatically. Please reach out and we'll help.",
        reason: "has_sales",
      });
    }
  }

  // --- Delete the database rows first (source of truth for the UI) ---
  // Your creations (none have purchases at this point, per the guard above).
  if ((creations ?? []).length > 0) {
    const { error: delCreations } = await admin.from("creations").delete().eq("user_id", userId);
    if (delCreations) {
      return res.status(500).json({ error: "Could not delete your creations." });
    }
  }

  // Purchases you made as a buyer.
  const { error: delPurchases } = await admin.from("purchases").delete().eq("user_id", userId);
  if (delPurchases) {
    return res.status(500).json({ error: "Could not delete your purchase history." });
  }

  // Follow relationships, in both directions.
  const { error: delFollowing } = await admin.from("follows").delete().eq("follower_user_id", userId);
  if (delFollowing) {
    return res.status(500).json({ error: "Could not delete your follows." });
  }
  const { error: delFollowers } = await admin.from("follows").delete().eq("creator_user_id", userId);
  if (delFollowers) {
    return res.status(500).json({ error: "Could not delete your followers." });
  }

  // Your profile row.
  const { error: delProfile } = await admin.from("profiles").delete().eq("id", userId);
  if (delProfile) {
    return res.status(500).json({ error: "Could not delete your profile." });
  }

  // --- Best-effort storage cleanup per creation (rows are already gone) ---
  const cleanup = { mux: [], r2: [] };

  const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
  });

  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const bucket = process.env.R2_BUCKET_NAME;
  const r2Ready =
    publicUrl &&
    bucket &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY;

  const r2 = r2Ready
    ? new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
        requestChecksumCalculation: "when_required",
        responseChecksumValidation: "when_required",
      })
    : null;

  for (const creation of creations ?? []) {
    if (creation.mux_asset_id) {
      try {
        await mux.video.assets.delete(creation.mux_asset_id);
        cleanup.mux.push({ asset: creation.mux_asset_id, status: "deleted" });
      } catch (err) {
        console.error("[delete-account] Mux delete failed:", err.message);
        cleanup.mux.push({ asset: creation.mux_asset_id, status: "failed: " + err.message });
      }
    }

    if (r2) {
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
          console.error("[delete-account] R2 delete failed for", key, err.message);
          cleanup.r2.push({ key, status: "failed: " + err.message });
        }
      }
    }
  }

  // --- Finally, delete the auth login (do this last) ---
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    console.error("[delete-account] Auth user delete failed:", authDeleteError.message);
    return res.status(500).json({
      error: "Your content was removed, but the login couldn't be fully deleted. Please reach out so we can finish.",
      cleanup,
    });
  }

  return res.status(200).json({ success: true, cleanup });
}