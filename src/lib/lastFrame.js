import { supabase } from "./supabase.js";
import { freshGenerationUrl } from "./videoUrls.js";

/*
  lastFrame — RevaultAI

  The last frame of a finished take, captured without anybody scrubbing to it.

  Two places already grab a frame from a clip: the chain scrubber on Generate
  and the End Frame panel on Takes. Both do it from a player the creator is
  looking at, at a moment they chose. A Part 2 needs the same thing with no
  player and no choosing, so this loads the clip into a video element that is
  never shown, seeks to just before the end, and uploads what it finds.

  Returns the stored R2 address — the same carrier form end_frame_url holds —
  which generate-video signs before the model sees it.

  Just before the end rather than the end itself: seeking to the exact
  duration lands past the final frame in some browsers and draws black.
*/

const BEFORE_END = 0.08;
const PATIENCE_MS = 20000;

function once(target, event, failMessage) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(failMessage)), PATIENCE_MS);
    target.addEventListener(event, () => { clearTimeout(timer); resolve(); }, { once: true });
    target.addEventListener("error", () => { clearTimeout(timer); reject(new Error(failMessage)); }, { once: true });
  });
}

export async function captureLastFrame(generationId) {
  const src = await freshGenerationUrl(generationId);

  const video = document.createElement("video");
  // Without this the canvas is tainted and toBlob refuses to hand the frame over.
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const loaded = once(video, "loadedmetadata", "Couldn't open that clip.");
  video.src = src;
  await loaded;

  const length = video.duration;
  if (!length || !isFinite(length)) throw new Error("Couldn't read how long that clip is.");
  const at = Math.max(0, length - BEFORE_END);

  const sought = once(video, "seeked", "Couldn't reach the end of that clip.");
  video.currentTime = at;
  await sought;
  // A seek can finish before there is a picture to draw.
  if (video.readyState < 2) await once(video, "loadeddata", "Couldn't read the last frame.");

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  if (!canvas.width || !canvas.height) throw new Error("Couldn't read the last frame.");
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't capture the last frame."))), "image/jpeg", 0.92);
    } catch {
      reject(new Error("That clip can't be read into a frame."));
    }
  });

  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  const r = await fetch("/api/get-upload-url", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ fileType: "image/jpeg" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.uploadUrl) throw new Error(j.error || "Couldn't start the upload.");

  const put = await fetch(j.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
  if (!put.ok) throw new Error("The upload was refused.");

  video.removeAttribute("src");
  video.load();

  return { url: j.videoPublicUrl, at: Math.round(at * 100) / 100 };
}
