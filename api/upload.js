import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { IncomingForm } from "formidable";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { extname } from "path";
import { createClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 250 * 1024 * 1024,
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// Poll Mux until the asset is ready (max 60s)
async function waitForMuxAsset(video, assetId, maxWaitMs = 60000) {
  const pollInterval = 3000;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const asset = await video.assets.retrieve(assetId);
    if (asset.status === "ready") return asset;
    if (asset.status === "errored") throw new Error("Mux asset processing failed.");
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error("Mux asset processing timed out.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: sign in to upload." });
  }
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: invalid or expired session." });
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized: could not verify session." });
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicUrl) {
    return res.status(500).json({ error: "Server misconfiguration: missing R2 env vars." });
  }

  const muxTokenId = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
  const muxEnabled = !!(muxTokenId && muxTokenSecret);

  let r2;
  try {
    r2 = getR2Client();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  let files;
  try {
    const parsed = await parseForm(req);
    files = parsed.files;
  } catch (err) {
    return res.status(400).json({ error: "Could not parse upload: " + err.message });
  }

  const rawFile = files.video;
  const videoFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;
  if (!videoFile) {
    return res.status(400).json({ error: 'No file received. Expected field name "video".' });
  }

  const allowedTypes = ["video/mp4", "video/quicktime", "video/webm"];
  const mimeType = videoFile.mimetype || videoFile.type || "";
  if (!allowedTypes.includes(mimeType)) {
    return res.status(400).json({
      error: `File type "${mimeType}" is not allowed. Accepted: MP4, MOV, WebM.`,
    });
  }

  const ext = extname(videoFile.originalFilename || videoFile.name || ".mp4") || ".mp4";
  const key = `videos/${randomUUID()}${ext}`;
  const filePath = videoFile.filepath || videoFile.path;

  let fileBuffer;
  try {
    fileBuffer = readFileSync(filePath);
  } catch (err) {
    return res.status(500).json({ error: "Could not read uploaded file: " + err.message });
  }

  // Upload to R2
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      })
    );
  } catch (err) {
    return res.status(500).json({
      error: "Upload to storage failed: " + (err.message || "Unknown R2 error"),
    });
  }

  const videoPublicUrl = `${publicUrl.replace(/\/$/, "")}/${key}`;

  // If Mux is configured, create an asset and get thumbnail + preview
  if (muxEnabled) {
    try {
      const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });
      const { video } = mux;

      const asset = await video.assets.create({
        input: [{ url: videoPublicUrl }],
        playback_policy: ["public"],
        mp4_support: "standard",
      });

      // Wait for Mux to process the asset
      const readyAsset = await waitForMuxAsset(video, asset.id);
      const playbackId = readyAsset.playback_ids?.[0]?.id;

      if (playbackId) {
        const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0&width=1200`;
        const previewUrl   = `https://image.mux.com/${playbackId}/animated.gif?start=0&end=4&width=640`;
        const streamUrl    = `https://stream.mux.com/${playbackId}.m3u8`;

        return res.status(200).json({
          success: true,
          video_url:       videoPublicUrl,  // original full file on R2
          stream_url:      streamUrl,        // Mux HLS stream
          preview_video:   previewUrl,       // animated GIF for hover preview
          thumbnail_image: thumbnailUrl,     // real thumbnail from frame 0
          mux_asset_id:    asset.id,
          mux_playback_id: playbackId,
        });
      }
    } catch (err) {
      console.error("[upload] Mux processing failed:", err.message);
      // Fall through to return R2 URL with placeholder thumbnail
    }
  }

  // Fallback: no Mux or Mux failed
  return res.status(200).json({
    success: true,
    video_url:       videoPublicUrl,
    preview_video:   videoPublicUrl,
    thumbnail_image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90",
  });
}