import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";
import RehearsalStudio from "./RehearsalStudio.jsx";

/*
  RehearsalPage — RevaultAI
  Rehearse the scene before generating it. Anyone can use the studio;
  saving needs an account, and saved rehearsals file under the active project.
*/

const bar = {
  maxWidth: 980, margin: "0 auto 18px", padding: "0 48px",
};
const mono = { fontFamily: "'DM Mono', monospace" };

export default function RehearsalPage({ user, activeProject, notify, onSignInClick, setGenPrefill, setPage }) {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState({ id: null, data: null, key: "new" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const latest = useRef(null);
  const baseline = useRef(null);

  async function loadList() {
    if (!user?.id) { setList([]); return; }
    let q = supabase
      .from("rehearsals")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30);
    if (activeProject?.id) q = q.eq("project_id", activeProject.id);
    const { data } = await q;
    setList(data ?? []);
  }
  useEffect(() => { loadList(); }, [user?.id, activeProject?.id]);

  // Don't lose unsaved blocking to a stray tab close.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // The studio reports every change. The first report after opening is the
  // starting point, not an edit.
  function onStudioChange(r) {
    latest.current = r;
    const s = JSON.stringify(r);
    if (baseline.current === null) { baseline.current = s; return; }
    setDirty(s !== baseline.current);
  }

  // The angle becomes a Shot Spec, not just a prompt: it carries the blocking,
  // start and end states, eyelines and beats into the Debugger, Live Set
  // Memory and the cross-model compiler.
  async function onShoot(out) {
    let specId = null;
    let version = 1;
    if (user?.id && out.spec) {
      const { data, error } = await supabase
        .from("film_specs")
        .insert({
          user_id: user.id,
          project_id: activeProject?.id ?? null,
          title: out.spec.identity?.title || "Rehearsal shot",
          version: 1,
          origin: "rehearsal",
          spec: out.spec,
        })
        .select("id, version")
        .single();
      if (!error && data) { specId = data.id; version = data.version ?? 1; }
    }
    setGenPrefill?.({
      prompt: out.prompt,
      aspectRatio: out.aspect,
      ...(specId ? { filmSpecId: specId, filmSpecVersion: version } : {}),
    });
    notify?.(specId
      ? `${out.camera} saved as a shot spec. Your rehearsal runs ${out.seconds}s — set the length to match.`
      : `Prompt built from ${out.camera}. Your rehearsal runs ${out.seconds}s — set the length to match.`);
    setPage?.("generate");
  }

  function leaveOk() {
    return !dirty || window.confirm("You have unsaved changes to this rehearsal. Leave them?");
  }

  async function open(id) {
    if (id === current.id || !leaveOk()) return;
    const { data, error } = await supabase.from("rehearsals").select("*").eq("id", id).maybeSingle();
    if (error || !data) { notify?.("Could not open that rehearsal."); return; }
    baseline.current = null;
    latest.current = data.data;
    setCurrent({ id: data.id, data: data.data, key: data.id });
    setDirty(false);
  }

  function startNew() {
    if (!leaveOk()) return;
    baseline.current = null;
    latest.current = null;
    setCurrent({ id: null, data: null, key: "new-" + Date.now() });
    setDirty(false);
  }

  async function save() {
    if (!user) { onSignInClick?.(); return; }
    const data = latest.current;
    if (!data) return;
    setSaving(true);
    const row = {
      title: String(data.title || "Untitled rehearsal").slice(0, 120),
      data,
      updated_at: new Date().toISOString(),
    };
    const res = current.id
      ? await supabase.from("rehearsals").update(row).eq("id", current.id).select().single()
      : await supabase.from("rehearsals").insert({ ...row, user_id: user.id, project_id: activeProject?.id ?? null }).select().single();
    setSaving(false);
    if (res.error) { notify?.("Could not save: " + res.error.message); return; }
    baseline.current = JSON.stringify(data);
    setCurrent((c) => ({ ...c, id: res.data.id }));
    setDirty(false);
    notify?.("Rehearsal saved.");
    loadList();
  }

  async function remove(id, title) {
    if (!window.confirm(`Delete "${title || "Untitled rehearsal"}"? This can't be undone.`)) return;
    const { error } = await supabase.from("rehearsals").delete().eq("id", id);
    if (error) { notify?.("Could not delete: " + error.message); return; }
    if (id === current.id) {
      baseline.current = null;
      latest.current = null;
      setCurrent({ id: null, data: null, key: "new-" + Date.now() });
      setDirty(false);
    }
    loadList();
  }

  const btn = {
    background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
    padding: "6px 12px", ...mono, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer",
  };

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Rehearsal</div>
        <div className="page-hdr-title">Rehearsal Studio</div>
        <div className="page-hdr-sub">Block the scene over time before you spend a credit on it.</div>
      </div>
      <section className="section">
        <div style={{ ...bar, ...mono, fontSize: 11, color: "var(--muted)", lineHeight: 1.85 }}>
          Scrub to a moment and drag anyone — a keyframe is written there, and the movement between keyframes is filled in. Mark beats as you go. Add cameras to compare angles on an identical performance. Shot size, lens, eyelines and the 180° line all update live.
        </div>

        <div style={{ ...bar, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button style={{ ...btn, borderColor: "var(--accent)", color: "var(--accent)" }} onClick={save} disabled={saving}>
            {saving ? "Saving…" : !user ? "Sign in to save" : dirty || !current.id ? "Save rehearsal" : "\u2713 Saved"}
          </button>
          <button style={btn} onClick={startNew}>New rehearsal</button>
          {dirty && <span style={{ ...mono, fontSize: 10, color: "#E5B769" }}>Unsaved changes</span>}
          {activeProject && user && (
            <span style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>Saving to {activeProject.name}</span>
          )}
        </div>

        {list.length > 0 && (
          <div style={{ ...bar }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>
              Your rehearsals{activeProject ? " in this project" : ""}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {list.map((r) => (
                <span key={r.id} style={{ display: "inline-flex", border: "1px solid " + (r.id === current.id ? "var(--accent)" : "var(--border)"), borderRadius: 3, overflow: "hidden" }}>
                  <button
                    style={{ ...btn, border: "none", borderRadius: 0, color: r.id === current.id ? "var(--accent)" : "var(--text)" }}
                    onClick={() => open(r.id)}
                  >{r.title || "Untitled rehearsal"}</button>
                  <button
                    style={{ ...btn, border: "none", borderLeft: "1px solid var(--border)", borderRadius: 0, color: "#C25B5B", padding: "6px 9px" }}
                    onClick={() => remove(r.id, r.title)}
                    title="Delete"
                  >&times;</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <RehearsalStudio key={current.key} initial={current.data} onChange={onStudioChange} setGenPrefill={setGenPrefill} setPage={setPage} notify={notify} onShoot={onShoot} />
      </section>
    </div>
  );
}