import { fal } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";
import {
  VOICE_MODELS,
  DEFAULT_VOICE_MODEL,
  buildScript,
  buildScriptFromDialogue,
  costOf,
} from "../src/lib/voiceModels.js";
import { falErrorText, signForFal } from "./generate-video.js";

/*
  record-scene — RevaultAI

  The recording studio. Takes a scene's dialogue and reads it back in the
  characters' own voices.

  Two things here are deliberate and worth knowing before changing anything:

  1. VOICES ARE RESOLVED SERVER SIDE, FROM THE VAULT.
     The client sends dialogue, never a voice. If it could send a voice it
     could send any `audio_url` it liked and have fal fetch it, which is a
     request-forgery hole with a credit charge attached. So the only voices
     reachable are the ones on this creator's own Vault characters.

  2. A VAULT VOICE SAMPLE IS SIGNED BEFORE IT GOES OUT.
     Sample URLs are stored as R2_PUBLIC_URL links, which is how this app
     records where an object lives, not a link anyone can fetch — the bucket
     is private. fal has to fetch it from outside, so it gets a presigned URL.
     Handing over the stored form hands fal a 403, which is exactly how start
     frames were broken on every model until recently.
*/

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Not signed in" });
    const { data: { user } = {} } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Not signed in" });

    const { dialogue, characters, projectId, model } = req.body || {};
    const modelKey = typeof model === "string" && VOICE_MODELS[model] ? model : DEFAULT_VOICE_MODEL;
    const selected = VOICE_MODELS[modelKey];

    /*
      The Vault supplies the voices. Matched on name, case-insensitively,
      because a creator writes "RUTH:" in dialogue and "Ruth" in the Vault.
    */
    const { data: vaultRows } = await supabase
      .from("vault_entries")
      .select("name, voice_preset, voice_sample_url")
      .eq("user_id", user.id)
      .eq("kind", "character");

    const byName = new Map();
    for (const row of vaultRows ?? []) {
      const key = String(row.name ?? "").trim().toLowerCase();
      if (key) byName.set(key, row);
    }
    const voiceFor = (name) => {
      const row = byName.get(String(name ?? "").trim().toLowerCase());
      if (!row) return null;
      if (row.voice_sample_url) return { audio_url: row.voice_sample_url };
      if (row.voice_preset) return { preset: row.voice_preset };
      return null;
    };

    /*
      The creator's own dialogue wins when both arrive: it carries the order
      the scene is spoken in, which the blocking result cannot, because that
      groups lines by character. See src/lib/voiceModels.js.
    */
    const built = typeof dialogue === "string" && dialogue.trim()
      ? buildScriptFromDialogue(dialogue, voiceFor, modelKey)
      : buildScript(characters, voiceFor, modelKey);
    if (built.error) return res.status(400).json({ error: built.error });

    // Which names got a real voice, so the page can say who is being read by
    // a stand-in rather than leaving it a surprise in the audio.
    const cast = built.names.map((name) => {
      const row = byName.get(String(name).trim().toLowerCase());
      return {
        name,
        voice: row?.voice_sample_url ? "a sample of your own" : (row?.voice_preset ?? null),
        fromVault: !!row,
      };
    });

    const cost = costOf(built.chars, modelKey);

    // Sign any Vault sample so fal can actually fetch it. A preset needs none.
    const speakers = [];
    for (const sp of built.speakers) {
      if (sp.audio_url) {
        try {
          speakers.push({ audio_url: await signForFal(sp.audio_url) });
          continue;
        } catch (e) {
          console.error("could not sign a voice sample:", e.message);
          // A sample we cannot sign is one fal cannot fetch. Fall back to a
          // preset rather than failing the whole read for one voice.
          speakers.push({ preset: selected.defaultPreset });
          continue;
        }
      }
      speakers.push(sp);
    }

    const { data: paid, error: spendError } = await supabase.rpc("spend_credits", {
      p_user_id: user.id,
      p_amount: cost,
      p_reason: "scene read",
    });
    if (spendError) throw spendError;
    if (!paid) return res.status(402).json({ error: "Not enough credits" });

    const refund = async () => {
      await supabase.rpc("add_credits", {
        p_user_id: user.id,
        p_amount: cost,
        p_reason: "refund",
        p_session_id: null,
      });
    };

    const { data: take, error: insertError } = await supabase
      .from("voice_takes")
      .insert({
        user_id: user.id,
        project_id: typeof projectId === "string" ? projectId : null,
        model: modelKey,
        script: built.script,
        speaker_names: built.names,
        line_count: built.lineCount,
        chars: built.chars,
        credits_spent: cost,
        status: "queued",
      })
      .select()
      .single();
    if (insertError) {
      await refund();
      throw insertError;
    }

    try {
      const { request_id } = await fal.queue.submit(selected.falId, {
        input: { script: built.script, speakers },
        webhookUrl: "https://www.revaultai.com/api/voice-webhook",
      });
      await supabase
        .from("voice_takes")
        .update({ fal_request_id: request_id, status: "processing" })
        .eq("id", take.id);

      return res.status(200).json({
        takeId: take.id,
        cost,
        cast,
        lineCount: built.lineCount,
        chars: built.chars,
      });
    } catch (falError) {
      console.error("fal voice submit error:", falError, JSON.stringify(falError?.body ?? null));
      const detail = falErrorText(falError);
      await refund();
      await supabase
        .from("voice_takes")
        .update({
          status: "failed",
          error_message: detail
            ? "Rejected by the voice service — " + detail
            : "The voice service rejected the read.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", take.id);
      return res.status(502).json({ error: "The read failed to start — credits refunded" });
    }
  } catch (err) {
    console.error("record-scene error:", err);
    return res.status(500).json({ error: "Could not start the read" });
  }
}
