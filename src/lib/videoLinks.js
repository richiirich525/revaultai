/*
  videoLinks — RevaultAI
  Reading YouTube and Vimeo links, and the thumbnail URL for a YouTube id.
  Shared by the cards that show a film and by the submission form that
  accepts a link to one.
*/

export function youtubeThumb(id, res = "maxresdefault") {
  return `https://i.ytimg.com/vi/${id}/${res}.jpg`;
}

export function parseVimeoUrl(raw) {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/^\d{6,12}$/.test(v)) return { id: v, hash: null };
  const m = v.match(/vimeo\.com\/(?:video\/)?(\d{6,12})(?:[/?]h=|\/)?([A-Za-z0-9]+)?/);
  if (!m) return null;
  return { id: m[1], hash: m[2] && m[2].length >= 6 ? m[2] : null };
}

export async function fetchVimeoThumb(id, hash) {
  try {
    const target = `https://vimeo.com/${id}${hash ? "/" + hash : ""}`;
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(target)}&width=1280`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.thumbnail_url || null;
  } catch { return null; }
}

export function parseYouTubeId(raw) {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
