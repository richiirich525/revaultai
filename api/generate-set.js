import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Passing a photo on to World Labs and starting the job takes a few seconds
// longer than a plain request, so this function is given more time.
export const config = { maxDuration: 30 };

// What a set costs, server-side. Marble charges us about $1.26 for a full
// world; this is the price we charge for it. Keep COST in
// src/GeneratedSets.jsx in step with CREDITS.
const MODEL = "marble-1.1";
const CREDITS = 35;

const MARBLE = "https://api.worldlabs.ai/marble/v1";
// Vercel refuses request bodies over 4.5 MB, and a photo grows by a third
// when it's sent as text — so the photo itself is capped well under that.
const MAX_PHOTO_BYTES = 2_500_000;

const marbleHeaders = () => ({
  "WLT-Api-Key": process.env.WORLDLABS_API_KEY,
  "Content-Type": "application/json",
});

// The browser sends the photo already shrunk, as a JPEG data URL. It is
// checked here, passed straight to World Labs, and never stored by us or
// given a public address.
function readPhoto(imageData) {
  if (!imageData) return null;
  const unreadable = "That photo couldn't be read — try a JPEG or PNG.";
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(imageData));
  if (!m) throw new Error(unreadable);
  const bytes = Buffer.from(m[1], "base64");
  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isJpeg) throw new Error(unreadable);
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error("That photo is too large — try a smaller one.");
  return bytes;
}

// Ask World Labs for an upload slot, send the photo there, and return the id
// the world is then generated from.
async function uploadPhoto(bytes) {
  const prep = await fetch(`${MARBLE}/media-assets:prepare_upload`, {
    method: "POST",
    headers: marbleHeaders(),
    body: JSON.stringify({ file_name: "room.jpg", kind: "image", extension: "jpg" }),
  });
  const p = await prep.json().catch(() => ({}));
  const assetId = p?.media_asset?.id;
  const info = p?.upload_info;
  if (!prep.ok || !assetId || !info?.upload_url) {
    console.error("marble prepare_upload failed:", prep.status, JSON.stringify(p).slice(0, 400));
    throw new Error("World Labs wouldn't accept the photo");
  }

  const put = await fetch(info.upload_url, {
    method: info.upload_method || "PUT",
    headers: info.required_headers || {},
    body: bytes,
  });
  if (!put.ok) {
    const why = await put.text().catch(() => "");
    console.error("marble photo upload failed:", put.status, why.slice(0, 300));
    throw new Error("The photo didn't upload");
  }
  return assetId;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (!process.env.WORLDLABS_API_KEY) return res.status(503).json({ error: "Set generation isn't switched on yet." });

    const { name, prompt, projectId, imageData } = req.body || {};
    const text = String(prompt || "").trim();

    let photo = null;
    try {
      photo = readPhoto(imageData);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // With a photo the description is optional; without one it's required.
    if (text.length > 1000 || (!photo && text.length < 10)) {
      return res.status(400).json({ error: "Describe the set in a sentence or two (10–1000 characters), or add a photo." });
    }

    // Charge first, refund if anything below fails — the same pattern as generating.
    const { data: paid, error: spendError } = await supabase.rpc("spend_credits", {
      p_user_id: user.id,
      p_amount: CREDITS,
      p_reason: "set generation",
    });
    if (spendError) throw spendError;
    if (!paid) return res.status(402).json({ error: "Not enough credits" });

    const refund = async () => {
      await supabase.rpc("add_credits", {
        p_user_id: user.id, p_amount: CREDITS, p_reason: "refund", p_session_id: null,
      });
    };

    const title = (String(name || text).trim() || "Photo set").slice(0, 64);
    let row;
    try {
      const insert = await supabase
        .from("sets")
        .insert({
          user_id: user.id,
          project_id: typeof projectId === "string" ? projectId : null,
          name: title,
          prompt: text || "(from a photo)",
          tier: "full",
          model: MODEL,
          status: "queued",
          credits_spent: CREDITS,
        })
        .select()
        .single();
      if (insert.error) throw insert.error;
      row = insert.data;
    } catch (e) {
      await refund();
      throw e;
    }

    try {
      const world_prompt = photo
        ? {
            type: "image",
            image_prompt: { source: "media_asset", media_asset_id: await uploadPhoto(photo) },
            ...(text ? { text_prompt: text } : {}),
          }
        : { type: "text", text_prompt: text };

      const r = await fetch(`${MARBLE}/worlds:generate`, {
        method: "POST",
        headers: marbleHeaders(),
        body: JSON.stringify({ display_name: title, model: MODEL, world_prompt }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.operation_id) {
        console.error("marble generate failed:", r.status, JSON.stringify(j).slice(0, 400));
        throw new Error(j?.detail?.message || j?.message || "World Labs refused the job");
      }
      await supabase
        .from("sets")
        .update({ operation_id: j.operation_id, status: "processing", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return res.status(200).json({ setId: row.id, credits: CREDITS });
    } catch (e) {
      await refund();
      await supabase
        .from("sets")
        .update({ status: "failed", error: String(e.message).slice(0, 300), updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return res.status(502).json({ error: "Couldn't start the set — your credits have been returned." });
    }
  } catch (err) {
    console.error("generate-set failed:", err);
    return res.status(500).json({ error: "Something went wrong starting that set." });
  }
}
