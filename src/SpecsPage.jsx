import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { MODEL_PROFILES, transferReport, specCoverage, mergeSpec } from "./lib/filmSpec.js";

/*
  SpecsPage — RevaultAI
  A shot as structure rather than a block of prompt text. Switch the target
  model and see exactly what carries, what gets rephrased, and what that model
  can't do — before spending anything on finding out.
*/

const FIELDS = [
  ["identity", "Identity", [["title", "Title"], ["beat", "Story beat"], ["purpose", "Dramatic purpose"]]],
  ["action", "Action", [["primary", "Primary action"], ["startState", "Starting state"], ["endState", "Ending state"]]],
  ["camera", "Camera", [["shotSize", "Shot size"], ["lens", "Lens"], ["height", "Height"], ["angle", "Angle"], ["movement", "Movement"]]],
  ["composition", "Composition", [["screenDirection", "Screen direction"]]],
  ["lighting", "Lighting", [["keyDirection", "Key direction"], ["quality", "Quality"], ["contrast", "Contrast"], ["practicals", "Practicals"]]],
  ["style", "Style", [["look", "Look"], ["palette", "Palette"], ["texture", "Texture"]]],
  ["timing", "Timing", [["durationSeconds", "Duration (s)"], ["aspectRatio", "Aspect ratio"]]],
  ["performance", "Performance", [["register", "Register"], ["notes", "Notes"]]],
];

const styles = `
  .fs-wrap { max-width: 980px; margin: 0 auto; padding: 0 48px; }
  .fs-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .fs-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .fs-row { border: 1px solid var(--border); border-radius: 8px; padding: 18px 22px; margin-bottom: 10px; background: var(--surface); cursor: pointer; transition: border-color 0.2s; }
  .fs-row:hover { border-color: var(--muted); }
  .fs-row.on { border-color: var(--accent); }
  .fs-row-head { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; flex-wrap: wrap; }
  .fs-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); }
  .fs-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.07em; }
  .fs-panel { border: 1px solid var(--accent); border-radius: 8px; padding: 26px 28px; margin-bottom: 24px; background: var(--surface); }
  .fs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px 22px; }
  .fs-field-k { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
  .fs-input { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 8px 10px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); box-sizing: border-box; }
  .fs-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 7px 13px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; cursor: pointer; }
  .fs-chip:hover { color: var(--text); border-color: var(--muted); }
  .fs-chip.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .fs-line { font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.8; display: flex; gap: 9px; margin-bottom: 4px; }
  .fs-lock { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.75; padding: 6px 0; border-bottom: 1px solid var(--border); }
  .fs-prompt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 15px 17px; margin-top: 12px; }
  .fs-bar { height: 3px; border-radius: 2px; background: var(--bg3); overflow: hidden; margin: 8px 0 14px; }
  .fs-bar div { height: 100%; background: var(--accent); }
  @media (max-width: 760px) { .fs-wrap { padding: 0 24px; } }
`;

