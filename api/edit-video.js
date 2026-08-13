import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';

// Post-generation edit catalog — server-side only, client sends an action key.
// Same shape as MODELS in generate-video.js so extend/lip-sync slot in later.
const EDITS = {
  'upscale-1080p': {
    falId: 'fal-ai/seedvr/upscale/video',
    creditsPerSecond: 2,   // ~$0.05/s cost at 1080p24 — see pricing note below
    extraInput: { upscale_mode: 'target', target_resolution: '1080p' },
    label: 'Upscale to 1080p',
  },
  'upscale-4k': {
    falId: 'fal-ai/seedvr/upscale/video',
    creditsPerSecond: 6,   // ~$0.20/s cost at 2160p24
    extraInput: { upscale_mode: 'target', target_resolution: '2160p' },
    label: 'Upscale to 4K',
  },
  'extend-5': {
    falId: 'fal-ai/ltx-2.3/extend-video',
    kind: 'extend',
    extendSeconds: 5,
    creditsPerSecond: 3,   // $0.10/s cost — priced on total output length
    extraInput: { mode: 'end' },
    label: 'Extend by 5s',
  },
  'extend-10': {
    falId: 'fal-ai/ltx-2.3/extend-video',
    kind: 'extend',
    extendSeconds: 10,
    creditsPerSecond: 3,
    extraInput: { mode: 'end' },
    label: 'Extend by 10s',
  },
};

// SeedVR2 bills $0.001 per megapixel of OUTPUT (width x height x frames).
// 1080p24 = 1920*1080*24 = ~49.8 MP/s  = ~$0.05/s
// 4K24    = 3840*2160*24 = ~199 MP/s   = ~$0.20/s
// Credits are priced to hold roughly the same margin as generation.

const DEFAULT_DURATION = 5; // fallback for rows created before duration_seconds existed

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Verify the caller
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    // 2. Validate input
    const { action, generationId } = req.body;
    const edit = EDITS[action];
    if (!edit) return res.status(400).json({ error: 'Unknown action' });
    if (!generationId) return res.status(400).json({ error: 'Missing generation' });

    // 3. Load the source clip and confirm ownership
    const { data: source, error: srcError } = await supabase
      .from('generations')
      .select('id, user_id, prompt, status, video_url, duration_seconds')
      .eq('id', generationId)
      .single();
    if (srcError || !source) return res.status(404).json({ error: 'Clip not found' });
    if (source.user_id !== user.id) return res.status(403).json({ error: 'Not your clip' });
    if (source.status !== 'complete' || !source.video_url) {
      return res.status(400).json({ error: 'That clip is not finished yet' });
    }

    const seconds = Number(source.duration_seconds) || DEFAULT_DURATION;
    const outputSeconds = edit.kind === 'extend' ? seconds + edit.extendSeconds : seconds;
    const cost = edit.creditsPerSecond * outputSeconds;

    // 4. Deduct credits atomically
    const { data: paid, error: spendError } = await supabase.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: cost,
      p_reason: 'edit',
    });
    if (spendError) throw spendError;
    if (!paid) return res.status(402).json({ error: 'Not enough credits' });

    // 5. Record the edit as its own generation row, so the existing webhook,
    //    playback, and gallery-submit flows handle it with no changes.
    const { data: gen, error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        prompt: `${edit.label} — ${source.prompt}`.slice(0, 2000),
        model: action,
        status: 'queued',
        credits_spent: cost,
        duration_seconds: outputSeconds,
        source_generation_id: source.id,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    // 6. Submit to fal
    try {
      const { request_id } = await fal.queue.submit(edit.falId, {
        input: edit.kind === 'extend'
          ? {
              video_url: source.video_url,
              duration: String(edit.extendSeconds),
              prompt: String(source.prompt || '').slice(0, 2000),
              ...(edit.extraInput || {}),
            }
          : {
              video_url: source.video_url,
              ...(edit.extraInput || {}),
            },
        webhookUrl: 'https://www.revaultai.com/api/generation-webhook',
      });

      await supabase
        .from('generations')
        .update({ fal_request_id: request_id, status: 'processing' })
        .eq('id', gen.id);

      return res.status(200).json({ generationId: gen.id });
    } catch (falError) {
      console.error('fal submit error (edit):', falError);
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_reason: 'refund',
        p_session_id: null,
      });
      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: 'Edit service rejected the job' })
        .eq('id', gen.id);
      return res.status(502).json({ error: 'Edit failed to start — credits refunded' });
    }
  } catch (err) {
    console.error('edit-video error:', err);
    return res.status(500).json({ error: 'Could not start edit' });
  }
}