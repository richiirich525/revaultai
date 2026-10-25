import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { protectedTermIn } from "../src/lib/stylePresets.js";

/*
  build-pack — RevaultAI

  A selfie goes in. A locked character pack comes out, or a refusal with a
  reason.

  This is the second screen of the product and the first thing that has to be
  right, because everything downstream reuses whatever it produces. Two
  concerns run through it.

  IDENTITY. The pack is written once and then never edited. The vision pass
  describes what is in the photograph — face, build, wardrobe — in concrete
  terms, and that description becomes the fixed input every later prompt
  reuses. It is not a creative act and the model is told so: a flattering
  description is a description of somebody else.

  SAFETY. Three gates run before a pack exists at all: one face, an adult,
  and not a public figure. They run here rather than at generation time
  because a refused pack cannot be used for anything, whereas a refused
  generation is one of many attempts.

  WHAT THESE GATES ARE AND ARE NOT. They are a vision model's judgment, and
  that is a first line of defense, not a sufficient one. Apparent age from a
  photograph is unreliable in both directions. A model will not recognize
  every public figure. Before this is public, the age and public-figure
  checks want a dedicated service behind them; the shape here is built so
  that swapping them is changing one function, not unpicking the route. What
  is written below is what can honestly be claimed today, and the refusals
  are deliberately conservative — an uncertain answer refuses.

  NO ACCOUNT NEEDED. A pack built by a stranger waits in pending_packs under
  a random token and is claimed into their Vault when they sign up. That is
  what "sign up to keep your pack" does.
*/

const ANON_PACKS_PER_DAY = 5;

/* The fields a pack locks. A constant, not a column: which fields are locked
   is the same for every pack in the product, and a per-row version of this
   list is a per-row way to unlock somebody's face. */
export const LOCKED_FIELDS = ["identity", "build", "distinguishing", "images"];

const SYSTEM_PROMPT = `You are building a character reference from a photograph a person has taken of themselves, for a film production. You do two jobs and you report both honestly.

FIRST, the checks. Answer these before anything else:
- "faces": how many human faces are clearly visible. Count every face, including any in the background.
- "apparentAdult": true if the person is clearly an adult, false if they appear to be under 18, null if you are not sure. Being unsure is a normal answer and you should give it whenever the photograph does not make this obvious.
- "publicFigure": the name of the well-known public figure this appears to be, or null. Only answer with a name if you are confident. A resemblance is not a match.

SECOND, the description, only if there is exactly one adult face and no public figure. Describe what is actually in the photograph, in the concrete terms a casting director would use:
- "identity": face and hair. Apparent age range, skin tone, hair color and style, face shape, eye color, facial hair. One or two sentences.
- "build": body, as far as the photograph shows it. Leave empty if it only shows a head.
- "distinguishing": a scar, a mole, freckles, glasses, a tattoo, a piercing, a gap in the teeth. Empty if there is nothing specific.
- "wardrobe": what they are wearing, as far as it is visible.

Rules for the description:
- Describe, do not flatter. A flattering description is a description of somebody else, and this is the reference every later image is built from.
- Only what you can see. Do not guess at height, profession, nationality or personality.
- No judgments of attractiveness, weight or health.
- Empty string for anything the photograph does not show. Empty is correct far more often than a guess.

Return ONLY this JSON object:
{ "faces": 0, "apparentAdult": null, "publicFigure": null, "identity": "", "build": "", "distinguishing": "", "wardrobe": "" }`;

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

/*
  The selfie is stored here, from the same bytes the vision pass just read.

  Two reasons it is not uploaded by the client. The upload route needs an
  account, and this flow deliberately has none yet — a stranger with no
  sign-in still ends up with a reference photo, which is what every later
  drawing of them is conditioned on.

  And the reference must be the image that was actually checked. If the
  client supplied the stored URL separately, it could send one face to be
  gated and described and a different one to be drawn from, which would make
  every gate in this file decorative.
*/
export async function persistSelfie(base64, mediaType) {
  const ext = mediaType.includes("png") ? "png" : mediaType.includes("webp") ? "webp" : "jpg";
  const key = `packs/${crypto.randomUUID()}.${ext}`;
  await getR2Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: Buffer.from(base64, "base64"),
    ContentType: mediaType,
  }));
  return `${(process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`;
}

function hashIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = fwd || req.socket?.remoteAddress || "";
  if (!ip) return null;
  const salt = process.env.SHARE_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "revault";
  return crypto.createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

const cut = (v, n) => String(v ?? "").trim().slice(0, n);

