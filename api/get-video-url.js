import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Not signed in" });
    }

    const { type, id } = req.body || {};
    if (!id || !["creation", "generation"].includes(type)) {
      return res.status(400).json({ error: "Invalid request" });
    }

    let storedUrl = null;
    let allowed = false;
    let asAttachment = false;

    if (type === "generation") {
      // Generated videos: owner only
      const { data: gen } = await supabase
        .from("generations")
        .select("user_id, video_url")
        .eq("id", id)
        .maybeSingle();
      if (gen?.video_url && gen.user_id === user.id) {
        storedUrl = gen.video_url;
        allowed = true;
      }
    } else {
      // Films: the creator, or anyone with a purchase row
      const { data: creation } = await supabase
        .from("creations")
        .select("user_id, video_url")
        .eq("id", id)
        .maybeSingle();
      if (creation?.video_url) {
        storedUrl = creation.video_url;
        asAttachment = true;
        if (creation.user_id === user.id) {
          allowed = true;
        } else {
          const { data: purchase } = await supabase
            .from("purchases")
            .select("user_id")
            .eq("user_id", user.id)
            .eq("creation_id", id)
            .maybeSingle();
          if (purchase) allowed = true;
        }
      }
    }

    if (!allowed || !storedUrl) {
      return res.status(403).json({ error: "Not authorized to access this video." });
    }

    // Stored URLs are public-host URLs; derive the bucket key from them
    const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    if (!storedUrl.startsWith(publicUrl + "/")) {
      return res.status(400).json({ error: "Video is not stored in the vault." });
    }
    const key = decodeURIComponent(storedUrl.slice(publicUrl.length + 1));

    const r2 = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ...(asAttachment ? { ResponseContentDisposition: "attachment" } : {}),
    });
    const url = await getSignedUrl(r2, command, { expiresIn: 900 }); // 15 minutes

    return res.status(200).json({ url });
  } catch (err) {
    console.error("get-video-url error:", err);
    return res.status(500).json({ error: "Could not prepare video link" });
  }
}