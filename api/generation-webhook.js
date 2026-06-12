import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 credentials.");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { request_id, status, payload, error } = req.body || {};
    if (!request_id) {
      return res.status(400).json({ error: "Missing request_id" });
    }

    // Find the matching generation
    const { data: gen } = await supabase
      .from("generations")
      .select("*")
      .eq("fal_request_id", request_id)
      .single();

    if (!gen) {
      // Unknown job — acknowledge so fal doesn't retry forever
      return res.status(200).json({ ignored: true });
    }
    if (gen.status === "complete" || gen.status === "failed") {
      // Already handled (fal can retry deliveries) — don't double-process
      return res.status(200).json({ already_handled: true });
    }

    // ---- Failure path: refund and record the error ----
    if (status !== "OK") {
      await supabase.rpc("add_credits", {
        p_user_id: gen.user_id,
        p_amount: gen.credits_spent,
        p_reason: "refund",
        p_session_id: null,
      });
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: typeof error === "string" ? error : "Generation failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", gen.id);
      return res.status(200).json({ refunded: true });
    }

    // ---- Success path: pull the video from fal, push to R2 ----
    const falVideoUrl = payload?.video?.url;
    if (!falVideoUrl) {
      throw new Error("No video URL in fal payload");
    }

    const videoRes = await fetch(falVideoUrl);
    if (!videoRes.ok) {
      throw new Error("Could not download video from fal: " + videoRes.status);
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    const key = `generations/${gen.user_id}/${gen.id}.mp4`;

    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: videoBuffer,
        ContentType: "video/mp4",
      })
    );

    await supabase
      .from("generations")
      .update({
        status: "complete",
        video_url: `${publicUrl}/${key}`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", gen.id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("generation-webhook error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}