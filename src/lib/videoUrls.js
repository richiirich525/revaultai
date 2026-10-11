/*
  videoUrls — RevaultAI
  Signs playback links for generated clips in batches.

  The session token is read once per batch rather than once per clip:
  supabase-js serializes session access behind a lock, so asking thirty times
  in parallel makes thirty callers queue instead of thirty requests fly.
*/

import { supabase } from "./supabase.js";

// Matches MAX_BATCH in api/get-video-url.js.
const PER_CALL = 50;

/**
 * @param ids generation ids
 * @returns { [id]: signedUrl } — ids that failed are simply absent
 */
export async function signGenerationUrls(ids, { signal } = {}) {
  const list = [...new Set(ids)].filter(Boolean);
  if (list.length === 0) return {};

  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  if (!token) return {};

  const urls = {};
  for (let i = 0; i < list.length; i += PER_CALL) {
    const chunk = list.slice(i, i + PER_CALL);
    try {
      const r = await fetch("/api/get-video-url", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generations", ids: chunk }),
        signal,
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.urls) Object.assign(urls, j.urls);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      // Best effort: a chunk that fails just leaves those clips unsigned.
    }
  }
  return urls;
}

// Links last 15 minutes. Re-sign a little early so a clip someone scrolls
// back to still plays.
export const URL_FRESH_MS = 12 * 60 * 1000;
