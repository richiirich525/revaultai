import { createClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Mux pulls the source file itself, so once the bucket is private
// it needs a signed URL. 1 hour covers ingest queuing.
async function signR2Url(storedUrl) {
  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!storedUrl.startsWith(publicUrl + "/")) return storedUrl; // not ours — pass through
  const key = decodeURIComponent(storedUrl.slice(publicUrl.length + 1));
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }),
    { expiresIn: 3600 }
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized." });

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: invalid or expired session." });
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized: could not verify session." });
  }

  const { videoPublicUrl, creationId } = req.body;
  if (!videoPublicUrl) {
    return res.status(400).json({ error: "videoPublicUrl is required." });
  }

  const muxTokenId     = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!muxTokenId || !muxTokenSecret) {
    return res.status(200).json({
      video_url:       videoPublicUrl,
      preview_video:   videoPublicUrl,
      thumbnail_image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90",
      mux_enabled:     false,
    });
  }

  try {
    const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });
    const { video } = mux;

    const ingestUrl = await signR2Url(videoPublicUrl);
    const asset = await video.assets.create({
      input: [{ url: ingestUrl }],
      playback_policy: ["public"],
      passthrough: creationId ?? "",
    });

    return res.status(200).json({
      success:         true,
      video_url:       videoPublicUrl,
      preview_video:   videoPublicUrl,
      thumbnail_image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90",
      mux_asset_id:    asset.id,
      mux_enabled:     true,
      processing:      true,
    });
  } catch (err) {
    console.error("[process-video] Mux error:", err.message);
    return res.status(200).json({
      success:         true,
      video_url:       videoPublicUrl,
      preview_video:   videoPublicUrl,
      thumbnail_image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90",
      mux_error:       err.message,
    });
  }
}