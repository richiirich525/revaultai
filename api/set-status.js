import { createClient } from "@supabase/supabase-js";
import { signAsset } from "./set-asset.js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MARBLE = "https://api.worldlabs.ai/marble/v1";

// Marble's asset links are handed out fresh each time, so a finished set is
// re-read from World Labs rather than copied into our own storage.
async function worldAssets(worldId) {
  const r = await fetch(`${MARBLE}/worlds/${worldId}`, {
    headers: { "WLT-Api-Key": process.env.WORLDLABS_API_KEY },
  });
  const j = await r.json().catch(() => ({}));
  const world = j?.world ?? j;
  return r.ok ? world?.assets ?? null : null;
}

// The browser is given links on our own domain rather than World Labs', so
// there are no cross-origin rules to satisfy and the key stays server-side.
const forClient = (assets, setId) => assets && ({
  splatFull: assets.splats?.spz_urls?.full_res ? signAsset(setId, "full") : null,
  splat500k: assets.splats?.spz_urls?.["500k"] ? signAsset(setId, "500k") : null,
  splat100k: assets.splats?.spz_urls?.["100k"] ? signAsset(setId, "100k") : null,
  collider: assets.mesh?.collider_mesh_url ? signAsset(setId, "collider") : null,
  pano: assets.imagery?.pano_url ? signAsset(setId, "pano") : null,
  thumbnail: assets.thumbnail_url ? signAsset(setId, "thumb") : null,
  caption: assets.caption ?? "",
  scale: assets.splats?.semantics_metadata?.metric_scale_factor ?? 1,
  groundOffset: assets.splats?.semantics_metadata?.ground_plane_offset ?? 0,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { setId } = req.body || {};
    const { data: row } = await supabase.from("sets").select("*").eq("id", setId).maybeSingle();
    if (!row || row.user_id !== user.id) return res.status(403).json({ error: "Not your set" });

    // Already finished: just hand back fresh links.
    if (row.status === "ready" && row.world_id) {
      const assets = await worldAssets(row.world_id);
      return res.status(200).json({ status: "ready", name: row.name, assets: forClient(assets, row.id) });
    }
    if (row.status === "failed") return res.status(200).json({ status: "failed", error: row.error });
    if (!row.operation_id) return res.status(200).json({ status: row.status });

    const r = await fetch(`${MARBLE}/operations/${row.operation_id}`, {
      headers: { "WLT-Api-Key": process.env.WORLDLABS_API_KEY },
    });
    const op = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(200).json({ status: "processing", note: "Still working." });

    if (!op.done) {
      return res.status(200).json({
        status: "processing",
        note: op?.metadata?.progress?.description || "Building the set — this takes about five minutes.",
      });
    }

    if (op.error) {
      await supabase.rpc("add_credits", {
        p_user_id: user.id, p_amount: row.credits_spent ?? 0, p_reason: "refund", p_session_id: null,
      });
      await supabase.from("sets")
        .update({ status: "failed", error: String(op.error?.message || "World Labs couldn't build that set").slice(0, 300), updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return res.status(200).json({ status: "failed", error: "That set couldn't be built — your credits have been returned." });
    }

    const worldId = op?.metadata?.world_id ?? op?.response?.id ?? null;
    const assets = op?.response?.assets ?? (worldId ? await worldAssets(worldId) : null);
    await supabase.from("sets")
      .update({
        status: "ready",
        world_id: worldId,
        assets: assets ?? null,
        caption: assets?.caption ? String(assets.caption).slice(0, 600) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return res.status(200).json({ status: "ready", name: row.name, assets: forClient(assets, row.id) });
  } catch (err) {
    console.error("set-status failed:", err);
    return res.status(500).json({ error: "Couldn't check that set." });
  }
}