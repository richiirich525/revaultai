import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { buildStillSet, setIsOnePerson, FREE_SET, POSES } from "../src/lib/stillSet.js";

/*
  animate-pack — RevaultAI

  Animate Yourself: a pack, a medium, and a set of drawings of that person.

  THE PACK IS NEVER SENT BY THE CLIENT. It is resolved here from the Vault or
  from the pending-pack token, and only then compiled into prompts. The same
  rule the Recording Studio follows, for the same reason: if the client could
  send an identity, a forged request could draw anyone.

  Stills rather than video, for the whole first set. A still costs a fraction
  of a generation and comes back in seconds, which is what makes a generous
  free tier affordable — and a set of drawings of yourself is a thing people
  use, where a single video is a thing people watch once.

  Every still in a set shares a byte-identical pack block. That is checked
  here before anything is generated, not assumed, because a set where the
  face drifts between images is the one failure that would discredit the
  entire product in a single screenshot.
*/

/*
  VERIFY this falId in the fal playground before deploying, exactly as
  api/generate-image.js says of its own.

  What it has to be: an image model that accepts REFERENCE IMAGES, not a
  text-to-image model. Text alone does not hold a face, and the pack's
  reference image is the whole reason the set looks like one person. The
  text-to-image entry in generate-image.js is not a substitute.
*/
const ANIMATE_MODEL = {
  falId: "fal-ai/nano-banana-2/edit",
  /* The input key for reference images. Named here so that changing models
     is one line rather than a search through the handler. */
  imageKey: "image_urls",
  creditsPerStill: 1,
};

const ANON_SETS_PER_DAY = 3;

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

function hashIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = fwd || req.socket?.remoteAddress || "";
  if (!ip) return null;
  const salt = process.env.SHARE_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "revault";
  return crypto.createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

/* A Vault row and a pending pack are different shapes of the same thing. */
export function packFromVaultRow(row) {
  return {
    name: row.name,
    identity: row.description,
    build: row.build,
    distinguishing: row.distinguishing,
    wardrobe: row.wardrobe,
    images: Array.isArray(row.images) ? row.images : [],
  };
}

/* Persist each still so it outlives fal's hosting, exactly as
   generate-image.js does. Returns the R2 carrier form. */
