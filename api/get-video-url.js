import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";

let r2Client = null;

function getR2Client() {
  if (r2Client) return r2Client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 credentials.");
  }
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return r2Client;
}

const SIGNED_SECONDS = 900;   // 15 minutes
const MAX_BATCH = 50;

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
    if (type !== "generations" && (!id || !["creation", "generation", "vault", "vault-voice", "voice", "animated", "memory-day"].includes(type))) {
      return res.status(400).json({ error: "Invalid request" });
    }

    // Many takes at once. A page showing thirty clips used to cost thirty
    // auth round trips and thirty invocations; this costs one of each.
    // Ownership is enforced in the query, so a caller can only ever receive
    // links for their own generations however many ids they send.
    if (type === "generations") {
      const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [])
        .filter((x) => typeof x === "string" && x.length > 0)
        .slice(0, MAX_BATCH);
      if (ids.length === 0) {
        return res.status(400).json({ error: "No generation ids given" });
      }

      const { data: rows, error: rowsError } = await supabase
        .from("generations")
        .select("id, video_url")
        .eq("user_id", user.id)
        .in("id", ids);
      if (rowsError) {
        return res.status(500).json({ error: "Could not look up those clips" });
      }

      const publicBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
      const r2c = getR2Client();
      const urls = {};
      await Promise.all(
        (rows ?? []).map(async (row) => {
          const stored = typeof row.video_url === "string" ? row.video_url : "";
          if (!stored.startsWith(publicBase + "/")) return;
          const k = decodeURIComponent(stored.slice(publicBase.length + 1));
          urls[row.id] = await getSignedUrl(
            r2c,
            new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: k }),
            { expiresIn: SIGNED_SECONDS }
          );
        })
      );
      return res.status(200).json({ urls });
    }

    // Vault entries hold up to three reference images and return them all at
    // once, so the card can render without a round trip per image.
    if (type === "vault") {
      const { data: entry } = await supabase
        .from("vault_entries")
        .select("user_id, images")
        .eq("id", id)
        .maybeSingle();
      if (!entry || entry.user_id !== user.id) {
        return res.status(403).json({ error: "Not authorized to access these images." });
      }
      const publicBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
      const r2c = getR2Client();
      const urls = [];
      for (const stored of (Array.isArray(entry.images) ? entry.images : []).slice(0, 3)) {
        if (typeof stored !== "string" || !stored.startsWith(publicBase + "/")) continue;
        const k = decodeURIComponent(stored.slice(publicBase.length + 1));
        urls.push(
          await getSignedUrl(
            r2c,
            new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: k }),
            { expiresIn: 3600 }
          )
        );
      }
      return res.status(200).json({ urls });
    }

    /*
      A set of drawings from Animate Yourself. Same shape as "vault" above and
      for the same reason: the row stores R2_PUBLIC_URL carrier links, which
      say where an object lives in a private bucket, and a browser can no more
      fetch one than fal could. Every read path turns the stored form back
      into a key and presigns it; this is that path for animated sets, which
      until now had none — the drawings were visible for one minute after they
      were made and unreachable afterwards.

      Owner only. An anonymous set is reached by its pending token instead,
      which only its holder has, and that path is not opened here because an
      unclaimed set has no owner to compare against.
    */
    if (type === "animated") {
      const { data: set } = await supabase
        .from("animated_sets")
        .select("user_id, stills")
        .eq("id", id)
        .maybeSingle();
      if (!set || set.user_id !== user.id) {
        return res.status(403).json({ error: "Not authorized to see those drawings." });
      }
      const publicBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
      const r2c = getR2Client();
      const stills = [];
      for (const still of Array.isArray(set.stills) ? set.stills : []) {
        const stored = still?.url;
        if (typeof stored !== "string" || !stored.startsWith(publicBase + "/")) continue;
        const k = decodeURIComponent(stored.slice(publicBase.length + 1));
        stills.push({
          poseId: still.poseId ?? null,
          note: still.note ?? "",
          url: await getSignedUrl(
            r2c,
            new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: k }),
            { expiresIn: 3600 },
          ),
        });
      }
      return res.status(200).json({ stills });
    }

    /*
      The photos attached to one day in Memory Cinema. Same reason again: the
      row holds carrier links against a private bucket, and a browser cannot
      fetch one. This is the third place that has been true, which is why
      every one of them goes through here rather than each page inventing its
      own signing.

      The `read` travels with each photo because the caption under a photo is
      what it was read for, and sending the URL without it would mean a second
      round trip for text already in hand.
    */
    if (type === "memory-day") {
      const { data: day } = await supabase
        .from("memory_days")
        .select("user_id, photos")
        .eq("id", id)
        .maybeSingle();
      if (!day || day.user_id !== user.id) {
        return res.status(403).json({ error: "Not authorized to see that day." });
      }
      const publicBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
      const r2c = getR2Client();
      const photos = [];
      for (const photo of Array.isArray(day.photos) ? day.photos : []) {
        const stored = photo?.url;
        if (typeof stored !== "string" || !stored.startsWith(publicBase + "/")) continue;
        const k = decodeURIComponent(stored.slice(publicBase.length + 1));
        photos.push({
          read: photo.read ?? null,
          url: await getSignedUrl(
            r2c,
            new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: k }),
            { expiresIn: 3600 },
          ),
        });
      }
      return res.status(200).json({ photos });
    }

    let storedUrl = null;
    let allowed = false;
    let asAttachment = false;

    if (type === "vault-voice") {
      // The voice sample on one of your own Vault characters, so you can hear
      // which recording is attached before a scene is read in it.
      const { data: entry } = await supabase
        .from("vault_entries")
        .select("user_id, voice_sample_url")
        .eq("id", id)
        .maybeSingle();
      if (entry?.voice_sample_url && entry.user_id === user.id) {
        storedUrl = entry.voice_sample_url;
        allowed = true;
      }
    } else if (type === "voice") {
      // A recorded scene read: its owner, and nobody else. Stored as an
      // R2_PUBLIC_URL key carrier like everything else here, so the key is
      // derived from it below and presigned.
      const { data: take } = await supabase
        .from("voice_takes")
        .select("user_id, audio_url")
        .eq("id", id)
        .maybeSingle();
      if (take?.audio_url && take.user_id === user.id) {
        storedUrl = take.audio_url;
        allowed = true;
      }
    } else if (type === "generation") {
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
            // Buying the same film twice is two rows now, and asking for a
            // single row would fail outright rather than granting access.
            .limit(1)
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
    const url = await getSignedUrl(r2, command, { expiresIn: SIGNED_SECONDS });

    return res.status(200).json({ url });
  } catch (err) {
    console.error("get-video-url error:", err);
    return res.status(500).json({ error: "Could not prepare video link" });
  }
}