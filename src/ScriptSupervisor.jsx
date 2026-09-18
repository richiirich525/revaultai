import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { structuralFindings, narrativeContext } from "./lib/scriptSupervisor.js";

/*
  ScriptSupervisor — RevaultAI
  One continuity report for the whole project. The structural findings are
  read from records and cost nothing. The narrative check is a deliberate
  button, because story continuity is the part that needs a model.
*/

const KIND = {
  break:      { color: "#F87171", label: "Broken" },
  unresolved: { color: "#E5B769", label: "Unresolved" },
  stale:      { color: "#E5B769", label: "Not carried through" },
  ok:         { color: "#4ADE80", label: "Holding" },
  error:      { color: "#F87171", label: "Contradiction" },
  warning:    { color: "#E5B769", label: "Worth checking" },
};

const styles = `
  .ss { border: 1px solid var(--border); border-radius: 8px; padding: 26px 28px; margin-bottom: 24px; background: var(--surface); }
  .ss-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 14px; }
  .ss-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .ss-find { padding: 13px 0; border-bottom: 1px solid var(--border); }
  .ss-tag { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase; border-radius: 3px; padding: 2px 7px; margin-bottom: 7px; display: inline-block; }
  .ss-title { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; margin-bottom: 4px; }
  .ss-fix { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.75; margin-top: 6px; opacity: 0.85; }
  .ss-fix b { color: var(--accent); font-weight: 400; }
  .ss-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 6px 12px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; cursor: pointer; margin-top: 8px; }
  .ss-btn:hover { color: var(--accent); border-color: var(--accent); }
`;

export default function ScriptSupervisor({ project, user, setPage, notify }) {
  const [data, setData] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || !project?.id) { setData(null); return; }
    (async () => {
      const [specs, gens, shots, observed, mutations, vault] = await Promise.all([
        supabase.from("film_specs").select("id, title, sequence, spec, breakdown_id").eq("project_id", project.id),
        supabase.from("generations").select("id, film_spec_id, debug_report").eq("project_id", project.id),
        supabase.from("shots").select("id, selected_generation_id").eq("project_id", project.id),
        supabase.from("observed_states").select("*").eq("project_id", project.id),
        supabase.from("asset_mutations").select("*").eq("project_id", project.id),
        supabase.from("vault_entries").select("id, name, kind").eq("project_id", project.id),
      ]);
      setData({
        specs: specs.data ?? [], gens: gens.data ?? [], shots: shots.data ?? [],
        observed: observed.data ?? [], mutations: mutations.data ?? [], vault: vault.data ?? [],
      });
    })();
  }, [user?.id, project?.id]);

  async function runNarrative() {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/narrative-check", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ context: narrativeContext(data) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Could not run the narrative check.");
      else setNarrative(j);
    } catch { notify?.("Could not reach the narrative check."); }
    setBusy(false);
  }

  if (!data) return null;

  const findings = structuralFindings(data);
  const withState = data.specs.filter((s) => s.spec?.action?.startState || s.spec?.action?.endState).length;

  if (data.specs.length === 0) return null;

  return (
    <div className="ss">
      <style>{styles}</style>
      <div className="ss-label">Script supervisor</div>

      {findings.length === 0 ? (
        <div className="ss-body">
          Nothing contradicts across this project's records yet — though there's not much state recorded to check against.
        </div>
      ) : (
        findings.map((f, i) => {
          const k = KIND[f.kind] ?? KIND.warning;
          return (
            <div className="ss-find" key={i}>
              <div className="ss-tag" style={{ color: k.color, border: `1px solid ${k.color}55` }}>{k.label} · {f.area}</div>
              <div className="ss-title">{f.title}</div>
              <div className="ss-body">{f.detail}</div>
              {f.fix && <div className="ss-fix"><b>Fix:</b> {f.fix}</div>}
              {f.action && <button className="ss-btn" onClick={() => setPage(f.action)}>Go there →</button>}
            </div>
          );
        })
      )}

      <div style={{ marginTop: 18 }}>
        {narrative ? (
          <>
            <div className="ss-label" style={{ marginTop: 10 }}>Story continuity</div>
            {narrative.read && <div className="ss-body" style={{ color: "var(--text)", marginBottom: 12 }}>{narrative.read}</div>}
            {narrative.findings.map((f, i) => {
              const k = KIND[f.severity] ?? KIND.warning;
              return (
                <div className="ss-find" key={i}>
                  <div className="ss-tag" style={{ color: k.color, border: `1px solid ${k.color}55` }}>
                    {k.label}{f.shots.length ? ` · shot${f.shots.length > 1 ? "s" : ""} ${f.shots.join(", ")}` : ""}
                  </div>
                  <div className="ss-title">{f.issue}</div>
                  <div className="ss-body">{f.why}</div>
                </div>
              );
            })}
          </>
        ) : withState >= 2 ? (
          <>
            <button className="ss-btn" onClick={runNarrative} disabled={busy} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
              {busy ? "Reading the story…" : "Check story continuity"}
            </button>
            <div className="ss-body" style={{ fontSize: 10, marginTop: 8, opacity: 0.8 }}>
              Reads {withState} shots for the things a visual check can't catch — a character acting on something they haven't learned, an injury nobody favours, time moving the wrong way.
            </div>
          </>
        ) : (
          <div className="ss-body" style={{ fontSize: 10, opacity: 0.8 }}>
            Story continuity needs at least two shots with start and end states. Scene Breakdown writes those.
          </div>
        )}
      </div>
    </div>
  );
}