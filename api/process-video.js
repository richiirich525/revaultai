import { createClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";

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

    const asset = await video.assets.create({
      input: [{ url: videoPublicUrl }],
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