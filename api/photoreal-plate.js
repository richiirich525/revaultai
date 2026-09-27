import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";

/*
  photoreal-plate — RevaultAI
  Turns a rehearsal render into a photograph of the same place. A stylised
  render can't be used as a location reference: video models copy what they're
  shown, so a low-poly house makes a low-poly shot. This rebuilds the surfaces
  and leaves the geometry alone, and the result is cached against the set,
  camera and lighting so one charge covers every shot from that angle.
*/

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
fal.config({ credentials: process.env.FAL_KEY });

const COST = 2;
const MODEL = "fal-ai/nano-banana-2/edit";

const INSTRUCTION = [
  "Turn this 3D previz render into a photograph of the same place.",
  "Keep the geometry exactly: every wall, window, door, roofline, path and object stays in the same position, at the same size and the same proportions, seen from the same camera angle with the same perspective.",
  "Do not move, add or remove anything. Do not change the shape of anything.",
  "Replace only the surfaces and the light: real brick, render, plaster, wood, glass, roof tiles, fabric, foliage and paving, with natural light, soft shadows, contact shadows where objects meet the ground, and believable depth.",
  "Photographic, shot on a full-frame camera, natural colour, no illustration, no cartoon, no 3D render look.",
].join(" ");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { plate, cacheKey, projectId, note } = req.body || {};
    if (typeof cacheKey !== "string" || cacheKey.length < 8) return res.status(400).json({ error: "Missing cache key" });

    // Already made this exact view before: no charge, same picture.
    const { data: cached } = await supabase
      .from("set_plates").select("id, url").eq("user_id", user.id).eq("cache_key", cacheKey).maybeSingle();
    if (cached?.url) return res.status(200).json({ url: cached.url, cached: true });

    if (typeof plate !== "string" || !plate.startsWith("data:image/") || plate.length > 8_000_000) {
      return res.status(400).json({ error: "That render couldn't be read." });
    }

    const { data: paid, error: spendError } = await supabase.rpc("spend_credits", {
      p_user_id: user.id, p_amount: COST, p_reason: "photoreal plate",
    });
    if (spendError) throw spendError;
    if (!paid) return res.status(402).json({ error: `Not enough credits — a photoreal plate costs ${COST}.` });

    const refund = () => supabase.rpc("add_credits", {
      p_user_id: user.id, p_amount: COST, p_reason: "refund", p_session_id: null,
    });

    try {
      const bytes = Buffer.from(plate.split(",")[1] ?? "", "base64");
      const sourceUrl = await fal.storage.upload(new Blob([bytes], { type: "image/jpeg" }));

      const result = await fal.subscribe(MODEL, {
        input: {
          prompt: note ? `${INSTRUCTION} The place is: ${String(note).slice(0, 300)}` : INSTRUCTION,
          image_urls: [sourceUrl],
        },
        logs: false,
      });

      const url = result?.data?.images?.[0]?.url ?? result?.images?.[0]?.url ?? null;
      if (!url) throw new Error("no image came back");

      await supabase.from("set_plates").insert({
        user_id: user.id,
        project_id: typeof projectId === "string" ? projectId : null,
        cache_key: cacheKey,
        url,
      });

      return res.status(200).json({ url, cached: false, spent: COST });
    } catch (e) {
      await refund();
      console.error("photoreal plate failed:", e.message);
      return res.status(502).json({ error: "Couldn't make that photoreal — your credits have been returned." });
    }
  } catch (err) {
    console.error("photoreal-plate error:", err);
    return res.status(500).json({ error: "Something went wrong making that plate." });
  }
}