/*
  The gates. Separated from the call so that replacing the age or
  public-figure check with a dedicated service later is a change to this
  function and nothing else.

  Every uncertain answer refuses. `apparentAdult: null` is a refusal, not a
  pass — the cost of refusing an adult is that they try another photo, and
  the cost of the opposite is a minor's likeness in a video generator.
*/
export function gateFailure(read) {
  const faces = Number(read?.faces);
  if (!Number.isFinite(faces) || faces < 1) {
    return "We could not find a face in that. Try a photo where you are looking at the camera.";
  }
  if (faces > 1) {
    return "There is more than one person in that photo. A pack has to be built from a picture of just you — everyone else builds their own.";
  }
  if (read.apparentAdult !== true) {
    return "We can only build a pack from a photo of an adult.";
  }
  if (read.publicFigure) {
    return "That looks like a photo of someone well known. A pack has to be built from a picture of yourself.";
  }
  return null;
}

export async function readSelfie(imageBase64, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Run the checks, then describe this person if the checks pass." },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  return JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { image, mediaType, name } = req.body || {};

    if (typeof image !== "string" || image.length < 100) {
      return res.status(400).json({ error: "Send a photo to build a pack from." });
    }
    /* ~8MB of base64 is about a 6MB photo, which is more than a phone needs
       and less than a way to fill the request. */
    if (image.length > 8_000_000) {
      return res.status(413).json({ error: "That photo is too large. A normal phone photo is fine." });
    }
    const type = ["image/jpeg", "image/png", "image/webp"].includes(mediaType) ? mediaType : "image/jpeg";

    /* Who is asking, if anybody. A pack can be built with no account at all. */
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };

    const ip = hashIp(req);
    if (!user) {
      /* Anonymous writes have to be metered, and only the server can meter
         them. The same reasoning as anonymous share links. */
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("pending_packs")
        .select("token", { count: "exact", head: true })
        .eq("ip_hash", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= ANON_PACKS_PER_DAY) {
        return res.status(429).json({ error: "That is as many packs as we can build from here today. Sign in to make more." });
      }
    }

    /* ---- the vision pass, then the gates ------------------------------- */
    let read;
    try {
      read = await readSelfie(image, type);
    } catch (err) {
      console.error("build-pack could not read the selfie:", err.message);
      return res.status(502).json({ error: "We could not read that photo. Try again in a moment." });
    }

    const refusal = gateFailure(read);
    if (refusal) return res.status(422).json({ error: refusal });

    if (!cut(read.identity, 10)) {
      return res.status(422).json({ error: "We could not see enough of your face to build a pack. Try better light, looking at the camera." });
    }

    /* A name is the one field the creator sets, so it is the one field that
       can carry something it should not. */
    const chosen = cut(name, 60) || "You";
    const term = protectedTermIn(chosen);
    if (term) return res.status(422).json({ error: `A pack cannot be named after "${term}". Use your own name, or any name you like that is not somebody else's.` });

    /* Stored only now, after the gates have passed. A refused photo is never
       written anywhere — a minor's face should not sit in a bucket because
       the refusal happened a line too late. */
    let storedUrl;
    try {
      storedUrl = await persistSelfie(image, type);
    } catch (err) {
      console.error("build-pack could not store the selfie:", err.message);
      return res.status(502).json({ error: "We read your photo but could not save it. Try again in a moment." });
    }

    const pack = {
      name: chosen,
      kind: "character",
      identity: cut(read.identity, 700),
      build: cut(read.build, 300),
      distinguishing: cut(read.distinguishing, 300),
      wardrobe: cut(read.wardrobe, 300),
      images: [storedUrl],
      capture: { source: "phone", plateSet: null, capturedAt: new Date().toISOString() },
      consent: { self: true, duetable: false, grantedAt: new Date().toISOString() },
      locked: LOCKED_FIELDS,
    };

    /* ---- where it goes -------------------------------------------------- */
    if (user) {
      const { data: saved, error } = await supabase
        .from("vault_entries")
        .insert({
          user_id: user.id,
          kind: "character",
          name: pack.name,
          description: pack.identity,
          build: pack.build,
          distinguishing: pack.distinguishing,
          wardrobe: pack.wardrobe,
          images: pack.images,
          capture: pack.capture,
          consent: pack.consent,
        })
        .select("id")
        .single();
      if (error) {
        console.error("build-pack could not save the pack:", error);
        return res.status(502).json({ error: "We built your pack but could not save it: " + error.message });
      }
      return res.status(200).json({ packId: saved.id, pack, kept: true });
    }

    const { data: pending, error } = await supabase
      .from("pending_packs")
      .insert({ pack, ip_hash: ip })
      .select("token")
      .single();
    if (error) {
      console.error("build-pack could not hold the pack:", error);
      return res.status(502).json({ error: "We built your pack but could not hold on to it: " + error.message });
    }

    /* The token is the only way back to this pack, and it is returned once.
       `kept: false` is what the interface turns into "sign up to keep this". */
    return res.status(200).json({ packToken: pending.token, pack, kept: false });
  } catch (error) {
    console.error("build-pack failed:", error);
    return res.status(500).json({ error: "Something went wrong building your pack." });
  }
}
