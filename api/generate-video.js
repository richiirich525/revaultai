import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';

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
    imageFalId: 'bytedance/seedance-2.0/fast/image-to-video',
    creditsPerSecond: 6,
    durationParam: { 5: '5', 10: '10', 15: '15' },
    extraInput: { resolution: '720p' },
  },
  'seedance-2.0-480': {
    falId: 'bytedance/seedance-2.0/fast/text-to-video',
    imageFalId: 'bytedance/seedance-2.0/fast/image-to-video',
    creditsPerSecond: 3,
    durationParam: { 5: '5', 10: '10', 15: '15' },
    extraInput: { resolution: '480p' },
  },
  'seedance-2.5': {
    falId: 'bytedance/seedance-2.5/text-to-video',
    imageFalId: 'bytedance/seedance-2.5/image-to-video',
    creditsPerSecond: 12,
    durationParam: { 5: '5', 10: '10', 15: '15', 30: '30' },
    extraInput: { resolution: '720p', generate_audio: true },
  },
  'seedance-2.5-480': {
    falId: 'bytedance/seedance-2.5/text-to-video',
    imageFalId: 'bytedance/seedance-2.5/image-to-video',
    creditsPerSecond: 6,
    durationParam: { 5: '5', 10: '10', 15: '15', 30: '30' },
    extraInput: { resolution: '480p', generate_audio: true },
  },
  'veo-3.1': {
    falId: 'fal-ai/veo3.1/fast/text-to-video',
    imageFalId: 'fal-ai/veo3.1/fast/image-to-video',   // VERIFY on fal
    creditsPerSecond: 4,
    durationParam: { 4: '4s', 6: '6s', 8: '8s' },
    aspectRatios: ['16:9', '9:16'],
  },
};

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
    const { prompt, model, duration, imageUrl, aspectRatio } = req.body;

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
      })
      .select()
      .single();
    if (insertError) throw insertError;

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
    try {
      const { request_id } = await fal.queue.submit(
        imageUrl ? selected.imageFalId : selected.falId,
        {
        input: {
          prompt: prompt.trim(),
          duration: selected.durationParam[seconds],
          ...(imageUrl && selected.aspectIgnoredWithImage ? {} : { aspect_ratio: ratio }),
          ...(imageUrl ? { image_url: imageUrl } : {}),
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
      console.error('fal submit error:', falError);
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_reason: 'refund',
        p_session_id: null,
      });
      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: 'Generation service rejected the job' })
        .eq('id', gen.id);
      return res.status(502).json({ error: 'Generation failed to start — credits refunded' });
    }
  } catch (err) {
    console.error('generate-video error:', err);
    return res.status(500).json({ error: 'Could not start generation' });
  }
}