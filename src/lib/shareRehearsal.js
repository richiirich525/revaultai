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

/* Make a share. Signed in only — see the note in the UI about why. */
export async function createShare(rehearsal, userId) {
  const clean = sanitize(rehearsal);
  if (!clean) throw new Error("there is nothing in this rehearsal to share");
  if (tooBig(clean)) throw new Error("this scene is too big to share — try it without a dressed set");
  const { data, error } = await supabase
    .from("shared_rehearsals")
    .insert({ user_id: userId, title: clean.title, data: clean })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
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
