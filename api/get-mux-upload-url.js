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

  const muxTokenId     = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!muxTokenId || !muxTokenSecret) {
    return res.status(500).json({ error: "Video processing not configured." });
  }

  try {
    const mux    = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        mp4_support:     "standard",
      },
      cors_origin: req.headers.origin || "https://revaultai.com",
      timeout:     3600,
    });

    return res.status(200).json({
      uploadUrl:     upload.url,
      mux_upload_id: upload.id,
    });
  } catch (err) {
    console.error("[get-mux-upload-url]", err.message);
    return res.status(500).json({ error: "Could not create upload URL: " + err.message });
  }
}
