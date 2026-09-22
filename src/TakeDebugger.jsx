import { useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  TakeDebugger — RevaultAI
  Samples frames from a finished generation in the browser and compares them
  against the intent the take was generated from. Stills only: it can see
  wardrobe, props, framing and light, not motion or audio — and it says so.
*/

const SEV = {
  error:   { color: "#F87171", mark: "\u2715", label: "Missed" },
  warning: { color: "#E5B769", mark: "\u26A0", label: "Drifted" },
  ok:      { color: "#4ADE80", mark: "\u2713", label: "Landed" },
};


const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Load a photo and shrink it — the model needs the face and the outfit, not pixels.
function loadImageData(url, max = 512) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const c = document.createElement("canvas");
        c.width = Math.round((img.naturalWidth || max) * scale);
        c.height = Math.round((img.naturalHeight || max) * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8).split(",")[1]);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Which Vault entries does this take involve? The shot's spec says exactly;
// without one, any character, prop or place named in the prompt. Up to three,
// one photo each. Best effort — the check still runs without them.
async function gatherRefs(generation) {
  try {
    const { data: entries } = await supabase
      .from("vault_entries")
      .select("id, name, kind, description, wardrobe, distinguishing, images, project_id");
    const withPhotos = (entries ?? []).filter((e) => e.kind !== "look" && Array.isArray(e.images) && e.images.length > 0);
    if (!withPhotos.length) return [];

    let chosen = [];
    // The photos this take was generated with, if any, are the ones to check.
    if (generation.vault_ref_ids?.length) chosen = withPhotos.filter((e) => generation.vault_ref_ids.includes(e.id));
    if (!chosen.length && generation.film_spec_id) {
      const { data: spec } = await supabase.from("film_specs").select("spec").eq("id", generation.film_spec_id).maybeSingle();
      const ids = spec?.spec?.subjects?.vaultIds ?? [];
      chosen = withPhotos.filter((e) => ids.includes(e.id));
    }
    if (!chosen.length) {
      const prompt = (generation.prompt || "").toLowerCase();
      chosen = withPhotos.filter((e) => {
        const n = (e.name || "").trim().toLowerCase();
        if (n.length < 2) return false;
        if (generation.project_id && e.project_id && e.project_id !== generation.project_id) return false;
        return new RegExp(`(^|[^a-z0-9])${escapeRe(n)}([^a-z0-9]|$)`).test(prompt);
      });
    }
    chosen = chosen.slice(0, 3);
    if (!chosen.length) return [];

    const { data: sess } = await supabase.auth.getSession();
    const out = [];
    for (const e of chosen) {
      const r = await fetch("/api/get-video-url", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "vault", id: e.id }),
      });
      const j = await r.json().catch(() => ({}));
      const url = r.ok && Array.isArray(j.urls) ? j.urls[0] : null;
      if (!url) continue;
      const data = await loadImageData(url);
      if (!data) continue;
      out.push({
        name: e.name,
        kind: e.kind,
        description: [e.description, e.wardrobe, e.distinguishing].filter(Boolean).join(" "),
        data,
      });
    }
    return out;
  } catch {
    return [];
  }
}

const styles = `
  .dbg { border: 1px solid var(--accent); border-radius: 6px; padding: 18px 20px; margin-top: 12px; background: var(--bg3); }
  .dbg-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
  .dbg-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .dbg-verdict { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.85; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border); }
  .dbg-find { padding: 12px 0; border-bottom: 1px solid var(--border); }
  .dbg-head { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; margin-bottom: 6px; }
  .dbg-sev { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; }
  .dbg-win { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.06em; }
  .dbg-pair { font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.8; }
  .dbg-pair span { color: var(--accent); }
  .dbg-repair { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text); line-height: 1.75; margin-top: 7px; opacity: 0.9; }
  .dbg-prompt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; margin-top: 10px; }
  .dbg-note { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); line-height: 1.7; margin-top: 12px; opacity: 0.75; }
`;

