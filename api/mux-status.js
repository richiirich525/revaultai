import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";

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
      return res.status(401).json({ error: "Unauthorized." });
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const { mux_asset_id } = req.body;
  if (!mux_asset_id) return res.status(400).json({ error: "mux_asset_id is required." });

  const muxTokenId     = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!muxTokenId || !muxTokenSecret) {
    return res.status(200).json({ ready: false });
  }

  try {
    const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });
    const asset = await mux.video.assets.retrieve(mux_asset_id);

    if (asset.status !== "ready") {
      return res.status(200).json({ ready: false, status: asset.status });
    }

    const playbackId = asset.playback_ids?.[0]?.id;
    if (!playbackId) return res.status(200).json({ ready: false });

    return res.status(200).json({
      ready:           true,
      thumbnail_image: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=1200`,
      preview_video:   `https://image.mux.com/${playbackId}/animated.gif?start=0&end=4&width=640`,
      mux_playback_id: playbackId,
    });
  } catch (err) {
    console.error("[mux-status]", err.message);
    return res.status(200).json({ ready: false });
  }
}
