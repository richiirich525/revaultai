import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { falErrorText } from "./generate-video.js";

// Vercel must NOT pre-parse the body — signature verification needs the raw bytes
export const config = { api: { bodyParser: false } };

const JWKS_URL = "https://rest.alpha.fal.ai/.well-known/jwks.json";
let jwksCache = { keys: null, fetchedAt: 0 };

async function getFalPublicKeys() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  if (jwksCache.keys && Date.now() - jwksCache.fetchedAt < SIX_HOURS) {
    return jwksCache.keys;
  }
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error("Could not fetch fal JWKS");
  const jwks = await res.json();
  jwksCache = { keys: jwks.keys ?? [], fetchedAt: Date.now() };
  return jwksCache.keys;
}

function ed25519KeyFromRaw(rawBase64Url) {
  const raw = Buffer.from(rawBase64Url, "base64url");
  // DER SPKI wrapper for a raw 32-byte Ed25519 public key
  const prefix = Buffer.from("302a300506032b6570032100", "hex");
  return crypto.createPublicKey({
    key: Buffer.concat([prefix, raw]),
    format: "der",
    type: "spki",
  });
}

export async function verifyFalSignature(req, rawBody) {
  const requestId = req.headers["x-fal-webhook-request-id"];
  const userId = req.headers["x-fal-webhook-user-id"];
  const timestamp = req.headers["x-fal-webhook-timestamp"];
  const signatureHex = req.headers["x-fal-webhook-signature"];
  if (!requestId || !userId || !timestamp || !signatureHex) return false;

  // Replay protection: reject timestamps more than 5 minutes off
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const message = Buffer.from(
    [requestId, userId, timestamp, bodyHash].join("\n"),
    "utf-8"
  );
  const signature = Buffer.from(signatureHex, "hex");

  const keys = await getFalPublicKeys();
  for (const k of keys) {
    try {
      const pub = ed25519KeyFromRaw(k.x);
      if (crypto.verify(null, message, pub, signature)) return true;
    } catch {
      // malformed key — try the next one
    }
  }
  return false;
}

export function getR2Client() {
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

/* Built once at module scope: the exported finishers below need it as much
   as the handler does, and two clients from the same environment are two of
   the same thing. */
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/*
  How a take finishes.

  Both halves are exported because a webhook is not the only thing that can
  finish one. If fal's callback is ever missed — a deploy mid-generation, a
  transient 500, a retry that gives up — the take sits in `processing` with
  the credits gone and nothing notices. api/reconcile-takes.js asks fal
  directly and finishes it here, through this code rather than a second copy
  of it: two implementations of "mark it complete and store the video" would
  eventually disagree about one of them, and the one that disagreed would be
  the rare path nobody watches.
*/
export async function failGeneration(gen, message) {
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
      error_message: String(message || "Generation failed").slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq("id", gen.id)
    /* Only from an unfinished state: a retry that arrives after a reconcile
       already settled this take must not refund it twice. */
    .in("status", ["queued", "processing"]);
}

export async function completeGeneration(gen, falVideoUrl) {
  const videoRes = await fetch(falVideoUrl);
  if (!videoRes.ok) {
    throw new Error("Could not download video from fal: " + videoRes.status);
  }
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const key = `generations/${gen.user_id}/${gen.id}.mp4`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: videoBuffer,
      ContentType: "video/mp4",
    }),
  );

  await supabase
    .from("generations")
    .update({
      status: "complete",
      video_url: `${publicUrl}/${key}`,
      completed_at: new Date().toISOString(),
    })
    .eq("id", gen.id)
    .in("status", ["queued", "processing"]);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Read the raw body ourselves (bodyParser is disabled above)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    const verified = await verifyFalSignature(req, rawBody);
    if (!verified) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawBody.toString("utf-8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const { request_id, status, payload, error } = parsed || {};
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
      await failGeneration(gen, falErrorText(error) || falErrorText(payload) || "Generation failed");
      return res.status(200).json({ refunded: true });
    }

    // ---- Success path: pull the video from fal, push to R2 ----
    const falVideoUrl = payload?.video?.url;
    if (!falVideoUrl) {
      throw new Error("No video URL in fal payload");
    }
    await completeGeneration(gen, falVideoUrl);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("generation-webhook error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}