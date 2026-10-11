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

// What to show a viewer when a clip can't be prepared. A failure has to look
// different from a pending request: identical spinners are why a dead endpoint
// reads as slowness.
function reasonFor(status) {
  if (status === 404) return "Playback unavailable here";
  if (status === 401 || status === 403) return "Not authorized to play this";
  return "Couldn't prepare playback";
}

/**
 * @param ids generation ids
 * @returns { urls: { [id]: signedUrl }, failed: { [id]: reason } }
 */
export async function signGenerationUrls(ids, { signal } = {}) {
  const urls = {};
  const failed = {};
  const list = [...new Set(ids)].filter(Boolean);
  if (list.length === 0) return { urls, failed };

  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  if (!token) {
    for (const id of list) failed[id] = "Sign in to play this";
    return { urls, failed };
  }

  for (let i = 0; i < list.length; i += PER_CALL) {
    const chunk = list.slice(i, i + PER_CALL);
    try {
      const r = await fetch("/api/get-video-url", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generations", ids: chunk }),
        signal,
      });
      if (!r.ok) {
        if (r.status === 404) {
          console.warn(
            "[RevaultAI] /api/get-video-url returned 404. API routes run on Vercel, " +
            "not the Vite dev server — use a preview deployment to exercise them."
          );
        }
        const why = reasonFor(r.status);
        for (const id of chunk) failed[id] = why;
        continue;
      }
      const j = await r.json().catch(() => ({}));
      const got = j.urls ?? {};
      Object.assign(urls, got);
      // Asked for but not returned: the row is gone, or not this user's.
      for (const id of chunk) if (!got[id]) failed[id] = "Clip not found";
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      for (const id of chunk) failed[id] = "Couldn't reach the server";
    }
  }
  return { urls, failed };
}

// Links last 15 minutes. Re-sign a little early so a clip someone scrolls
// back to still plays.
export const URL_FRESH_MS = 12 * 60 * 1000;

/**
 * A link signed right now, for an action that is about to read the file.
 *
 * Anything that samples frames or downloads a clip should use this rather than
 * a url the page signed earlier: a page open longer than 15 minutes is holding
 * dead links, and the failure looks like a broken feature rather than an
 * expired link.
 *
 * @throws the reason, so the caller can show it
 */
export async function freshGenerationUrl(id, { signal } = {}) {
  const { urls, failed } = await signGenerationUrls([id], { signal });
  if (urls[id]) return urls[id];
  throw new Error(failed[id] || "Couldn't prepare playback");
}
