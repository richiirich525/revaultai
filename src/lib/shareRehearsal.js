import { supabase } from "./supabase.js";
import { sanitize, tooBig } from "./shareSanitize.js";

/*
  shareRehearsal — RevaultAI

  The I/O half of sharing. Every rule about what a share may contain lives in
  shareSanitize.js, which this calls on the way out and again on the way in.

  See sql/2026-10-21-shared-rehearsals.sql for the table. Reading goes through
  a security-definer function keyed on the id, so shares cannot be listed.
*/

export { sanitize, tooBig };

/*
  Make a share. No account needed: without one the link works at once and
  expires in 30 days, and signing in keeps it instead.

  This goes through /api/share-rehearsal rather than inserting directly,
  because anonymous shares have to be metered and only the server can do that.
  The scene is sanitized here before sending and again on arrival — this half
  is a courtesy to the creator, that half is the rule.

  Returns { id, anonymous, expiresInDays }.
*/
export async function createShare(rehearsal) {
  const clean = sanitize(rehearsal);
  if (!clean) throw new Error("there is nothing in this rehearsal to share");
  if (tooBig(clean)) throw new Error("this scene is too big to share — try it without a dressed set");

  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  const r = await fetch("/api/share-rehearsal", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: JSON.stringify({ rehearsal: clean }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error || "could not make a link just now");
    e.needsAccount = !!j.needsAccount;
    throw e;
  }
  return { id: j.id, anonymous: !!j.anonymous, expiresInDays: j.expiresInDays ?? null };
}

/* Open one. No account needed, which is the point of the whole feature. */
export async function loadShare(id) {
  if (!/^[0-9a-fA-F-]{36}$/.test(String(id ?? ""))) return null;
  const { data, error } = await supabase.rpc("shared_rehearsal", { share_id: id });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.data) return null;
  // Sanitized again on the way in. The row could predate this code, or have
  // been written by somebody going around it.
  return sanitize(row.data);
}

export function shareUrl(id) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://www.revaultai.com";
  return `${base}/rehearsal?scene=${encodeURIComponent(id)}`;
}
