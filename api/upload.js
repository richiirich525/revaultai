import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { IncomingForm } from "formidable";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { extname } from "path";

// Vercel serverless — disable default body parser so formidable can read the stream
export const config = {
  api: {
    bodyParser: false,
  },
};

// --- R2 client ---------------------------------------------------------------
// Required env vars (set these in Vercel dashboard → Settings → Environment Variables):
//   R2_ACCOUNT_ID        — Cloudflare account ID
//   R2_ACCESS_KEY_ID     — R2 API token Access Key ID
//   R2_SECRET_ACCESS_KEY — R2 API token Secret Access Key
//   R2_BUCKET_NAME       — bucket name (e.g. "revaultai-videos")
//   R2_PUBLIC_URL        — public base URL for the bucket (e.g. "https://pub-xxx.r2.dev")

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in Vercel environment variables."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// --- Parse multipart form ----------------------------------------------------
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 250 * 1024 * 1024, // 250 MB
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// --- Handler -----------------------------------------------------------------
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check env vars upfront and return a clear error if missing
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucket) {
    console.error("[upload] R2_BUCKET_NAME is not set");
    return res.status(500).json({
      error: "Server misconfiguration: R2_BUCKET_NAME is not set. Add it in Vercel environment variables.",
    });
  }
  if (!publicUrl) {
    console.error("[upload] R2_PUBLIC_URL is not set");
    return res.status(500).json({
      error: "Server misconfiguration: R2_PUBLIC_URL is not set. Add it in Vercel environment variables.",
    });
  }

  let r2;
  try {
    r2 = getR2Client();
  } catch (err) {
    console.error("[upload] R2 client init failed:", err.message);
    return res.status(500).json({ error: err.message });
  }

  // Parse the uploaded file
  let files;
  try {
    const parsed = await parseForm(req);
    files = parsed.files;
  } catch (err) {
    console.error("[upload] Form parse error:", err.message);
    return res.status(400).json({ error: "Could not parse upload: " + err.message });
  }

  // formidable v2 wraps files in arrays; support both v1 and v2
  const rawFile = files.video;
  const videoFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;

  if (!videoFile) {
    return res.status(400).json({ error: 'No file received. Expected field name "video".' });
  }

  // Validate MIME type
  const allowedTypes = ["video/mp4", "video/quicktime", "video/webm"];
  const mimeType = videoFile.mimetype || videoFile.type || "";
  if (!allowedTypes.includes(mimeType)) {
    return res.status(400).json({
      error: `File type "${mimeType}" is not allowed. Accepted: MP4, MOV, WebM.`,
    });
  }

  // Build a unique key for R2
  const ext = extname(videoFile.originalFilename || videoFile.name || ".mp4") || ".mp4";
  const key = `videos/${randomUUID()}${ext}`;
  const filePath = videoFile.filepath || videoFile.path;

  // Read the file buffer
  let fileBuffer;
  try {
    fileBuffer = readFileSync(filePath);
  } catch (err) {
    console.error("[upload] Could not read temp file:", err.message);
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
        // Make the object publicly readable.
        // If your bucket uses a custom domain / public access policy instead,
        // remove the ACL line — Cloudflare R2 ignores ACLs by default.
        // ACL: "public-read",
      })
    );
  } catch (err) {
    console.error("[upload] R2 PutObject failed:", err.message, err.Code || "");
    return res.status(500).json({
      error: "Upload to storage failed: " + (err.message || "Unknown R2 error"),
      detail: err.Code || null,
    });
  }

  const videoPublicUrl = `${publicUrl.replace(/\/$/, "")}/${key}`;

  // Return the URLs the client expects
  return res.status(200).json({
    success: true,
    video_url: videoPublicUrl,
    preview_video: videoPublicUrl,
    // thumbnail_image: use a placeholder until you add ffmpeg thumbnail generation
    thumbnail_image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=90",
  });
}