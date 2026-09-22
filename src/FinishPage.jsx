import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import FinishCut from "./FinishCut.jsx";
import CutPreview from "./CutPreview.jsx";
import FinishExport from "./FinishExport.jsx";

/*
  FinishPage — RevaultAI (pass 1: choose and analyse)
  Turn a project's generations — keepers and rejects alike — into a scene.
  This pass reads each clip for what could be used in an edit. Assembly,
  preview and export build on these readings.
*/

const MAX_CLIPS = 12;
const LENGTHS = [15, 30, 60];

const styles = `
  .fn { max-width: 980px; margin: 0 auto; padding: 0 48px; }
  .fn-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 10px; }
  .fn-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .fn-panel { border: 1px solid var(--border); border-radius: 8px; padding: 22px 24px; background: var(--surface); margin-bottom: 18px; }
  .fn-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 7px 13px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; cursor: pointer; }
  .fn-btn:hover { color: var(--text); border-color: var(--muted); }
  .fn-btn.on { color: var(--accent); border-color: var(--accent); background: var(--bg); }
  .fn-text { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 12px 14px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.8; resize: vertical; box-sizing: border-box; }
  .fn-clip { display: grid; grid-template-columns: 20px 150px 1fr; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border); align-items: start; }
  .fn-clip video { width: 150px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 3px; background: #000; }
  .fn-check { width: 16px; height: 16px; margin-top: 4px; accent-color: var(--accent); }
  .fn-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.05em; margin-bottom: 5px; }
  .fn-tag { display: inline-block; font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; border-radius: 3px; padding: 2px 6px; margin-right: 6px; }
  .fn-bar { position: relative; height: 14px; background: var(--bg3); border-radius: 3px; margin: 8px 0 6px; overflow: hidden; }
  .fn-seg { position: absolute; top: 0; bottom: 0; }
  .fn-legend { display: flex; gap: 14px; flex-wrap: wrap; font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.06em; }
  .fn-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  @media (max-width: 760px) { .fn { padding: 0 20px; } .fn-clip { grid-template-columns: 20px 1fr; } .fn-clip video { display: none; } }
`;

const QUALITY = { strong: "#4ADE80", usable: "#7B3FE4", weak: "rgba(123,63,228,0.45)" };

// Evenly spaced stills from a clip, roughly one a second, downscaled hard.
function sampleFrames(url) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous"; v.preload = "auto"; v.muted = true; v.playsInline = true; v.src = url;
    const frames = []; let i = 0; let times = []; let duration = 0;
    v.addEventListener("error", () => reject(new Error("Couldn't load the clip.")));
    v.addEventListener("loadedmetadata", () => {
      duration = v.duration || 0;
      if (!duration || !isFinite(duration)) return reject(new Error("Couldn't read the clip's length."));
      const count = Math.max(4, Math.min(12, Math.round(duration)));
      times = Array.from({ length: count }, (_, n) => Math.min(duration - 0.05, (duration * (n + 0.5)) / count));
      v.currentTime = times[0];
    });
    v.addEventListener("seeked", () => {
      try {
        const scale = Math.min(1, 640 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
        const c = document.createElement("canvas");
        c.width = Math.round((v.videoWidth || 640) * scale);
        c.height = Math.round((v.videoHeight || 360) * scale);
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
        frames.push({ t: times[i], data: c.toDataURL("image/jpeg", 0.7).split(",")[1] });
      } catch {
        return reject(new Error("Couldn't read frames from this clip."));
      }
      i++;
      if (i < times.length) v.currentTime = times[i];
      else resolve({ frames, duration });
    });
  });
}

function ClipTimeline({ a }) {
  const pct = (s) => `${(s / a.duration) * 100}%`;
  return (
    <>
      <div className="fn-bar">
        {a.usable.map((u, i) => (
          <div key={"u" + i} className="fn-seg" style={{ left: pct(u.from), width: pct(u.to - u.from), background: QUALITY[u.quality] }} title={`${u.from}–${u.to}s · ${u.quality} · ${u.why}`} />
        ))}
        {a.defects.map((d, i) => (
          <div key={"d" + i} className="fn-seg" style={{ left: pct(d.from), width: pct(d.to - d.from), background: d.severity === "error" ? "rgba(248,113,113,0.85)" : "rgba(229,183,105,0.7)", height: 4, top: "auto", bottom: 0 }} title={`${d.from}–${d.to}s · ${d.issue}`} />
        ))}
        {a.best && (
          <div className="fn-seg" style={{ left: pct(a.best.from), width: pct(a.best.to - a.best.from), border: "1px solid #fff", borderRadius: 2, boxSizing: "border-box" }} title={`Best: ${a.best.why}`} />
        )}
      </div>
      <div className="fn-body" style={{ fontSize: 10 }}>
        {a.best ? <>Best: <span style={{ color: "var(--text)" }}>{a.best.from}–{a.best.to}s</span> — {a.best.why}</> : "Nothing usable in this clip."}
      </div>
      {a.defects.length > 0 && (
        <div className="fn-body" style={{ fontSize: 10, opacity: 0.85 }}>
          {a.defects.slice(0, 2).map((d, i) => <div key={i}>{d.from}–{d.to}s: {d.issue}</div>)}
        </div>
      )}
    </>
  );
}

