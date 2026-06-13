import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Admin gate: verify caller is the admin user
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user || user.id !== "c9db1340-a5f3-4d53-a78a-10cac52a7755") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    });

    // Films that have a Mux asset but no stored playback ID yet
    const { data: rows, error } = await supabase
      .from("creations")
      .select("id, mux_asset_id, mux_playback_id")
      .not("mux_asset_id", "is", null)
      .is("mux_playback_id", null);
    if (error) throw error;

    const results = [];
    for (const row of rows ?? []) {
      try {
        const asset = await mux.video.assets.retrieve(row.mux_asset_id);
        const playbackId = asset.playback_ids?.[0]?.id;
        if (playbackId) {
          await supabase
            .from("creations")
            .update({ mux_playback_id: playbackId })
            .eq("id", row.id);
          results.push({ id: row.id, playbackId, ok: true });
        } else {
          results.push({ id: row.id, ok: false, reason: "no playback id on asset" });
        }
      } catch (e) {
        results.push({ id: row.id, ok: false, reason: e.message });
      }
    }

    return res.status(200).json({ processed: results.length, results });
  } catch (err) {
    console.error("backfill-playback-ids error:", err);
    return res.status(500).json({ error: err.message });
  }
}