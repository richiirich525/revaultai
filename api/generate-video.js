import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/*
  A start frame arrives as an R2_PUBLIC_URL link, which is how this app records
  where an object lives — not a link anybody can fetch. That bucket is private:
  every read path in get-video-url.js turns such a link back into a key and
  presigns it, and nothing anywhere fetches the stored form directly.

  fal has to fetch the start frame itself, from outside, so it needs the same
  treatment. Handing over the stored form hands fal a 403, which is why a
  generation with a start frame failed on every model while reference photos —
  which already come back presigned — worked.

  Anything not on our own bucket is passed straight through: fal's CDN serves
  the location plates, and those are already fetchable.
*/
let r2Client = null;
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error('Missing R2 credentials.');
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return r2Client;
}

export async function signForFal(url) {
  const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
  if (!base || typeof url !== 'string' || !url.startsWith(base + '/')) return url;
  const key = decodeURIComponent(url.slice(base.length + 1));
  if (!key) return url;
  return await getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }),
    // 2 hours, matching signIfOurs in edit-video.js: a queued job may not be
    // picked up for a while, and the link has to still work when it is.
    { expiresIn: 7200 },
  );
}

// Model catalog — server-side only, client just sends a model key
const MODELS = {
  'wan-2.6': {
    falId: 'wan/v2.6/text-to-video',
    imageFalId: 'wan/v2.6/image-to-video',   // VERIFY on fal
    creditsPerSecond: 1,
    durationParam: { 5: '5', 10: '10', 15: '15' },
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
  'kling-3.0': {
    falId: 'fal-ai/kling-video/v3/standard/text-to-video',
    imageFalId: 'fal-ai/kling-video/v3/standard/image-to-video',   // VERIFY on fal
    creditsPerSecond: 2,
    durationParam: { 5: '5', 10: '10' },
    aspectRatios: ['16:9', '9:16', '1:1'],
    // Kling v3 image-to-video infers ratio from the start image and ignores this field.
    aspectIgnoredWithImage: true,
  },
  'seedance-2.0': {
    falId: 'bytedance/seedance-2.0/fast/text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
    imageFalId: 'bytedance/seedance-2.0/fast/image-to-video',
    creditsPerSecond: 6,
    durationParam: { 5: '5', 10: '10', 15: '15' },
    extraInput: { resolution: '720p' },
  },
  'seedance-2.0-480': {
    falId: 'bytedance/seedance-2.0/fast/text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
    imageFalId: 'bytedance/seedance-2.0/fast/image-to-video',
    creditsPerSecond: 3,
    durationParam: { 5: '5', 10: '10', 15: '15' },
    extraInput: { resolution: '480p' },
  },
  'seedance-2.5': {
    falId: 'bytedance/seedance-2.5/text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
    imageFalId: 'bytedance/seedance-2.5/image-to-video',
    creditsPerSecond: 12,
    durationParam: { 5: '5', 10: '10', 15: '15', 30: '30' },
    extraInput: { resolution: '720p', generate_audio: true },
  },
  'seedance-2.5-480': {
    falId: 'bytedance/seedance-2.5/text-to-video',
    aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
    imageFalId: 'bytedance/seedance-2.5/image-to-video',
    creditsPerSecond: 6,
    durationParam: { 5: '5', 10: '10', 15: '15', 30: '30' },
    extraInput: { resolution: '480p', generate_audio: true },
  },
  // MiniMax H3 Max. Three tiers off one model: the resolution is the only
  // difference, and at fal's $0.05/s it is the cheapest reference-capable
  // model in the catalog by a wide margin.
  //
  // prompt_expansion_mode is pinned to 'disabled' on every tier and is not a
  // creator-facing option. fal's default rewrites the prompt before it reaches
  // the model, which would quietly undo the framing, eyelines, declared intent
  // and Vault wording this whole platform exists to put there.
  'minimax-h3-480': {
    falId: 'minimax/h3-max/text-to-video',
    imageFalId: 'minimax/h3-max/image-to-video',
    // end_image_url is on the image-to-video and reference-to-video routes.
    // image_url is optional on both, so an end frame works on its own.
    endFrame: true,
    creditsPerSecond: 1,
    durationParam: { 5: 5, 10: 10, 15: 15 },             // a float, not an enum
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    aspectIgnoredWithImage: true,   // the canvas follows the first frame
    extraInput: { resolution: '480P', prompt_expansion_mode: 'disabled' },
  },
  'minimax-h3': {
    falId: 'minimax/h3-max/text-to-video',
    imageFalId: 'minimax/h3-max/image-to-video',
    endFrame: true,
    creditsPerSecond: 2,
    durationParam: { 5: 5, 10: 10, 15: 15 },
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    aspectIgnoredWithImage: true,
    extraInput: { resolution: '768P', prompt_expansion_mode: 'disabled' },
  },
  'minimax-h3-1080': {
    falId: 'minimax/h3-max/text-to-video',
    imageFalId: 'minimax/h3-max/image-to-video',
    endFrame: true,
    creditsPerSecond: 3,
    durationParam: { 5: 5, 10: 10, 15: 15 },
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    aspectIgnoredWithImage: true,
    // 1080P is a latent refinement of a native 768P render, not a native one.
    extraInput: { resolution: '1080P', prompt_expansion_mode: 'disabled' },
  },
  'veo-3.1': {
    falId: 'fal-ai/veo3.1/fast/text-to-video',
    imageFalId: 'fal-ai/veo3.1/fast/image-to-video',   // VERIFY on fal
    creditsPerSecond: 4,
    durationParam: { 4: '4s', 6: '6s', 8: '8s' },
    aspectRatios: ['16:9', '9:16'],
    // fal defaults generate_audio to true, and native audio is the reason to
    // pick Veo — stated here so a change to their default can't silence it.
    extraInput: { generate_audio: true },
  },
};

// Models that can take Vault reference photos, and how. Wan is absent on
// purpose: its references must be videos, not photos. Kling uses its O3
// reference model, which takes each Vault entry as an "element".
// maxRefs counts everything sent as a reference, the location plate included.
// Seedance 2.5 accepts up to 50; the lower figure here keeps the prompt that
// names them readable. Kling's elements and Veo's reference mode are narrower.
const REF_MODELS = {
  'seedance-2.0': { falId: 'bytedance/seedance-2.0/fast/reference-to-video', named: true, maxRefs: 9 },
  'seedance-2.0-480': { falId: 'bytedance/seedance-2.0/fast/reference-to-video', named: true, maxRefs: 9 },
  'seedance-2.5': { falId: 'bytedance/seedance-2.5/reference-to-video', named: true, maxRefs: 12, bracketRefs: true },
  'seedance-2.5-480': { falId: 'bytedance/seedance-2.5/reference-to-video', named: true, maxRefs: 12, bracketRefs: true },
  'veo-3.1': { falId: 'fal-ai/veo3.1/fast/reference-to-video', named: false, seconds: 8, maxRefs: 3 },
  'kling-3.0': { falId: 'fal-ai/kling-video/o3/standard/reference-to-video', named: true, mode: 'elements', extra: { generate_audio: true }, maxRefs: 4 },
  // MiniMax names references "Image 1" in plain words, puts them in
  // reference_image_urls rather than image_urls, and — alone in this table —
  // will hold a reference set AND open on an exact first frame. Everywhere
  // else those two are alternatives, so chaining a shot costs you the faces.
  'minimax-h3-480': { falId: 'minimax/h3-max/reference-to-video', named: true, plainRefs: true, refsParam: 'reference_image_urls', startFrameWithRefs: true, maxRefs: 9 },
  'minimax-h3':     { falId: 'minimax/h3-max/reference-to-video', named: true, plainRefs: true, refsParam: 'reference_image_urls', startFrameWithRefs: true, maxRefs: 9 },
  'minimax-h3-1080':{ falId: 'minimax/h3-max/reference-to-video', named: true, plainRefs: true, refsParam: 'reference_image_urls', startFrameWithRefs: true, maxRefs: 9 },
};

/*
  What fal actually objected to, as one readable line.

  fal reports a rejected submission as a 422 with body.detail — a list of
  { loc, msg } — and a failed job through the webhook as an error that may be
  a string, an object or that same list. Collapsing any of those to a fixed
  sentence is how a failure becomes a mystery, so this flattens whatever shape
  turns up. Exported because the webhook needs the same treatment.
*/
export function falErrorText(err) {
  const pick = (d) => {
    if (!d) return "";
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d.map((e) => {
        if (typeof e === "string") return e;
        const field = Array.isArray(e?.loc) ? e.loc.filter((x) => x !== "body").join(".") : "";
        return (field ? field + ": " : "") + String(e?.msg ?? e?.message ?? JSON.stringify(e));
      }).join("; ");
    }
    if (typeof d === "object") return String(d.msg ?? d.message ?? d.error ?? JSON.stringify(d));
    return String(d);
  };
  const useful = (v) => (v && v !== "{}" && v !== "[]" ? v : "");
  const text = useful(pick(err?.body?.detail)) || useful(pick(err?.detail))
    || useful(pick(err?.body)) || String(err?.message ?? "") || useful(pick(err));
  // Signed reference URLs carry credentials in the query string. They are long,
  // useless to read and must not be parked in a row the client reads back.
  return text.replace(/https?:\/\/\S+/g, "[url]").trim().slice(0, 300);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Verify the caller from their session token
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    // 2. Validate input
    const { prompt, model, duration, imageUrl, endImageUrl, aspectRatio, projectId, filmSpecId, filmSpecVersion, vaultRefIds, coverageSlotId, promotedFrom, locationUrl, locationName } = req.body;
    const pid = typeof projectId === "string" ? projectId : null;

    // Normalise a prompt so trivial edits still count as the same shot.
    const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    // Rough similarity on word overlap — good enough to group takes, and a
    // manual override exists on the takes page when it guesses wrong.
    const similar = (a, b) => {
      const A = new Set(norm(a).split(" ").filter((w) => w.length > 3));
      const B = new Set(norm(b).split(" ").filter((w) => w.length > 3));
      if (A.size === 0 || B.size === 0) return false;
      let shared = 0;
      for (const w of A) if (B.has(w)) shared++;
      return shared / Math.max(A.size, B.size) >= 0.8;
    };
    const selected = MODELS[model];
    if (!selected) return res.status(400).json({ error: 'Unknown model' });

    /*
      A closing frame. The Frame Planner has always described the frame a shot
      ends on and EndFrame.jsx has always been able to save one; this is where
      it finally reaches the generator, so the shot lands on that frame
      instead of somewhere near it.

      Refused rather than silently dropped on a model that cannot do it: a
      creator who asked for an exact ending and got an approximate one would
      have no way of knowing why.
    */
    const wantsEnd = typeof endImageUrl === 'string' && /^https?:\/\//.test(endImageUrl);
    if (wantsEnd && !selected.endFrame) {
      return res.status(400).json({
        error: 'That model cannot land on a closing frame. Switch to a MiniMax tier, which can, or remove the closing frame.',
      });
    }
    if (imageUrl && !selected.imageFalId) {
      return res.status(400).json({ error: 'That model does not support image input' });
    }
    const seconds = Number(duration) || 5;
    if (!selected.durationParam[seconds]) {
      return res.status(400).json({ error: 'Invalid duration' });
    }
    const ratio = aspectRatio || '16:9';
    if (!(selected.aspectRatios || ['16:9']).includes(ratio)) {
      return res.status(400).json({ error: 'That model does not support that aspect ratio' });
    }
    const cost = selected.creditsPerSecond * seconds;
    if (!prompt || !prompt.trim() || prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt is required (max 2000 characters)' });
    }

    // 2b. Vault reference photos — resolved before any credits are spent, so a
    //     failed lookup never charges anyone.
    
    // Keep a slot for the location plate when one is coming, so a scene with
    // several characters doesn't quietly lose its room.
    const refModel = REF_MODELS[model];
    // Opening on an exact frame used to mean losing the reference set. On a
    // model that takes both, a chained shot keeps its faces.
    const refsAllowed = !!refModel && (!imageUrl || !!refModel.startFrameWithRefs);
    const refCap = Math.max(1, (refModel?.maxRefs ?? 3) - (refsAllowed && typeof locationUrl === "string" ? 1 : 0));
    const wantedRefs = Array.isArray(vaultRefIds) ? vaultRefIds.filter((x) => typeof x === "string").slice(0, refCap) : [];
    const refs = [];
    if (refsAllowed && wantedRefs.length) {
      if (refModel.seconds && seconds !== refModel.seconds) {
        return res.status(400).json({ error: `With reference photos, this model makes ${refModel.seconds}-second clips.` });
      }
      const { data: rows } = await supabase
        .from("vault_entries")
        .select("id, name, kind, images")
        .eq("user_id", user.id)
        .in("id", wantedRefs);
      const ordered = (rows ?? []).sort((a, b) => wantedRefs.indexOf(a.id) - wantedRefs.indexOf(b.id));
      const host = req.headers["x-forwarded-host"] || req.headers.host || "www.revaultai.com";
      for (const row of ordered) {
        if (!Array.isArray(row.images) || !row.images.length) continue;
        try {
          const r = await fetch(`https://${host}/api/get-video-url`, {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "vault", id: row.id }),
          });
          const j = await r.json().catch(() => ({}));
          const url = r.ok && Array.isArray(j.urls) ? j.urls[0] : null;
          if (url) refs.push({ id: row.id, name: row.name, kind: row.kind, url, urls: j.urls.slice(0, 3) });
        } catch { /* skip this one */ }
      }
      if (!refs.length) {
        return res.status(400).json({ error: "Couldn't load your Vault photos. Try again, or generate without them." });
      }
    }
    // A plate of the rehearsal set, so every angle of every shot is the same
    // room rather than one rebuilt from words each time.
    // The set plate goes to fal's own storage: a private R2 link is one fal
    // can't fetch, which is what a 422 from the model actually means.
    if (refsAllowed && typeof locationUrl === "string" && /^https:\/\//.test(locationUrl)) {
      try {
        const plateUrl = locationUrl;
        if (plateUrl) {
          refs.push({
            id: null,
            name: String(locationName || "the location").slice(0, 60),
            kind: "location",
            url: plateUrl,
            urls: [plateUrl],
          });
        }
      } catch (e) {
        console.warn("location plate upload failed:", e.message);
      }
      // Veo takes a short list; keep the location and trim the rest.
      while (refModel.seconds && refs.length > 3) refs.splice(refs.length - 2, 1);
    }

    // Seedance reads references by name; Veo just takes the images.
    const refPrompt = refs.length && refModel.named
      ? `${prompt.trim()}\n\n${refs.map((r, i) => {
          // Seedance 2.5 indexes references as [Image1]; 2.0 and Kling use @;
          // MiniMax wants them in plain words, as "Image 1".
          const label = refModel.mode === "elements" ? "Element" : "Image";
          const token = refModel.plainRefs ? `${label} ${i + 1}`
            : refModel.bracketRefs ? `[${label}${i + 1}]`
            : `@${label}${i + 1}`;
          return `${token} is ${r.name}${r.kind === "location" ? ", the location" : r.kind === "prop" ? ", a prop" : ""}.`;
        }).join(" ")}`
      : prompt.trim();

    // 3. Deduct credits atomically — fails cleanly if balance is short
    const { data: paid, error: spendError } = await supabase.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: cost,
      p_reason: 'generation',
    });
    if (spendError) throw spendError;
    if (!paid) {
      return res.status(402).json({ error: 'Not enough credits' });
    }

    // 4. Record the generation
    const { data: gen, error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        prompt: prompt.trim(),
        model,
        status: 'queued',
        credits_spent: cost,
        duration_seconds: seconds,
        project_id: pid,
        film_spec_id: typeof filmSpecId === "string" ? filmSpecId : null,
        film_spec_version: Number(filmSpecVersion) || null,
        vault_ref_ids: refs.some((r) => r.id) ? refs.filter((r) => r.id).map((r) => r.id) : null,
        coverage_slot_id: typeof coverageSlotId === "string" ? coverageSlotId : null,
        aspect_ratio: ratio,
        promoted_from: typeof promotedFrom === "string" ? promotedFrom : null,
      })
      .select()
      .single();
    if (insertError) {
      // Saving failed after credits were taken — give them back before failing.
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_reason: 'refund',
        p_session_id: null,
      });
      throw insertError;
    }

    // 4b. Group this generation into a shot. A near-identical prompt from the
    //     last 24 hours joins that shot; anything else starts a new one.
    try {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("shots")
        .select("id, prompt")
        .eq("user_id", user.id)
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: false })
        .limit(15);

      let shotId = (recent ?? []).find((s) => similar(s.prompt, prompt))?.id ?? null;

      if (!shotId) {
        const words = prompt.trim().split(/\s+/).slice(0, 6).join(" ");
        const { data: newShot } = await supabase
          .from("shots")
          .insert({
            user_id: user.id,
            name: words.slice(0, 120),
            prompt: prompt.trim().slice(0, 2000),
            project_id: pid,
          })
          .select("id")
          .single();
        shotId = newShot?.id ?? null;
      }

      if (shotId) await supabase.from("generations").update({ shot_id: shotId }).eq("id", gen.id);
    } catch (groupErr) {
      // Grouping is a convenience — never fail a generation over it.
      console.warn("shot grouping failed:", groupErr.message);
    }

    // 5. Submit the job to fal, with our webhook for completion
    let startFrame = imageUrl;
    if (imageUrl) {
      try {
        startFrame = await signForFal(imageUrl);
      } catch (e) {
        console.error('could not sign the start frame:', e.message);
      }
    }
    let endFrame = wantsEnd ? endImageUrl : null;
    if (endFrame) {
      try {
        endFrame = await signForFal(endFrame);
      } catch (e) {
        console.error('could not sign the end frame:', e.message);
      }
    }

    /*
      Which route. image_url is optional on the image-to-video endpoint, and
      end_image_url "may be provided alone for end-only keyframe generation",
      so a closing frame on its own belongs on that route rather than on
      text-to-video, which has no such field.
    */
    const usingImageRoute = !!(imageUrl || endFrame);
    try {
      const { request_id } = await fal.queue.submit(
        refs.length ? refModel.falId : usingImageRoute ? selected.imageFalId : selected.falId,
        {
        input: {
          prompt: refPrompt,
          duration: selected.durationParam[seconds],
          ...(usingImageRoute && selected.aspectIgnoredWithImage ? {} : { aspect_ratio: ratio }),
          ...(imageUrl ? { image_url: startFrame } : {}),
          ...(endFrame ? { end_image_url: endFrame } : {}),
          ...(refs.length && refModel.mode !== "elements"
            ? { [refModel.refsParam || "image_urls"]: refs.map((r) => r.url) }
            : {}),
          ...(refs.length && refModel.mode === "elements" ? { elements: refs.map((r) => ({ frontal_image_url: r.urls[0], reference_image_urls: r.urls.length > 1 ? r.urls.slice(1) : [r.urls[0]] })) } : {}),
          ...(refs.length && refModel.extra ? refModel.extra : {}),
          ...(selected.extraInput || {}),
        },
        webhookUrl: 'https://www.revaultai.com/api/generation-webhook',
      });

      await supabase
        .from('generations')
        .update({ fal_request_id: request_id, status: 'processing' })
        .eq('id', gen.id);

      return res.status(200).json({ generationId: gen.id });
    } catch (falError) {
      // fal rejected the job — refund and mark failed
      console.error('fal submit error:', falError, JSON.stringify(falError?.body ?? null));
      const detail = falErrorText(falError);
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_reason: 'refund',
        p_session_id: null,
      });
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_message: detail
            ? 'Rejected by the generation service — ' + detail
            : 'Generation service rejected the job',
        })
        .eq('id', gen.id);
      return res.status(502).json({ error: 'Generation failed to start — credits refunded' });
    }
  } catch (err) {
    console.error('generate-video error:', err);
    return res.status(500).json({ error: 'Could not start generation' });
  }
}