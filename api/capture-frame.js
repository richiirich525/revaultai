import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { gateFailure, readSelfie, persistSelfie } from "./build-pack.js";
import { ANGLE_IDS, angleById, captureIsUsable, nextAngle } from "../src/lib/captureAngles.js";

/*
  capture-frame — RevaultAI

  One frame of a capture, from whichever device is holding the camera.

  EVERY FRAME IS GATED. Not just the first. The gates are the thing that
  keeps a minor's face or a public figure's out of the bucket, and a capture
  that checked frame one and waved the rest through would be a four-frame
  hole in a one-frame control. It costs a vision call per frame and that is
  the correct price.

  WHAT IS STILL NOT CHECKED: that the frames are the same person. Nothing
  here can tell a profile of you from a profile of your brother, and a text
  description cannot be made to do it — comparing two prose descriptions
  would produce a number that looks like a control and is not one. So it is
  not done, and it is not claimed. Each frame's read is stored so a person
  can review a capture, and the line below marks where a real face matcher
  goes when there is one. It is the same seam as age estimation in
  build-pack.js, and it should be filled by the same service.

  RETAKES REPLACE. The first frame somebody shoots in bad light is the most
  predictable event in this whole flow, so an angle can be shot again. The
  old object is purged before the row changes — files first, then rows, the
  same order delete-pack.js uses, so a failed purge leaves a capture that is
  still correct rather than a row pointing at a file that is still there.
*/

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function keyFromUrl(url) {
  const base = process.env.R2_PUBLIC_URL;
  if (!base || typeof url !== "string" || !url.startsWith(base)) return null;
  return url.slice(base.endsWith("/") ? base.length : base.length + 1);
}

async function purge(url) {
  const key = keyFromUrl(url);
  if (!key) return true;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId || !process.env.R2_BUCKET_NAME) return false;
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { code, pose, image, mediaType } = req.body || {};

    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "Which capture is this for?" });
    }
    if (!ANGLE_IDS.includes(pose)) {
      return res.status(400).json({ error: "That is not one of the angles we ask for." });
    }
    if (typeof image !== "string" || image.length < 100) {
      return res.status(400).json({ error: "That photo did not come through. Try again." });
    }
    const type = ["image/jpeg", "image/png", "image/webp"].includes(mediaType) ? mediaType : null;
    if (!type) return res.status(400).json({ error: "Use a JPEG, PNG or WebP photo." });

    /* The session, by code. Read with the service role: capture_sessions has
       no public select policy, which is the point of the code. */
    const { data: session, error: sessionError } = await supabase
      .from("capture_sessions")
      .select("id, code, source, status, expires_at, owner_id")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (sessionError) {
      console.error("capture-frame could not read the session:", sessionError);
      return res.status(502).json({ error: "Could not read that capture: " + sessionError.message });
    }
    if (!session) return res.status(404).json({ error: "That code does not match a capture." });
    if (session.status !== "open") {
      return res.status(409).json({ error: "That capture is already finished." });
    }
    if (new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ error: "That capture has expired. Start a new one." });
    }

    /* ---- the gates, on this frame, every time ------------------------- */
    let read;
    try {
      read = await readSelfie(image, type);
    } catch (err) {
      console.error("capture-frame could not read the frame:", err.message);
      return res.status(502).json({ error: "We could not read that photo. Try again in a moment." });
    }

    const refusal = gateFailure(read);
    if (refusal) return res.status(422).json({ error: refusal });

    /*
      SEAM: a face matcher belongs here, comparing this frame against the
      session's existing frames and refusing a stranger. There is no matcher
      in this product yet, so nothing is compared and nothing is claimed.
    */

    /* ---- the old frame for this angle, if this is a retake ------------- */
    const { data: existing } = await supabase
      .from("capture_frames")
      .select("id, image_url")
      .eq("session_id", session.id)
      .eq("pose", pose)
      .maybeSingle();

    if (existing) {
      try {
        const gone = await purge(existing.image_url);
        if (!gone) {
          return res.status(503).json({ error: "Storage is not configured, so that angle cannot be replaced." });
        }
      } catch (err) {
        console.error("capture-frame could not purge the old frame:", err.message);
        return res.status(502).json({ error: "We could not clear the previous shot of that angle. Try again." });
      }
    }

    let storedUrl;
    try {
      storedUrl = await persistSelfie(image, type);
    } catch (err) {
      console.error("capture-frame could not store the frame:", err.message);
      return res.status(502).json({ error: "We read that photo but could not save it. Try again in a moment." });
    }

    const { error: writeError } = existing
      ? await supabase.from("capture_frames")
          .update({ image_url: storedUrl, read }).eq("id", existing.id)
      : await supabase.from("capture_frames")
          .insert({ session_id: session.id, pose, image_url: storedUrl, read });

    if (writeError) {
      console.error("capture-frame could not record the frame:", writeError);
      return res.status(502).json({ error: "Could not record that frame: " + writeError.message });
    }

    const { data: all } = await supabase
      .from("capture_frames")
      .select("pose")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    const shot = (all ?? []).map((r) => r.pose);
    const next = nextAngle(shot);

    return res.status(200).json({
      pose,
      label: angleById(pose)?.label ?? pose,
      shot,
      next,
      usable: captureIsUsable(shot),
      replaced: !!existing,
    });
  } catch (error) {
    console.error("capture-frame failed:", error);
    return res.status(500).json({ error: "Something went wrong saving that frame." });
  }
}
