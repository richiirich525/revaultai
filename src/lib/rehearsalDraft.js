/*
  rehearsalDraft — RevaultAI

  The Rehearsal Studio needs no account, which until now meant a refresh threw
  the work away. This keeps the current rehearsal in the browser so it comes
  back; an account is still what makes it permanent and reachable from another
  machine.

  localStorage is per-browser and can be missing or refused outright — private
  windows, blocked site data, storage full — so every call here is wrapped and
  every failure is silent. A draft that cannot be written is a lost
  convenience, never a broken page.
*/

const KEY = "revaultai.rehearsal.draft.v1";
// A rehearsal carrying a dressed set can get big, and a quota error on every
// keystroke is worse than not saving. Past this it is the account's job.
const MAX_BYTES = 900_000;

export function saveDraft(rehearsal) {
  if (!rehearsal) return false;
  try {
    const body = JSON.stringify({ at: Date.now(), rehearsal });
    if (body.length > MAX_BYTES) return false;
    window.localStorage.setItem(KEY, body);
    return true;
  } catch {
    return false;
  }
}

export function loadDraft() {
  try {
    const body = window.localStorage.getItem(KEY);
    if (!body) return null;
    const parsed = JSON.parse(body);
    const r = parsed?.rehearsal;
    // Anything that is not a rehearsal shape is treated as absent rather than
    // handed to the studio, which would then render nothing.
    if (!r || !Array.isArray(r.actors) || !Array.isArray(r.cameras)) return null;
    if (!r.actors.length || !r.cameras.length) return null;
    return { rehearsal: r, at: Number(parsed.at) || null };
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
