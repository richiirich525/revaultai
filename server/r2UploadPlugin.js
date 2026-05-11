/**
 * server/r2UploadPlugin.js
 *
 * Vite plugin that adds a server-side /api/upload route during dev.
 * In production, deploy api/upload.js as a Cloudflare Worker, Vercel
 * serverless function, or any Node server — the client code is identical.
 *
 * Install deps:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner busboy
 */

import { IncomingMessage } from "http";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import busboy from "busboy";
import { Readable } from "stream";
import crypto from "crypto";
import path from "path";
function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }

  return value;
}
function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

/**
 * Parse a multipart/form-data request from Vite's connect middleware.
 * Returns { fields, files: [{ fieldname, filename, mimetype, buffer }] }
 */
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files  = [];
    const bb = busboy({ headers: req.headers });

    bb.on("field", (name, val) => { fields[name] = val; });

    bb.on("file", (fieldname, stream, info) => {
      const chunks = [];
      stream.on("data", (d) => chunks.push(d));
      stream.on("end", () => {
        files.push({
          fieldname,
          filename: info.filename,
          mimetype: info.mimeType,
          buffer:   Buffer.concat(chunks),
        });
      });
    });

    bb.on("finish", () => resolve({ fields, files }));
    bb.on("error",  reject);

    // Vite wraps the raw Node request — pipe it in
    if (req.pipe) {
      req.pipe(bb);
    } else {
      reject(new Error("Cannot pipe request to busboy"));
    }
  });
}

async function handleUpload(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const { files } = await parseMultipart(req);
    const videoFile = files.find((f) => f.fieldname === "video");

    if (!videoFile) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No video file received" }));
      return;
    }

    // Validate type
    const allowed = ["video/mp4", "video/quicktime", "video/webm"];
    if (!allowed.includes(videoFile.mimetype)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Only MP4, MOV, or WebM files are accepted" }));
      return;
    }

    // Validate size (500 MB max)
    const MAX_BYTES = 500 * 1024 * 1024;
    if (videoFile.buffer.length > MAX_BYTES) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "File exceeds 500 MB limit" }));
      return;
    }

    const bucket     = requireEnv("R2_BUCKET_NAME");
    const publicBase = requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
    const r2         = getR2Client();

    // ── Upload video ──────────────────────────────────────────────────────────
    const ext        = path.extname(videoFile.filename || ".mp4") || ".mp4";
    const uid        = crypto.randomUUID();
    const videoKey   = `videos/${uid}${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         videoKey,
      Body:        videoFile.buffer,
      ContentType: videoFile.mimetype,
      CacheControl: "public, max-age=31536000",
    }));

    const videoUrl = `${publicBase}/${videoKey}`;

    // ── Thumbnail: extract first frame via signed URL hint ────────────────────
    // R2 does not transcode video server-side. We return a thumbnail_url that
    // points to a Cloudflare Images transform URL if R2_IMAGE_TRANSFORM is set,
    // otherwise we fall back to the video URL itself (the client renders a
    // video poster). A real thumbnail requires a separate worker or CF Images.
    const imageTransformBase = process.env.R2_IMAGE_TRANSFORM_URL;
    const thumbnailUrl = imageTransformBase
      ? `${imageTransformBase.replace(/\/$/, "")}/${videoKey}?time=0s&width=1280`
      : videoUrl; // fallback: client uses video poster

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      video_url:       videoUrl,
      preview_video:   videoUrl,
      thumbnail_image: thumbnailUrl,
    }));

  } catch (err) {
    console.error("[r2Upload]", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message || "Upload failed" }));
  }
}

/**
 * Export as a Vite plugin.
 * Add to vite.config.js:
 *
 *   import r2UploadPlugin from "./server/r2UploadPlugin.js";
 *   export default defineConfig({ plugins: [react(), r2UploadPlugin()] });
 */
export default function r2UploadPlugin() {
  return {
    name: "revaultai-r2-upload",
    configureServer(server) {
      server.middlewares.use("/api/upload", (req, res) => {
        handleUpload(req, res).catch((err) => {
          console.error("[r2Upload middleware]", err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      });
    },
  };
}