export default function TakeDebugger({ generation, videoUrl, notify, setGenPrefill, setPage }) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [report, setReport] = useState(generation.debug_report ?? null);
  const videoRef = useRef(null);

  // Pull evenly spaced stills out of the clip. Downscaled hard — the model
  // needs to see what changed, not pixel detail.
  async function sampleFrames(url, count = 8) {
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.src = url;
      videoRef.current = v;

      const frames = [];
      let i = 0;
      let times = [];

      v.addEventListener("error", () => reject(new Error("Couldn't load the clip for sampling.")));
      v.addEventListener("loadedmetadata", () => {
        const d = v.duration || 0;
        if (!d || !isFinite(d)) return reject(new Error("Couldn't read the clip's duration."));
        // Skip the very first and last instants — they're often black.
        times = Array.from({ length: count }, (_, n) => Math.min(d - 0.05, Math.max(0.05, (d * (n + 0.5)) / count)));
        v.currentTime = times[0];
      });

      v.addEventListener("seeked", () => {
        try {
          const scale = Math.min(1, 768 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
          const c = document.createElement("canvas");
          c.width = Math.round((v.videoWidth || 640) * scale);
          c.height = Math.round((v.videoHeight || 360) * scale);
          c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
          frames.push({ t: times[i], data: c.toDataURL("image/jpeg", 0.7).split(",")[1] });
        } catch {
          return reject(new Error("Couldn't read frames from this clip — the storage bucket needs GET allowed in its CORS policy."));
        }
        i++;
        setStage(`Sampling frame ${i} of ${count}…`);
        if (i < times.length) v.currentTime = times[i];
        else resolve(frames);
      });
    });
  }

  async function run(force = false) {
    if (!videoUrl) { notify?.("Still preparing playback — try again in a moment."); return; }
    setBusy(true); setStage("Loading the clip…");
    try {
      const frames = await sampleFrames(videoUrl, 8);
      setStage("Gathering your Vault photos…");
      const refs = await gatherRefs(generation);
      setStage(refs.length ? `Comparing against ${refs.length} Vault photo${refs.length === 1 ? "" : "s"}…` : "Reading the frames against your intent…");
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/debug-take", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: generation.id, frames, refs, force }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Could not analyse the take.");
      else setReport(j);
    } catch (err) {
      notify?.(err.message || "Could not analyse the take.");
    }
    setBusy(false); setStage("");
  }

  if (!report) {
    return (
      <button className="gen-button" onClick={run} disabled={busy}>
        {busy ? stage || "Working…" : "Debug this take"}
      </button>
    );
  }

  const counts = {
    error: report.findings.filter((f) => f.severity === "error").length,
    warning: report.findings.filter((f) => f.severity === "warning").length,
  };

  return (
    <div className="dbg">
      <style>{styles}</style>
      <div className="dbg-label">
        Intent vs. result
        {counts.error > 0 ? ` — ${counts.error} missed` : ""}
        {counts.warning > 0 ? `, ${counts.warning} drifted` : ""}
      </div>

      {report.verdict && <div className="dbg-verdict">{report.verdict}</div>}

      {report.findings.map((f, i) => {
        const s = SEV[f.severity] ?? SEV.warning;
        return (
          <div className="dbg-find" key={i}>
            <div className="dbg-head">
              <span className="dbg-sev" style={{ color: s.color }}>{s.mark} {s.label}</span>
              <span className="dbg-win">{f.category}{f.window ? ` · ${f.window}` : ""}{f.confidence !== "high" ? ` · ${f.confidence} confidence` : ""}</span>
            </div>
            {f.requested && <div className="dbg-pair"><span>Asked for:</span> {f.requested}</div>}
            <div className="dbg-pair"><span>Got:</span> {f.observed}</div>
            {f.cause && <div className="dbg-body" style={{ fontSize: 10, marginTop: 5 }}>{f.cause}</div>}
            {f.repair && <div className="dbg-repair"><strong style={{ color: "var(--accent)" }}>Fix:</strong> {f.repair}</div>}
          </div>
        );
      })}

      {report.repairPrompt && (
        <>
          <div className="dbg-label" style={{ marginTop: 16 }}>Repaired prompt — same shot</div>
          <div className="dbg-prompt">{report.repairPrompt}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className="gen-button" onClick={() => { navigator.clipboard?.writeText(report.repairPrompt); notify?.("Copied."); }}>Copy</button>
            <button
              className="gen-button"
              onClick={() => {
                setGenPrefill?.({ prompt: report.repairPrompt, generateModelKey: generation.model, aspectRatio: "16:9" });
                setPage?.("generate");
              }}
            >Try again \u2192</button>
          </div>
        </>
      )}

      <div className="dbg-note">
        Read from {report.frameCount} stills sampled across the clip{report.hadSpec ? ", compared against this shot's spec" : ", compared against the prompt"}{report.refs?.length ? `, and against your Vault photos of ${report.refs.join(", ")}` : ""}. Timings are approximate to the sampling gaps, and motion and audio aren't visible in stills.
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="gen-button" onClick={() => run(true)} disabled={busy}>
          {busy ? stage || "Working…" : "Re-check"}
        </button>
      </div>
    </div>
  );
}