export async function persistStill(falUrl, folder) {
  const res = await fetch(falUrl);
  if (!res.ok) throw new Error("Could not download the still: " + res.status);
  const contentType = res.headers.get("content-type") || "image/png";
  const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  await getR2Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: Buffer.from(await res.arrayBuffer()),
    ContentType: contentType,
  }));
  return `${(process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { packId, packToken, mediumId, count } = req.body || {};
    if (!mediumId || typeof mediumId !== "string") {
      return res.status(400).json({ error: "Pick a medium to draw this in." });
    }

    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };

    /* ---- resolve the pack, server-side only ---------------------------- */
    let pack = null;
    let owner = null;

    if (user && typeof packId === "string" && packId) {
      const { data, error } = await supabase
        .from("vault_entries")
        .select("id, user_id, name, description, build, distinguishing, wardrobe, images")
        .eq("id", packId).eq("user_id", user.id).eq("kind", "character").maybeSingle();
      if (error) {
        console.error("animate-pack could not read the pack:", error);
        return res.status(502).json({ error: "Could not read that pack: " + error.message });
      }
      if (!data) return res.status(404).json({ error: "That pack is not in your Vault." });
      pack = packFromVaultRow(data);
      owner = user.id;
    } else if (typeof packToken === "string" && packToken) {
      /* The token is the credential. It is checked here and nowhere else,
         and an expired or claimed-by-someone-else pack is simply not found. */
      const { data, error } = await supabase
        .from("pending_packs")
        .select("token, pack, expires_at, claimed_by")
        .eq("token", packToken).maybeSingle();
      if (error) {
        console.error("animate-pack could not read the pending pack:", error);
        return res.status(502).json({ error: "Could not read that pack: " + error.message });
      }
      if (!data || new Date(data.expires_at) < new Date()) {
        return res.status(404).json({ error: "That pack has expired. Take another selfie — sign in and the next one is kept." });
      }
      if (data.claimed_by && data.claimed_by !== user?.id) {
        return res.status(403).json({ error: "That pack belongs to somebody else." });
      }
      pack = data.pack;
    } else {
      return res.status(400).json({ error: "Which pack should we draw?" });
    }

    if (!pack?.images?.length) {
      /* Text alone does not hold a face. A set built with no reference would
         be eight drawings of eight people who share a description. */
      return res.status(422).json({ error: "This pack has no reference photo, so we cannot keep the face consistent." });
    }

    /* ---- metering ------------------------------------------------------ */
    const want = Math.max(1, Math.min(Number(count) || FREE_SET, POSES.length));
    const ip = hashIp(req);

    if (!user) {
      if (want > FREE_SET) {
        return res.status(402).json({ error: `Sign in for the full set of ${POSES.length}.` });
      }
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: made } = await supabase
        .from("animated_sets").select("id", { count: "exact", head: true })
        .eq("ip_hash", ip).gte("created_at", since);
      if ((made ?? 0) >= ANON_SETS_PER_DAY) {
        return res.status(429).json({ error: "That is as many sets as we can draw from here today. Sign in to make more." });
      }
    }

    /* ---- compile before spending anything ------------------------------ */
    const built = buildStillSet({ pack, mediumId, count: want });
    if (!built.ok) return res.status(422).json({ error: built.errors[0], problems: built.errors });

    /* The check that matters. If the pack block ever differed between
       stills, the set would be of several people and the product's one
       claim would be false — so it is verified before a credit is spent,
       not discovered in the output. */
    if (!setIsOnePerson(built.stills)) {
      console.error("animate-pack: the set was not one person", { mediumId, want });
      return res.status(500).json({ error: "Something went wrong keeping the face consistent. Nothing was charged." });
    }

    /* Paid sets are charged up front, like every other generation here. The
       free set and the anonymous path cost nothing, which is the point. */
    let spent = 0;
    if (user && want > FREE_SET) {
      const cost = (want - FREE_SET) * ANIMATE_MODEL.creditsPerStill;
      const { data: paid, error: spendError } = await supabase.rpc("spend_credits", {
        p_user_id: user.id, p_amount: cost, p_reason: "animate yourself",
      });
      if (spendError) throw spendError;
      if (!paid) return res.status(402).json({ error: "Not enough credits" });
      spent = cost;
    }

    /* ---- draw ----------------------------------------------------------- */
    const folder = owner ? `animated/${owner}` : `animated/anon/${ip ?? "unknown"}`;
    const drawn = [];
    const failed = [];

    for (const still of built.stills) {
      try {
        const result = await fal.subscribe(ANIMATE_MODEL.falId, {
          input: { prompt: still.prompt, [ANIMATE_MODEL.imageKey]: pack.images.slice(0, 3) },
          logs: false,
        });
        const url = result?.data?.images?.[0]?.url;
        if (!url) throw new Error("No image came back");
        drawn.push({ poseId: still.poseId, note: still.note, url: await persistStill(url, folder) });
      } catch (err) {
        console.error(`animate-pack: ${still.poseId} failed:`, err.message);
        failed.push(still.poseId);
      }
    }

    /* Refund what was not drawn. A partial set is still a set, but nobody
       should pay for a pose that never arrived. */
    if (spent && failed.length) {
      const refund = Math.min(spent, failed.length * ANIMATE_MODEL.creditsPerStill);
      await supabase.rpc("add_credits", {
        p_user_id: user.id, p_amount: refund, p_reason: "refund", p_session_id: null,
      }).catch((e) => console.error("animate-pack refund failed:", e));
      spent -= refund;
    }

    if (!drawn.length) {
      return res.status(502).json({ error: "None of the drawings came back. Nothing was charged." });
    }

    await supabase.from("animated_sets").insert({
      user_id: owner,
      pending_token: owner ? null : packToken,
      ip_hash: ip,
      medium: mediumId,
      stills: drawn,
      credits_spent: spent,
    }).then(({ error }) => { if (error) console.error("animate-pack could not record the set:", error.message); });

    return res.status(200).json({
      medium: mediumId,
      stills: drawn,
      failed,
      creditsSpent: spent,
      /* What the interface turns into "sign up to keep these". */
      kept: !!owner,
    });
  } catch (error) {
    console.error("animate-pack failed:", error);
    return res.status(500).json({ error: "Something went wrong drawing your set." });
  }
}