export default function FinishPage({ user, activeProject, setPage, notify, onSignInClick }) {
  const [gens, setGens] = useState([]);
  const [keepers, setKeepers] = useState(new Set());
  const [picked, setPicked] = useState(new Set());
  const [urls, setUrls] = useState({});
  const [scene, setScene] = useState("");
  const [length, setLength] = useState(30);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(true);
  const [cut, setCut] = useState(null);
  const [assembling, setAssembling] = useState(false);

  async function signUrl(g) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/get-video-url", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generation", id: g.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { setUrls((u) => ({ ...u, [g.id]: j.url })); return j.url; }
    } catch { /* best effort */ }
    return null;
  }

  useEffect(() => {
    if (!user?.id || !activeProject?.id) { setLoading(false); return; }
    (async () => {
      const [{ data: g }, { data: s }, { data: b }] = await Promise.all([
        supabase.from("generations").select("id, prompt, model, status, video_url, take_status, reject_reason, finish_analysis, created_at")
          .eq("project_id", activeProject.id).eq("status", "complete").order("created_at", { ascending: true }),
        supabase.from("shots").select("selected_generation_id").eq("project_id", activeProject.id),
        supabase.from("scene_breakdowns").select("breakdown").eq("project_id", activeProject.id).order("created_at", { ascending: false }).limit(1),
      ]);
      const list = g ?? [];
      setGens(list);
      setKeepers(new Set((s ?? []).map((x) => x.selected_generation_id).filter(Boolean)));
      setPicked(new Set(list.slice(0, MAX_CLIPS).map((x) => x.id)));
      const logline = b?.[0]?.breakdown?.logline;
      if (logline) setScene((cur) => cur || logline);
      setLoading(false);
      for (const one of list) signUrl(one);
      const { data: c } = await supabase.from("finish_cuts").select("cut").eq("project_id", activeProject.id).order("created_at", { ascending: false }).limit(1);
      setCut(c?.[0]?.cut ?? null);
    })();
  }, [user?.id, activeProject?.id]);

  function toggle(id) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else if (n.size < MAX_CLIPS) n.add(id);
      else notify?.(`Up to ${MAX_CLIPS} clips per scene.`);
      return n;
    });
  }

  async function analyse() {
    const todo = gens.filter((g) => picked.has(g.id) && !g.finish_analysis);
    if (todo.length === 0) return;
    setRunning(true);
    const { data: sess } = await supabase.auth.getSession();
    let done = 0;
    for (const g of todo) {
      done++;
      setProgress(`Reading clip ${done} of ${todo.length}…`);
      try {
        const url = urls[g.id] ?? (await signUrl(g));
        if (!url) throw new Error("Couldn't open the clip.");
        const { frames, duration } = await sampleFrames(url);
        const r = await fetch("/api/finish-analyze", {
          method: "POST",
          headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ generationId: g.id, frames, duration }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { notify?.(j.error || "Couldn't analyse a clip."); if (r.status === 429) break; continue; }
        setGens((list) => list.map((x) => (x.id === g.id ? { ...x, finish_analysis: j.analysis } : x)));
      } catch (e) {
        notify?.(e.message || "Couldn't analyse a clip.");
      }
    }
    setRunning(false);
    setProgress("");
  }

  async function assemble() {
    const ids = gens.filter((g) => picked.has(g.id) && g.finish_analysis).map((g) => g.id);
    if (ids.length === 0) return;
    setAssembling(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/finish-assemble", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, scene, length, clipIds: ids }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Couldn't assemble the cut.");
      else setCut(j.cut);
    } catch {
      notify?.("Couldn't assemble the cut.");
    }
    setAssembling(false);
  }

  const header = (
    <div className="page-hdr">
      <div className="page-hdr-eyebrow">Production</div>
      <div className="page-hdr-title">Finish</div>
      <div className="page-hdr-sub">Turn a pile of takes into a scene.</div>
    </div>
  );

  if (!user) {
    return (
      <div className="page">{header}
        <section className="section"><div className="empty-state">
          <div className="empty-text">Sign in to finish a scene from your takes.</div>
          <button className="btn-primary" style={{ marginTop: 20 }} onClick={onSignInClick}>Sign in</button>
        </div></section>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="page">{header}
        <section className="section"><div className="empty-state">
          <div className="empty-text">Finish works on one project at a time. Choose a project first.</div>
          <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setPage("projects")}>Go to Projects</button>
        </div></section>
      </div>
    );
  }

  const chosen = gens.filter((g) => picked.has(g.id));
  const pending = chosen.filter((g) => !g.finish_analysis).length;
  const analysed = chosen.length - pending;

  return (
    <div className="page">
      <style>{styles}</style>
      {header}
      <section className="section">
        <div className="fn">
          <div className="fn-body" style={{ maxWidth: 660, marginBottom: 26 }}>
            Choose the takes to work from — including the ones you rejected. A failed clip often hides a usable second or two: a clean reaction before the face drifts, an establishing view before the camera wanders. Finish reads each clip for those moments. Free while it's new.
          </div>

          <div className="fn-panel">
            <div className="fn-label">The scene</div>
            <textarea
              className="fn-text"
              rows={3}
              maxLength={1200}
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="What should this scene be? e.g. Maya slips the envelope into her bag while Jonah's back is turned; she almost gets caught."
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
              <span className="fn-body" style={{ fontSize: 10 }}>Target length</span>
              {LENGTHS.map((l) => (
                <button key={l} className={"fn-btn" + (length === l ? " on" : "")} onClick={() => setLength(l)}>{l}s</button>
              ))}
            </div>
          </div>

          <div className="fn-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
              <div className="fn-label" style={{ marginBottom: 0 }}>Takes in {activeProject.name} — {chosen.length} chosen</div>
              <div className="fn-legend">
                <span><i style={{ background: QUALITY.strong }} />strong</span>
                <span><i style={{ background: QUALITY.usable }} />usable</span>
                <span><i style={{ background: "rgba(248,113,113,0.85)" }} />defect</span>
                <span><i style={{ border: "1px solid #fff" }} />best</span>
              </div>
            </div>

            {loading ? (
              <div className="fn-body" style={{ padding: "14px 0" }}>Loading your takes…</div>
            ) : gens.length === 0 ? (
              <div className="fn-body" style={{ padding: "14px 0" }}>No finished generations in this project yet. Generate some shots under it first.</div>
            ) : (
              gens.map((g) => {
                const a = g.finish_analysis;
                return (
                  <div className="fn-clip" key={g.id}>
                    <input type="checkbox" className="fn-check" checked={picked.has(g.id)} onChange={() => toggle(g.id)} />
                    {urls[g.id] ? <video src={urls[g.id]} muted playsInline preload="metadata" controls /> : <div style={{ width: 150, aspectRatio: "16 / 9", background: "#000", borderRadius: 3 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div className="fn-meta">
                        {keepers.has(g.id) && <span className="fn-tag" style={{ color: "#4ADE80", border: "1px solid #4ADE8055" }}>keeper</span>}
                        {g.take_status === "rejected" && <span className="fn-tag" style={{ color: "#F87171", border: "1px solid #F8717155" }}>rejected{g.reject_reason ? " · " + g.reject_reason : ""}</span>}
                        {g.model}
                      </div>
                      <div className="fn-body" style={{ color: "var(--text)", fontSize: 11, marginBottom: 2 }}>
                        {a?.summary || (g.prompt ? g.prompt.slice(0, 140) + (g.prompt.length > 140 ? "…" : "") : "Untitled take")}
                      </div>
                      {a ? <ClipTimeline a={a} /> : <div className="fn-body" style={{ fontSize: 10, opacity: 0.7 }}>Not analysed yet.</div>}
                    </div>
                  </div>
                );
              })
            )}

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 18 }}>
              <button className="btn-primary" onClick={analyse} disabled={running || pending === 0}>
                {running ? progress || "Working…" : pending === 0 ? (chosen.length ? "\u2713 All chosen clips analysed" : "Choose some clips") : `Analyse ${pending} clip${pending === 1 ? "" : "s"}`}
              </button>
              {analysed > 0 && !running && (
                <button className="fn-btn on" onClick={assemble} disabled={assembling}>{assembling ? "Assembling the cut…" : `${cut ? "Reassemble" : "Assemble"} a cut from ${analysed} clip${analysed === 1 ? "" : "s"}`}</button>
              )}
            </div>
          </div>
          {cut?.shots?.length > 0 && <CutPreview shots={cut.shots} urls={urls} />}
          {cut && <FinishExport cut={cut} urls={urls} gens={gens} title={activeProject?.name} scene={scene} />}
          {cut && <FinishCut cut={cut} gens={gens} urls={urls} notify={notify} />}
        </div>
      </section>
    </div>
  );
}