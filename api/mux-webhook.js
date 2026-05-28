import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawBody = await getRawBody(req);

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (event.type !== "video.asset.ready") {
    return res.status(200).json({ received: true });
  }

  const asset      = event.data;
  const playbackId = asset.playback_ids?.[0]?.id;
  const assetId    = asset.id;
  const creationId = asset.passthrough;

  if (!playbackId) {
    console.error("[mux-webhook] No playback ID on asset:", assetId);
    return res.status(200).json({ received: true });
  }

  const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=1200`;
  const previewUrl   = `https://image.mux.com/${playbackId}/animated.gif?start=0&end=4&width=640`;

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let updateQuery = supabase
    .from("creations")
    .update({
      thumbnail_image: thumbnailUrl,
      preview_video:   previewUrl,
      hero_image:      thumbnailUrl,
      mux_asset_id:    assetId,
      mux_playback_id: playbackId,
    });

  if (creationId && creationId.length > 10) {
    updateQuery = updateQuery.eq("id", creationId);
  } else {
    updateQuery = updateQuery.eq("mux_asset_id", assetId);
  }

  const { data, error } = await updateQuery.select();

if (error) {
  console.error("[mux-webhook] DB update failed:", error.message);
  return res.status(500).json({ error: error.message });
}
console.log("[mux-webhook] Update result:", JSON.stringify(data));

  console.log("[mux-webhook] Updated creation:", { assetId, playbackId, creationId });
  return res.status(200).json({ received: true });
}