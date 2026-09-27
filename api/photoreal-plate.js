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

const REAL = [
  "This is a full-size real place photographed on a cinema camera with a full-frame sensor.",
  "It is not a miniature, not a scale model, not a diorama, not a model railway, not claymation, not a toy, not a 3D render.",
  "Real-world proportions and real-world materials, natural daylight, soft shadows, contact shadows where objects meet the ground, depth of field consistent with a real lens, and the ordinary wear and irregularity of a real place.",
].join(" ");

const INSTRUCTIONS = {
  // Geometry untouched: safest for continuity, but keeps whatever reads as blocky.
  faithful: [
    "Turn this 3D previz render into a photograph of the same place.",
    "Keep the geometry exactly: every wall, window, door, roofline, path and object stays in the same position, at the same size and the same proportions, seen from the same camera angle with the same perspective.",
    "Do not move, add or remove anything.",
    "Replace only the surfaces and the light.",
    REAL,
  ].join(" "),
  // Same place, redrawn as real architecture: the layout survives, the blockiness doesn't.
  rebuild: [
    "This 3D previz render shows the layout of a location and the camera angle. Photograph that same location for real.",
    "Keep the camera position and lens, the ground plan, and where every object sits relative to the others and to the frame.",
    "Redraw the buildings and objects as real ones at real architectural proportions: proper window reveals with real glass and frames, real door furniture, real roof edges and gutters, real kerbs and paving joints. Thick chunky bevelled edges from the render must become real construction.",
    "Add nothing that isn't in the render and remove nothing that is.",
    REAL,
  ].join(" "),
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { plate, cacheKey, projectId, note, mode, replacements } = req.body || {};
    let instruction = INSTRUCTIONS[mode] ?? INSTRUCTIONS.rebuild;

    // Objects the creator has described themselves. The render's stand-in is a
    // placeholder: build the described thing in that same spot, same size, same
    // angle, so it lands where they put it rather than where the words imply.
    const asked = (Array.isArray(replacements) ? replacements : [])
      .filter((r) => r && typeof r.asked === "string" && r.asked.trim())
      .slice(0, 6)
      .map((r) => `${r.where ? r.where + ": " : ""}replace ${r.label || "the object"} with ${r.asked.trim()}`);
    if (asked.length) {
      instruction += ` Some objects in the render are placeholders and must be replaced, keeping the same position, footprint, orientation and scale in the frame: ${asked.join("; ")}. The replacement is a real full-size object photographed in place, sitting on the ground with proper contact shadows.`;
    }
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
          prompt: note ? `${instruction} The place is: ${String(note).slice(0, 300)}` : instruction,
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