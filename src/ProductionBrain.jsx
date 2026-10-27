import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { buildFindings, buildSummary } from "./lib/productionBrain.js";

/*
  ProductionBrain — RevaultAI
  What to do next on this project, read from the project's own records.
  Every line is a fact the database can prove. Nothing is inferred, so this
  can't tell you something about your film that isn't true.
*/

/*
  Continuity across the whole project, which no other panel can show: a
  jacket that changes in shot seven is invisible from inside shot seven.

  Fetched on demand rather than with the rest, because it reads every plan
  and every observation in the project and most visits to this panel are not
  about continuity. It runs no vision pass and spends nothing — the checking
  itself stays one take at a time, where somebody can see the frames.
*/
const KIND = {
  blocked:  { color: "#F87171", label: "Stuck" },
  waste:    { color: "#E5B769", label: "Costing you" },
  decision: { color: "#7B3FE4", label: "Waiting on you" },
  gap:      { color: "#E5B769", label: "Unfinished" },
  ready:    { color: "#4ADE80", label: "Ready to shoot" },
};

const styles = `
  .pb2 { border: 1px solid var(--accent); border-radius: 8px; padding: 26px 28px; margin-bottom: 24px; background: var(--surface); }
  .pb2-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 14px; }
  .pb2-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .pb2-stats { display: flex; gap: 24px; flex-wrap: wrap; padding-bottom: 16px; margin-bottom: 4px; border-bottom: 1px solid var(--border); }
  .pb2-n { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); line-height: 1; }
  .pb2-k { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--muted); margin-top: 5px; }
  .pb2-find { padding: 14px 0; border-bottom: 1px solid var(--border); }
  .pb2-tag { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase; border-radius: 3px; padding: 2px 7px; margin-bottom: 7px; display: inline-block; }
  .pb2-title { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; margin-bottom: 4px; }
  .pb2-action { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 6px 12px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; cursor: pointer; margin-top: 9px; }
  .pb2-action:hover { color: var(--accent); border-color: var(--accent); }
`;

function Continuity({ projectId, setPage }) {
  const [sweep, setSweep] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/sequence-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + sess?.session?.access_token },
        body: JSON.stringify({ projectId }),
      });
      const j = await r.json().catch(() => ({}));
      setSweep(r.ok ? j.sweep : { error: j.error || "Could not read this sequence." });
    } catch (err) {
      setSweep({ error: err.message });
    }
    setBusy(false);
  }

  if (!sweep) {
    return (
      <div className="pb2-find">
        <div className="pb2-title">Continuity across the sequence</div>
        <div className="pb2-body">
          Whether the things established early in this film are still true later on. Reads
          what has already been observed; it films nothing and spends nothing.
        </div>
        <button className="pb2-action" onClick={run} disabled={busy}>
          {busy ? "Reading…" : "Check the sequence →"}
        </button>
      </div>
    );
  }

  if (sweep.error) return <div className="pb2-find"><div className="pb2-body">{sweep.error}</div></div>;

  const c = sweep.counts ?? {};
  const atRisk = (sweep.commitments ?? []).filter((x) => x.likelyBroken.length);

  return (
    <div className="pb2-find">
      <div
        className="pb2-tag"
        style={{
          color: c.broken ? "#F87171" : c.unchecked ? "#E5B769" : "#4ADE80",
          border: `1px solid ${c.broken ? "#F87171" : c.unchecked ? "#E5B769" : "#4ADE80"}55`,
        }}
      >
        {c.broken ? "Continuity" : c.unchecked ? "Unverified" : "Consistent"}
      </div>
      <div className="pb2-title">
        {c.commitments} {c.commitments === 1 ? "thing carries" : "things carry"} between shots
      </div>
      <div className="pb2-body">
        {c.held} filmed {c.held === 1 ? "shot holds" : "shots hold"} to the plan.
        {c.broken > 0 && ` ${c.broken} ${c.broken === 1 ? "differs" : "differ"} and nobody has decided about it.`}
        {c.unchecked > 0 && ` ${c.unchecked} filmed ${c.unchecked === 1 ? "shot has" : "shots have"} never been compared.`}
        {c.unfilmed > 0 && ` ${c.unfilmed} not filmed yet.`}
      </div>

      {atRisk.length > 0 && (
        <div className="pb2-body" style={{ paddingTop: 8 }}>
          {atRisk.slice(0, 4).map((x, i) => (
            <div key={i}>
              &bull; <b>{x.value}</b> &mdash; established in shot {x.establishedIn + 1}, looks broken in{" "}
              {x.likelyBroken.map((b) => b + 1).join(", ")}
            </div>
          ))}
          <div style={{ fontSize: 9, opacity: 0.7, marginTop: 6 }}>
            Which break belongs to which commitment is matched on wording, so treat it as a
            pointer rather than a verdict. The per-shot comparison is the reliable part.
          </div>
        </div>
      )}

      {(sweep.next ?? []).slice(0, 1).map((n) => (
        <div className="pb2-body" key={n.id} style={{ paddingTop: 8 }}>Next: {n.why}.</div>
      ))}

      <button className="pb2-action" onClick={() => setPage?.("takes")}>Open Takes →</button>
    </div>
  );
}

