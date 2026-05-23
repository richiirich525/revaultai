import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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

  const { fileType } = req.body;
  const allowedTypes = ["video/mp4", "video/quicktime", "video/webm"];
  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ error: `File type "${fileType}" is not allowed.` });
  }

  const extMap = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
  };
  const ext = extMap[fileType] || ".mp4";
  const key = `videos/${randomUUID()}${ext}`;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return res.status(500).json({ error: "Server misconfiguration: missing R2 env vars." });
  }

  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
  const videoPublicUrl = `${publicUrl.replace(/\/$/, "")}/${key}`;

  return res.status(200).json({ uploadUrl, videoPublicUrl, key });
}