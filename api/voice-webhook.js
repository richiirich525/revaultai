import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { falErrorText } from "./generate-video.js";
import { verifyFalSignature, getR2Client } from "./generation-webhook.js";

/*
  voice-webhook — RevaultAI

  Completion for a scene read. The same shape as generation-webhook, and it
  shares that route's Ed25519 signature verification and R2 client rather than
  keeping a second copy — a second copy of signature verification is the one
  most likely to drift out of correctness unnoticed.

  Separate from the video webhook because the tables are separate and the
  video one is on the money path for every generation; a bug introduced here
  should not be able to reach it.
*/

// Vercel must NOT pre-parse the body — signature verification needs raw bytes
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    if (!(await verifyFalSignature(req, rawBody))) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawBody.toString("utf-8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const { request_id, status, payload, error } = parsed || {};
    if (!request_id) return res.status(400).json({ error: "Missing request_id" });

    const { data: take } = await supabase
      .from("voice_takes")
      .select("*")
      .eq("fal_request_id", request_id)
      .single();

    // Not ours — acknowledge so fal stops retrying.
    if (!take) return res.status(200).json({ ignored: true });
    // fal can deliver the same webhook more than once. Paying or refunding
    // twice for one read is the thing this guard exists to prevent.
    if (take.status === "complete" || take.status === "failed") {
      return res.status(200).json({ already_handled: true });
    }

    if (status !== "OK") {
      await supabase.rpc("add_credits", {
        p_user_id: take.user_id,
        p_amount: take.credits_spent,
        p_reason: "refund",
        p_session_id: null,
      });
      await supabase
        .from("voice_takes")
        .update({
          status: "failed",
          // fal sends a structured error here, so a string-only check would
          // throw the reason away — see the note in generate-video.js.
          error_message: falErrorText(error) || falErrorText(payload) || "The read failed.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", take.id);
      return res.status(200).json({ refunded: true });
    }

    const falAudioUrl = payload?.audio?.url;
    if (!falAudioUrl) throw new Error("No audio URL in the fal payload");

    const audioRes = await fetch(falAudioUrl);
    if (!audioRes.ok) throw new Error("Could not download audio from fal: " + audioRes.status);
    const buffer = Buffer.from(await audioRes.arrayBuffer());

    const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
    const ext = contentType.includes("wav") ? "wav" : "mp3";
    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    const key = `voice/${take.user_id}/${take.id}.${ext}`;

    await getR2Client().send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }),
    );

    const duration = Number(payload?.duration);
    await supabase
      .from("voice_takes")
      .update({
        status: "complete",
        // Stored in this app's usual form: a key carrier, not a fetchable
        // link. Reads derive the key from it and presign.
        audio_url: `${publicUrl}/${key}`,
        duration_seconds: Number.isFinite(duration) ? duration : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", take.id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("voice-webhook error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