export default function ProductionBrain({ project, user, setPage, setApPrefill, setGenPrefill }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user?.id || !project?.id) { setData(null); return; }
    (async () => {
      const [shots, gens, specs, observed, breakdowns, slots] = await Promise.all([
        supabase.from("shots").select("id, name, selected_generation_id").eq("project_id", project.id),
        supabase.from("generations").select("id, shot_id, status, credits_spent, reject_reason, film_spec_id, model, coverage_slot_id").eq("project_id", project.id),
        supabase.from("film_specs").select("id, title, breakdown_id").eq("project_id", project.id),
        supabase.from("observed_states").select("resolution, differences").eq("project_id", project.id),
        supabase.from("scene_breakdowns").select("id, title, shot_count").eq("project_id", project.id),
        supabase.from("coverage_slots").select("id, slug, priority, manual_status, prompt, model_key").eq("project_id", project.id),
      ]);
      setData({
        shots: shots.data ?? [], gens: gens.data ?? [], specs: specs.data ?? [],
        observed: observed.data ?? [], breakdowns: breakdowns.data ?? [], slots: slots.data ?? [],
      });
    })();
  }, [user?.id, project?.id]);

  if (!data) return null;

  const findings = buildFindings(data);
  const s = buildSummary(data);

  if (s.shots === 0 && s.attempts === 0 && data.specs.length === 0 && (data.slots ?? []).length === 0) {
    return (
      <div className="pb2">
        <style>{styles}</style>
        <div className="pb2-label">Where you are</div>
        <div className="pb2-body">
          Nothing generated under this project yet. Break down a scene and the shots, takes and decisions will start collecting here.
        </div>
        <button className="pb2-action" onClick={() => setPage("scene-breakdown")}>Break down a scene</button>
      </div>
    );
  }

  function go(f) {
    if (f.action === "autopsy" && f.subjectId) {
      const g = data.gens.find((x) => x.id === f.subjectId);
      if (g) { setApPrefill?.({ prompt: g.prompt ?? "", modelKey: g.model }); setPage("autopsy"); return; }
    }
    if (f.action === "fill-slot") {
      const slot = data.slots?.find((x) => x.id === f.subjectId);
      if (slot?.prompt) setGenPrefill?.({ prompt: slot.prompt, modelKey: slot.model_key ?? undefined, aspectRatio: "16:9", coverageSlotId: slot.id });
      setPage(slot?.prompt ? "generate" : "coverage");
      return;
    }
    setPage(f.action);
  }

  return (
    <div className="pb2">
      <style>{styles}</style>
      <div className="pb2-label">Where you are</div>

      <div className="pb2-stats">
        <div><div className="pb2-n">{s.locked}</div><div className="pb2-k">Shots locked</div></div>
        {s.open > 0 && <div><div className="pb2-n" style={{ color: "#E5B769" }}>{s.open}</div><div className="pb2-k">Still open</div></div>}
        {s.perKeeper && <div><div className="pb2-n">{s.perKeeper}</div><div className="pb2-k">Attempts per keeper</div></div>}
        {s.creditsPerKeeper && <div><div className="pb2-n" style={{ color: "var(--accent)" }}>{s.creditsPerKeeper}</div><div className="pb2-k">Credits per keeper</div></div>}
      </div>

      {findings.length === 0 ? (
        <div className="pb2-body" style={{ paddingTop: 14 }}>
          Nothing needs your attention on this project. Every shot with attempts has a keeper, and there's no planned work outstanding.
        </div>
      ) : (
        findings.map((f, i) => {
          const k = KIND[f.kind] ?? KIND.gap;
          return (
            <div className="pb2-find" key={i}>
              <div className="pb2-tag" style={{ color: k.color, border: `1px solid ${k.color}55` }}>{k.label}</div>
              <div className="pb2-title">{f.title}</div>
              <div className="pb2-body">{f.detail}</div>
              <button className="pb2-action" onClick={() => go(f)}>{f.actionLabel} →</button>
            </div>
          );
        })
      )}

      <Continuity projectId={project?.id} setPage={setPage} />

      <div className="pb2-body" style={{ fontSize: 9, marginTop: 14, opacity: 0.7 }}>
        Read from this project's own records — shots, takes, costs and decisions. Nothing here is inferred.
      </div>
    </div>
  );
}