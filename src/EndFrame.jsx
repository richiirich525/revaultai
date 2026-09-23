import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  EndFrame — RevaultAI
  Keeps the frame a shot actually ends on. Drift is usually worst in the last
  instant, so the creator scrubs the closing seconds and picks the moment
  rather than taking the final frame blind. The saved frame gives the next
  shot a real starting point, and gives continuity checks a picture to
  compare against instead of a sentence.
*/

const mono = { fontFamily: "'DM Mono', monospace" };
const btn = {
  background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
  padding: "6px 12px", ...mono, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer",
};

export default function EndFrame({ generation, videoUrl, notify, setGenPrefill, setPage }) {
  const [saved, setSaved] = useState(generation.end_frame_url ?? null);
  const [savedAt, setSavedAt] = useState(generation.end_frame_at ?? null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [t, setT] = useState(null);
  const [duration, setDuration] = useState(0);
  const video = useRef(null);

  // Park the player near the end, where the closing frame lives.
  useEffect(() => {
    if (!open || !video.current) return;
    const v = video.current;
    const onMeta = () => {
      const d = v.duration || 0;
      if (!d || !isFinite(d)) return;
      setDuration(d);
      const start = Math.max(0, d - 0.15);
      setT(start);
      v.currentTime = start;
    };
    v.addEventListener("loadedmetadata", onMeta, { once: true });
    if (v.readyState >= 1) onMeta();
  }, [open]);

  function scrub(value) {
    setT(value);
    if (video.current) video.current.currentTime = value;
  }

  async function capture() {
    const v = video.current;
    if (!v) return;
    setBusy(true);
    try {
      const scale = Math.min(1, 1280 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
      const c = document.createElement("canvas");
      c.width = Math.round((v.videoWidth || 1280) * scale);
      c.height = Math.round((v.videoHeight || 720) * scale);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.9));
      if (!blob) throw new Error("Couldn't read that frame.");

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

      const at = Math.round((t ?? 0) * 100) / 100;
      const { error } = await supabase
        .from("generations")
        .update({ end_frame_url: j.videoPublicUrl, end_frame_at: at })
        .eq("id", generation.id);
      if (error) throw new Error(error.message);

      setSaved(j.videoPublicUrl);
      setSavedAt(at);
      setOpen(false);
      notify?.(`Closing frame saved at ${at.toFixed(2)}s.`);
    } catch (e) {
      notify?.(e.message || "Couldn't save that frame.");
    }
    setBusy(false);
  }

  function useAsStart() {
    setGenPrefill?.({ prompt: generation.prompt || "", imageUrl: saved });
    setPage?.("generate");
    notify?.("Loaded as the starting frame for your next shot.");
  }

  if (!videoUrl) return null;

  if (saved && !open) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <img src={saved} alt="" style={{ width: 84, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 3, border: "1px solid var(--border)" }} />
        <div style={{ ...mono, fontSize: 10, color: "var(--muted)", lineHeight: 1.7 }}>
          Ends at {Number(savedAt ?? 0).toFixed(2)}s
        </div>
        {setGenPrefill && <button style={btn} onClick={useAsStart}>Start the next shot here →</button>}
        <button style={btn} onClick={() => setOpen(true)}>Choose another frame</button>
      </div>
    );
  }

  if (!open) {
    return <button style={{ ...btn, marginTop: 10 }} onClick={() => setOpen(true)}>Save the closing frame</button>;
  }

  return (
    <div style={{ border: "1px solid var(--accent)", borderRadius: 6, padding: "12px 14px", marginTop: 10, background: "var(--bg3)" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
        Closing frame
      </div>
      <video ref={video} src={videoUrl} crossOrigin="anonymous" playsInline preload="auto" muted
        style={{ width: "100%", maxWidth: 420, borderRadius: 4, background: "#000", display: "block" }} />
      <div style={{ ...mono, fontSize: 10, color: "var(--muted)", lineHeight: 1.7, margin: "10px 0 6px" }}>
        Scrub the last seconds and stop where the shot should end. The final instant is often where a face or a hand has drifted furthest, so it's rarely the best choice.
      </div>
      {duration > 0 && (
        <input
          type="range"
          min={Math.max(0, duration - 3)}
          max={duration}
          step={0.02}
          value={t ?? duration}
          onChange={(e) => scrub(Number(e.target.value))}
          style={{ width: "100%", maxWidth: 420, accentColor: "var(--accent)" }}
        />
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button style={{ ...btn, borderColor: "var(--accent)", color: "var(--accent)" }} onClick={capture} disabled={busy}>
          {busy ? "Saving…" : `Save this frame (${Number(t ?? 0).toFixed(2)}s)`}
        </button>
        <button style={btn} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}