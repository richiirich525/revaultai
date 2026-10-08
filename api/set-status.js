import { createClient } from "@supabase/supabase-js";
import { signAsset } from "./set-asset.js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MARBLE = "https://api.worldlabs.ai/marble/v1";

// A world takes about five minutes. One still unfinished after this long
// isn't coming, and its credits go back.
const GIVE_UP_AFTER_MS = 2 * 60 * 60 * 1000;
// No set has ever cost more than this, so no refund is ever larger —
// whatever the row itself claims was spent.
const MAX_REFUND = 35;

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

const hasSplats = (assets) => {
  const u = assets?.splats?.spz_urls;
  return !!(u?.full_res || u?.["500k"] || u?.["100k"]);
};

// The browser is given links on our own domain rather than World Labs', so
// there are no cross-origin rules to satisfy and the key stays server-side.
// A world with no measurements sends no scale, and the studio then measures
// the room itself rather than trusting a made-up 1.
const forClient = (assets, setId) => assets && ({
  splatFull: assets.splats?.spz_urls?.full_res ? signAsset(setId, "full") : null,
  splat500k: assets.splats?.spz_urls?.["500k"] ? signAsset(setId, "500k") : null,
  splat100k: assets.splats?.spz_urls?.["100k"] ? signAsset(setId, "100k") : null,
  collider: assets.mesh?.collider_mesh_url ? signAsset(setId, "collider") : null,
  pano: assets.imagery?.pano_url ? signAsset(setId, "pano") : null,
  thumbnail: assets.thumbnail_url ? signAsset(setId, "thumb") : null,
  caption: assets.caption ?? "",
  scale: assets.splats?.semantics_metadata?.metric_scale_factor ?? null,
  groundOffset: assets.splats?.semantics_metadata?.ground_plane_offset ?? 0,
});

async function markReady(row, worldId, assets) {
  await supabase.from("sets")
    .update({
      status: "ready",
      world_id: worldId,
      assets: assets ?? null,
      caption: assets?.caption ? String(assets.caption).slice(0, 600) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
}

// The status is flipped first, and only a set that was still building is
// refunded — so two checks landing together can't return the credits twice.
async function failAndRefund(row, message) {
  const { data: flipped } = await supabase.from("sets")
    .update({ status: "failed", error: String(message).slice(0, 300), updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .in("status", ["queued", "processing"])
    .select("id");
  if (flipped?.length) {
    await supabase.rpc("add_credits", {
      p_user_id: row.user_id, p_amount: Math.max(0, Math.min(Number(row.credits_spent) || 0, MAX_REFUND)), p_reason: "refund", p_session_id: null,
    });
  }
}

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

    // World Labs forgets a job about an hour after it starts. If nobody looked
    // in that hour, the world itself can still be asked for directly.
    if (!r.ok) {
      if (row.world_id) {
        const assets = await worldAssets(row.world_id);
        if (hasSplats(assets)) {
          await markReady(row, row.world_id, assets);
          return res.status(200).json({ status: "ready", name: row.name, assets: forClient(assets, row.id) });
        }
      }
      const age = Date.now() - new Date(row.created_at).getTime();
      if (age > GIVE_UP_AFTER_MS) {
        await failAndRefund(row, "That set timed out before it finished");
        return res.status(200).json({ status: "failed", error: "That set timed out — your credits have been returned." });
      }
      return res.status(200).json({ status: "processing", note: "Still working." });
    }

    if (!op.done) {
      // Note which world this job is building as soon as it's known, so the
      // set can still be found after the job record itself is gone.
      const building = op?.metadata?.world_id ?? null;
      if (building && !row.world_id) {
        await supabase.from("sets").update({ world_id: building }).eq("id", row.id);
      }
      return res.status(200).json({
        status: "processing",
        note: op?.metadata?.progress?.description || "Building the set — this takes about five minutes.",
      });
    }

    if (op.error) {
      await failAndRefund(row, op.error?.message || "World Labs couldn't build that set");
      return res.status(200).json({ status: "failed", error: "That set couldn't be built — your credits have been returned." });
    }

    const worldId = op?.metadata?.world_id ?? op?.response?.id ?? row.world_id ?? null;
    const assets = op?.response?.assets ?? (worldId ? await worldAssets(worldId) : null);
    await markReady(row, worldId, assets);

    return res.status(200).json({ status: "ready", name: row.name, assets: forClient(assets, row.id) });
  } catch (err) {
    console.error("set-status failed:", err);
    return res.status(500).json({ error: "Couldn't check that set." });
  }
}