export default function SpecsPage({ user, onSignInClick, setPage, notify, setGenPrefill, activeProject }) {
  const [specs, setSpecs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [target, setTarget] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [compiled, setCompiled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.id) { setSpecs([]); setLoading(false); return; }
    let q = supabase.from("film_specs").select("*").order("created_at", { ascending: false }).limit(60);
    if (activeProject?.id) q = q.eq("project_id", activeProject.id);
    const { data } = await q;
    setSpecs(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [user?.id, activeProject?.id]);

  function open(row) {
    if (openId === row.id) { setOpenId(null); setDraft(null); setCompiled(null); return; }
    setOpenId(row.id);
    setDraft(row.spec);
    setTarget(row.spec?.model?.target || "");
    setCompiled(null);
  }

  function setField(group, key, value) {
    setDraft((d) => mergeSpec(d, { [group]: { ...(d?.[group] ?? {}), [key]: value } }));
  }

  // Saving bumps the version and keeps the old one, so a take generated from
  // version 2 is never compared against a version 3 edited afterwards.
  async function save(row) {
    setSaving(true);
    const nextVersion = (row.version ?? 1) + 1;
    await supabase.from("film_spec_versions").insert({
      spec_id: row.id, user_id: user.id, version: row.version ?? 1, spec: row.spec,
    });
    const { error } = await supabase
      .from("film_specs")
      .update({ spec: draft, version: nextVersion, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setSaving(false);
    if (error) { notify?.("Could not save: " + error.message); return; }
    notify?.(`Saved as version ${nextVersion}.`);
    load();
  }

  async function compile(row) {
    if (!target) { notify?.("Pick a target model first."); return; }
    setCompiling(true); setCompiled(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/compile-spec", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ specId: row.id, targetKey: target, profile: MODEL_PROFILES[target] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Could not compile.");
      else setCompiled(j);
    } catch {
      notify?.("Could not reach the compiler.");
    }
    setCompiling(false);
  }

  if (!user) {
    return (
      <div className="page">
        <div className="page-hdr">
          <div className="page-hdr-eyebrow">Production</div>
          <div className="page-hdr-title">Shot Specs</div>
          <div className="page-hdr-sub">Your shots as structure, not just prompt text.</div>
        </div>
        <section className="section">
          <div className="empty-state">
            <div className="empty-text">Sign in to see your shot specs.</div>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={onSignInClick}>Sign in</button>
          </div>
        </section>
      </div>
    );
  }

  const report = draft && target ? transferReport(draft, target) : null;
  const coverage = draft ? specCoverage(draft) : null;

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Production</div>
        <div className="page-hdr-title">Shot Specs</div>
        <div className="page-hdr-sub">Your creative intent, held apart from any one model's prompt.</div>
      </div>

      <section className="section">
        <div className="fs-wrap">
          <div className="fs-body" style={{ maxWidth: 640, marginBottom: 30 }}>
            A prompt is written for one model. A spec is written for the shot. Scene Breakdown builds these automatically — open one to see what it captured, change the target model, and find out what carries across before you pay to discover it doesn't.
            {activeProject && <> Showing specs in <span style={{ color: "var(--accent)" }}>{activeProject.name}</span>.</>}
          </div>

          {loading ? (
            <div className="empty-state"><div className="empty-text">Loading your specs…</div></div>
          ) : specs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-text">No specs yet. Break down a scene and they'll appear here.</div>
              <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setPage("scene-breakdown")}>Break down a scene</button>
            </div>
          ) : (
            specs.map((row) => {
              const isOpen = openId === row.id;
              const s = isOpen ? draft : row.spec;
              return (
                <div key={row.id}>
                  <div className={"fs-row" + (isOpen ? " on" : "")} onClick={() => open(row)}>
                    <div className="fs-row-head">
                      <span className="fs-name">{row.title || "Untitled shot"}</span>
                      <span className="fs-meta">
                        v{row.version} · {s?.camera?.shotSize || "no shot size"}
                        {s?.timing?.durationSeconds ? ` · ${s.timing.durationSeconds}s` : ""}
                        {s?.timing?.aspectRatio ? ` · ${s.timing.aspectRatio}` : ""}
                      </span>
                    </div>
                  </div>

                  {isOpen && draft && (
                    <div className="fs-panel">
                      {coverage && (
                        <>
                          <div className="fs-label">Spec coverage — {coverage.score}%</div>
                          <div className="fs-bar"><div style={{ width: coverage.score + "%" }} /></div>
                          {coverage.missing.length > 0 && (
                            <div className="fs-body" style={{ fontSize: 10, marginTop: -6, marginBottom: 16, opacity: 0.8 }}>
                              Nothing recorded for: {coverage.missing.join(", ")}.
                            </div>
                          )}
                        </>
                      )}

                      <div className="fs-grid" style={{ marginBottom: 20 }}>
                        {FIELDS.map(([group, groupLabel, keys]) =>
                          keys.map(([k, label]) => (
                            <div key={group + k}>
                              <div className="fs-field-k">{label}</div>
                              <input
                                className="fs-input"
                                value={draft?.[group]?.[k] ?? ""}
                                placeholder={groupLabel}
                                onChange={(e) => setField(group, k, e.target.value)}
                              />
                            </div>
                          ))
                        )}
                      </div>

                      {(draft.continuityLocks?.length ?? 0) > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div className="fs-label">Continuity locks — reproduced verbatim</div>
                          {draft.continuityLocks.map((l, i) => <div className="fs-lock" key={i}>{l}</div>)}
                        </div>
                      )}

                      <div className="fs-label">Compile for a model</div>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
                        {Object.entries(MODEL_PROFILES).map(([k, p]) => (
                          <button key={k} className={"fs-chip" + (target === k ? " on" : "")} onClick={() => { setTarget(k); setCompiled(null); }}>{p.label}</button>
                        ))}
                      </div>

                      {report && (
                        <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "16px 18px", marginBottom: 16, background: "var(--bg)" }}>
                          <div className="fs-label" style={{ color: report.safe ? "#4ADE80" : "#E5B769" }}>
                            {report.safe ? "\u2713 Everything transfers to " + report.model : "\u26A0 Some intent doesn't transfer to " + report.model}
                          </div>
                          {report.carried.map((c, i) => <div className="fs-line" key={"c" + i}><span style={{ color: "#4ADE80" }}>\u2713</span><span className="fs-body" style={{ margin: 0 }}>{c}</span></div>)}
                          {report.rewritten.map((c, i) => <div className="fs-line" key={"r" + i}><span style={{ color: "#E5B769" }}>~</span><span className="fs-body" style={{ margin: 0 }}>{c}</span></div>)}
                          {report.unsupported.map((c, i) => <div className="fs-line" key={"u" + i}><span style={{ color: "#F87171" }}>\u2715</span><span className="fs-body" style={{ margin: 0, color: "#F8A0A0" }}>{c}</span></div>)}
                          <div className="fs-body" style={{ fontSize: 10, marginTop: 10, opacity: 0.8 }}>
                            Your creative intent hasn't changed — only how it's expressed.
                          </div>
                        </div>
                      )}

                      {compiled && (
                        <>
                          <div className="fs-label">Compiled prompt</div>
                          <div className="fs-prompt">{compiled.prompt}</div>
                          {compiled.notes?.length > 0 && (
                            <div className="fs-body" style={{ fontSize: 10, marginTop: 10 }}>
                              {compiled.notes.map((n, i) => <div key={i}>· {n}</div>)}
                            </div>
                          )}
                        </>
                      )}

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                        <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => compile(row)} disabled={compiling || !target}>
                          {compiling ? "Compiling…" : "Compile prompt"}
                        </button>
                        {compiled && (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: 11 }}
                            onClick={() => {
                              setGenPrefill?.({ prompt: compiled.prompt, generateModelKey: target, aspectRatio: draft?.timing?.aspectRatio || "16:9" });
                              setPage("generate");
                            }}
                          >Generate this \u2192</button>
                        )}
                        <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => save(row)} disabled={saving}>
                          {saving ? "Saving…" : "Save as v" + ((row.version ?? 1) + 1)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}