import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  StateReview — RevaultAI
  When a take is selected, what the footage actually ends with is compared
  against what the shot was planned to end with. A difference is a question,
  not an error: the model may have given you something better.
*/

const styles = `
  .sr { border: 1px solid #E5B769; border-radius: 6px; padding: 16px 18px; margin-top: 12px; background: rgba(229,183,105,0.05); }
  .sr-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: #E5B769; margin-bottom: 10px; }
  .sr-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .sr-diff { padding: 9px 0; border-bottom: 1px solid var(--border); }
  .sr-aspect { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); margin-bottom: 4px; }
  .sr-pair { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.75; }
  .sr-pair b { color: var(--accent); font-weight: 400; }
  .sr-done { border-color: var(--border); background: var(--bg3); }
`;

export default function StateReview({ generation, videoUrl, notify }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("observed_states").select("*").eq("generation_id", generation.id).maybeSingle();
      setState(data ?? null);
      setChecked(true);
    })();
  }, [generation.id]);

  // Three stills from the tail of the clip — the ending state is what matters.
  async function closingFrames(url) {
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous"; v.preload = "auto"; v.muted = true; v.playsInline = true; v.src = url;
      const frames = []; let i = 0; let times = [];
      v.addEventListener("error", () => reject(new Error("Couldn't load the clip.")));
      v.addEventListener("loadedmetadata", () => {
        const d = v.duration || 0;
        if (!d || !isFinite(d)) return reject(new Error("Couldn't read the clip's duration."));
        times = [Math.max(0.05, d - 0.9), Math.max(0.05, d - 0.45), Math.max(0.05, d - 0.08)];
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
          return reject(new Error("Couldn't read frames — the storage bucket needs GET allowed in its CORS policy."));
        }
        i++;
        if (i < times.length) v.currentTime = times[i];
        else resolve(frames);
      });
    });
  }

  async function run() {
    if (!videoUrl) { notify?.("Still preparing playback — try again in a moment."); return; }
    setBusy(true);
    try {
      const frames = await closingFrames(videoUrl);
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/observe-state", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: generation.id, frames }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Could not read the ending state.");
      else setState(j.state);
    } catch (err) {
      notify?.(err.message || "Could not read the ending state.");
    }
    setBusy(false);
  }

  async function resolve(choice) {
    const { data, error } = await supabase
      .from("observed_states")
      .update({ resolution: choice })
      .eq("id", state.id)
      .select()
      .single();
    if (error) { notify?.("Could not save: " + error.message); return; }
    setState(data);
    notify?.(choice === "adopted"
      ? "Adopted. The next shot inherits what the footage actually shows."
      : "Kept the plan. Production memory is unchanged.");
  }

  if (!checked) return null;

  if (!state) {
    return (
      <button className="gen-button" onClick={run} disabled={busy}>
        {busy ? "Reading the ending…" : "Check the ending state"}
      </button>
    );
  }

  const diffs = state.differences ?? [];
  const settled = state.resolution !== "pending";

  if (diffs.length === 0) {
    return (
      <div className="sr sr-done">
        <style>{styles}</style>
        <div className="sr-label" style={{ color: "#4ADE80" }}>✓ Ends as planned</div>
        <div className="sr-body">{state.observed_end}</div>
      </div>
    );
  }

  return (
    <div className={"sr" + (settled ? " sr-done" : "")}>
      <style>{styles}</style>
      <div className="sr-label" style={{ color: settled ? "var(--accent)" : "#E5B769" }}>
        {settled
          ? state.resolution === "adopted" ? "Filmed state adopted" : "Planned state kept"
          : `This take ends differently — ${diffs.length} change${diffs.length === 1 ? "" : "s"}`}
      </div>

      {diffs.map((d, i) => (
        <div className="sr-diff" key={i}>
          <div className="sr-aspect">
            {d.aspect}
            {!d.consequential && <span className="sr-pair" style={{ opacity: 0.7 }}> · doesn't carry forward</span>}
            {d.confidence !== "high" && <span className="sr-pair" style={{ opacity: 0.7 }}> · {d.confidence} confidence</span>}
          </div>
          <div className="sr-pair"><b>Planned:</b> {d.planned}</div>
          <div className="sr-pair"><b>Filmed:</b> {d.observed}</div>
        </div>
      ))}

      {!settled && (
        <>
          <div className="sr-body" style={{ fontSize: 10, marginTop: 12, marginBottom: 10, opacity: 0.85 }}>
            A model going off-plan isn't automatically wrong. If you like what it did, adopt it and the next shot inherits it.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="gen-button" onClick={() => resolve("adopted")}>Adopt the filmed state</button>
            <button className="gen-button" onClick={() => resolve("kept")}>Keep the plan</button>
          </div>
        </>
      )}

      {settled && state.resolution === "adopted" && (
        <div className="sr-body" style={{ fontSize: 10, marginTop: 10, opacity: 0.85 }}>
          Ending state now on record: {state.observed_end}
        </div>
      )}
    </div>
  );
}