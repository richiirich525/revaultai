import crypto from "crypto";
import { fal } from "@fal-ai/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// Image generation is synchronous and can take ~10-30s on slower models.
export const config = { maxDuration: 60 };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// VERIFY both falId values in the fal playground before deploying.
const IMAGE_MODELS = {
  "seedream-5.0": {
    falId: "fal-ai/bytedance/seedream/v5/text-to-image",
    credits: 1,
  },
  "nano-banana-2": {
    falId: "fal-ai/nano-banana-2",
    credits: 2,
  },
};

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let user = null;
  let spent = 0;

  try {
    // 1. Verify the user — MATCH THIS BLOCK to the auth block in api/generate-video.js
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ error: "Not signed in" });

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ error: "Not signed in" });
    }
    user = userData.user;

    // 2. Validate input
    const { prompt, model } = req.body || {};
    const selected = IMAGE_MODELS[model];
    if (!selected) return res.status(400).json({ error: "Unknown image model" });
    if (!prompt || !prompt.trim() || prompt.length > 2000) {
      return res.status(400).json({ error: "Prompt is required (max 2000 characters)" });
    }

    // 3. Deduct credits atomically
    const { data: paid, error: spendError } = await supabase.rpc("spend_credits", {
      p_user_id: user.id,
      p_amount: selected.credits,
      p_reason: "image_generation",
    });
    if (spendError) throw spendError;
    if (!paid) return res.status(402).json({ error: "Not enough credits" });
    spent = selected.credits;

    // 4. Generate — synchronous, no webhook needed
    const result = await fal.subscribe(selected.falId, {
      input: { prompt: prompt.trim() },
      logs: false,
    });

    const falImageUrl = result?.data?.images?.[0]?.url;
    if (!falImageUrl) throw new Error("No image URL in fal response");

    // 5. Persist to R2 so the still outlives fal's hosting
    const imageRes = await fetch(falImageUrl);
    if (!imageRes.ok) {
      throw new Error("Could not download image from fal: " + imageRes.status);
    }
    const contentType = imageRes.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    const key = `generated-images/${user.id}/${crypto.randomUUID()}.${ext}`;

    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
      })
    );

    return res.status(200).json({
      imageUrl: `${publicUrl}/${key}`,
      creditsSpent: selected.credits,
    });
  } catch (error) {
    console.error("generate-image failed:", error);

    // Refund on any failure after the deduction
    // MATCH THIS to the refund call already used in api/generate-video.js
    if (user && spent > 0) {
      try {
        await supabase.rpc("add_credits", {
          p_user_id: user.id,
          p_amount: spent,
          p_reason: "image_generation_refund",
          p_reference: "imgfail_" + crypto.randomUUID(),
        });
      } catch (refundError) {
        console.error("Refund failed for user", user.id, refundError);
      }
    }

    return res.status(500).json({ error: "Image generation failed. Your credits were not charged." });
  }
}