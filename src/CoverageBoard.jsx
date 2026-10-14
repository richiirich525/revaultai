import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { getSessionToken } from "./lib/session.js";
import { GEN_MODELS, DEFAULT_MODEL, modelOf, snapDuration, costOf } from "./lib/genModels.js";

/*
  CoverageBoard — RevaultAI
  Every saved coverage setup as a slot: red until it's tried, amber with
  attempts but no keeper, green once a keeper is chosen in Takes. Status is
  worked out from the takes themselves, so there's nothing to keep in sync.
*/

const STATUS = {
  empty:     { color: "#F87171", label: "Not tried" },
  attempted: { color: "#E5B769", label: "No keeper yet" },
  covered:   { color: "#4ADE80", label: "Covered" },
  skipped:   { color: "var(--muted)", label: "Skipped" },
};
const PRIORITY = { essential: 0, recommended: 1, optional: 2 };

const css = `
  .cb { border: 1px solid var(--border); border-radius: 8px; padding: 22px 24px; margin-bottom: 24px; background: var(--surface); }
  .cb-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; }
  .cb-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .cb-plan { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border); }
  .cb-plan:first-of-type { border-top: none; padding-top: 0; margin-top: 4px; }
  .cb-plan-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
  .cb-plan-name { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.4; max-width: 620px; }
  .cb-slot { display: grid; grid-template-columns: 12px 1fr auto; gap: 12px; align-items: start; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .cb-slot:last-child { border-bottom: none; }
  .cb-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; }
  .cb-slug { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); }
  .cb-tag { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; border: 1px solid var(--border); border-radius: 3px; padding: 1px 6px; margin-left: 8px; color: var(--muted); vertical-align: 1px; }
  .cb-tag.essential { color: var(--accent); border-color: rgba(123,63,228,0.45); }
  .cb-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 3px; line-height: 1.6; }
  .cb-acts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .cb-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 3px; padding: 5px 10px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.08em; cursor: pointer; white-space: nowrap; }
  .cb-btn:hover { color: var(--text); border-color: var(--muted); }
  .cb-btn.go { color: var(--accent); border-color: var(--accent); }
  .cb-check { width: 13px; height: 13px; margin-top: 3px; accent-color: var(--accent); cursor: pointer; }
  .cb-batch { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; }
  .cb-batch-sum { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.7; }
  .cb-batch-sum b { color: var(--text); font-weight: 400; }
  .cb-sel { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.08em; color: var(--muted); background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0; }
  .cb-sel:hover { color: var(--accent); }
  .cb-pick { background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 3px; padding: 5px 8px; font-family: 'DM Mono', monospace; font-size: 10px; }
  @media (max-width: 700px) { .cb-slot { grid-template-columns: 12px 1fr; } .cb-acts { grid-column: 2; justify-content: flex-start; } }
`;

export default function CoverageBoard({ project, user, setPage, setGenPrefill, notify }) {
  const [slots, setSlots] = useState(null);
  const [attempts, setAttempts] = useState({});
  const [keepers, setKeepers] = useState(new Set());

  async function load() {
    if (!user?.id || !project?.id) { setSlots([]); return; }
    const { data: s } = await supabase
      .from("coverage_slots")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .order("sort", { ascending: true });
    const list = s ?? [];
    const ids = list.map((x) => x.id);
    let gens = [];
    if (ids.length) {
      const { data: g } = await supabase.from("generations").select("id, coverage_slot_id").in("coverage_slot_id", ids);
      gens = g ?? [];
    }
    const genIds = gens.map((g) => g.id);
    let chosen = new Set();
    if (genIds.length) {
      const { data: sh } = await supabase.from("shots").select("selected_generation_id").in("selected_generation_id", genIds);
      chosen = new Set((sh ?? []).map((x) => x.selected_generation_id));
    }
    const perSlot = {};
    const keeperSlots = new Set();
    for (const g of gens) {
      perSlot[g.coverage_slot_id] = (perSlot[g.coverage_slot_id] || 0) + 1;
      if (chosen.has(g.id)) keeperSlots.add(g.coverage_slot_id);
    }
    setAttempts(perSlot);
    setKeepers(keeperSlots);
    setSlots(list);
  }
  useEffect(() => { load(); }, [user?.id, project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusOf = (slot) =>
    slot.manual_status === "skipped" ? "skipped"
    : slot.manual_status === "covered" || keepers.has(slot.id) ? "covered"
    : attempts[slot.id] ? "attempted"
    : "empty";

  async function setManual(slot, value) {
    const { error } = await supabase.from("coverage_slots").update({ manual_status: value }).eq("id", slot.id);
    if (error) { notify?.("Couldn't update: " + error.message); return; }
    setSlots((l) => l.map((x) => (x.id === slot.id ? { ...x, manual_status: value } : x)));
  }

  async function removePlan(planId, label) {
    if (!window.confirm(`Stop tracking "${label}"? Takes you've generated for it are kept.`)) return;
    const { error } = await supabase.from("coverage_slots").delete().eq("plan_id", planId);
    if (error) { notify?.("Couldn't remove: " + error.message); return; }
    setSlots((l) => l.filter((x) => x.plan_id !== planId));
  }

  // --- Filling several slots in one go -----------------------------------
  // Each slot becomes its own generation job, charged separately by the
  // server. The cost shown here comes from lib/genModels.js, which is checked
  // against the server's own table — so the figure confirmed is the figure
  // taken. Capped, because this spends real credits on one click.
  const MAX_BATCH = 10;
  const [picked, setPicked] = useState(new Set());
  const [batchModel, setBatchModel] = useState(DEFAULT_MODEL);
  const [running, setRunning] = useState(null);

  // A slot's own model when it has one, otherwise the model chosen below.
  const modelFor = (slot) => (slot.model_key && modelOf(slot.model_key).key === slot.model_key)
    ? slot.model_key
    : batchModel;

  const togglePick = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else if (next.size < MAX_BATCH) next.add(id);
    return next;
  });

  async function runBatch(fillable) {
    const chosen = fillable.filter((x) => picked.has(x.id));
    if (!chosen.length) return;

    const jobs = chosen.map((slot) => {
      const key = modelFor(slot);
      const seconds = snapDuration(key, slot.duration_seconds);
      return { slot, key, seconds, cost: costOf(key, slot.duration_seconds) };
    });
    const total = jobs.reduce((n, j) => n + j.cost, 0);
    const lines = jobs.map((j) => `  ${j.slot.slug} — ${modelOf(j.key).label}, ${j.seconds}s, ${j.cost} credits`).join("\n");

    if (!window.confirm(
      `Generate ${jobs.length} setup${jobs.length === 1 ? "" : "s"} for ${total} credits?\n\n${lines}\n\n` +
      `Each one is charged separately. If your balance runs out part way, the rest stop and you keep what was made.`
    )) return;

    let spent = 0;
    const failed = [];
    for (const [i, j] of jobs.entries()) {
      setRunning(`${i + 1} of ${jobs.length}: ${j.slot.slug}`);
      try {
        const token = await getSessionToken();
        const r = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: j.slot.prompt,
            model: j.key,
            duration: j.seconds,
            aspectRatio: modelOf(j.key).ratios[0],
            projectId: project.id,
            coverageSlotId: j.slot.id,
          }),
        });
        const out = await r.json().catch(() => ({}));
        if (!r.ok) { failed.push(`${j.slot.slug}: ${out.error || "could not start"}`); continue; }
        spent += j.cost;
      } catch (err) {
        failed.push(`${j.slot.slug}: ${err.message}`);
      }
    }

    setRunning(null);
    setPicked(new Set());
    const started = jobs.length - failed.length;
    notify?.(
      failed.length
        ? `${started} of ${jobs.length} started, ${spent} credits spent. Didn't start — ${failed.join("; ")}`
        : `${started} setup${started === 1 ? "" : "s"} generating, ${spent} credits spent. They'll appear in Takes.`
    );
    load();
  }

  function fill(slot) {
    setGenPrefill?.({ prompt: slot.prompt, modelKey: slot.model_key ?? undefined, aspectRatio: "16:9", coverageSlotId: slot.id });
    setPage("generate");
  }

  if (slots === null) return null;

  if (slots.length === 0) {
    return (
      <div className="cb">
        <style>{css}</style>
        <div className="cb-label">Coverage</div>
        <div className="cb-body">
          No coverage tracked for this project yet. Plan a scene's coverage and save it here — each setup becomes a slot that turns green once it has a keeper.
        </div>
        <button className="cb-btn go" style={{ marginTop: 10 }} onClick={() => setPage("coverage")}>Plan coverage →</button>
      </div>
    );
  }

  // Slots that can actually be shot: not settled, and carrying a prompt.
  const canFill = (slot) =>
    !["covered", "skipped"].includes(statusOf(slot)) && !!slot.prompt;
  const fillable = slots.filter(canFill);
  const chosen = fillable.filter((x) => picked.has(x.id));
  const batchTotal = chosen.reduce((n, x) => n + costOf(modelFor(x), x.duration_seconds), 0);
  const needsModel = chosen.filter((x) => !x.model_key || modelOf(x.model_key).key !== x.model_key).length;

  const plans = [];
  for (const s of slots) {
    let p = plans.find((x) => x.id === s.plan_id);
    if (!p) { p = { id: s.plan_id, label: s.plan_label || "Coverage plan", slots: [] }; plans.push(p); }
    p.slots.push(s);
  }

  return (
    <div className="cb">
      <style>{css}</style>
      <div className="cb-label">Coverage</div>
      {fillable.length > 1 && (
        <div className="cb-batch">
          {picked.size === 0 ? (
            <>
              <div className="cb-batch-sum">
                Tick the setups you want to shoot and they go out together &mdash; up to {MAX_BATCH} at a time.
              </div>
              <button className="cb-sel" onClick={() => setPicked(new Set(fillable.slice(0, MAX_BATCH).map((x) => x.id)))}>
                select the first {Math.min(MAX_BATCH, fillable.length)}
              </button>
            </>
          ) : (
            <>
              <div className="cb-batch-sum">
                <b>{picked.size}</b> selected &middot; <b>{batchTotal}</b> credits
                {needsModel > 0 && <> &middot; {needsModel} {needsModel === 1 ? "has" : "have"} no saved model</>}
              </div>
              {needsModel > 0 && (
                <select className="cb-pick" value={batchModel} onChange={(e) => setBatchModel(e.target.value)} disabled={!!running}>
                  {GEN_MODELS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label} &mdash; {m.costPerSecond}/s</option>
                  ))}
                </select>
              )}
              <button className="cb-btn go" disabled={!!running} onClick={() => runBatch(fillable)}>
                {running ? running : `Generate ${picked.size} \u2192`}
              </button>
              <button className="cb-sel" onClick={() => setPicked(new Set())} disabled={!!running}>clear</button>
            </>
          )}
        </div>
      )}

      {plans.map((p) => {
        const sorted = [...p.slots].sort((a, b) => (PRIORITY[a.priority] - PRIORITY[b.priority]) || (a.sort - b.sort));
        const essential = sorted.filter((s) => s.priority === "essential");
        const essentialDone = essential.filter((s) => statusOf(s) === "covered").length;
        const allDone = sorted.filter((s) => ["covered", "skipped"].includes(statusOf(s))).length;
        return (
          <div className="cb-plan" key={p.id}>
            <div className="cb-plan-head">
              <div className="cb-plan-name">{p.label}</div>
              <div className="cb-body" style={{ fontSize: 10 }}>
                {essential.length > 0 && <span style={{ color: essentialDone === essential.length ? "#4ADE80" : "var(--text)" }}>{essentialDone} of {essential.length} essential covered</span>}
                {essential.length > 0 && " · "}
                {allDone} of {sorted.length} settled
                <span style={{ color: "var(--muted)", cursor: "pointer", marginLeft: 10, textDecoration: "underline" }} onClick={() => removePlan(p.id, p.label)}>stop tracking</span>
              </div>
            </div>
            {sorted.map((s) => {
              const st = statusOf(s);
              const k = STATUS[st];
              const tries = attempts[s.id] || 0;
              return (
                <div className="cb-slot" key={s.id}>
                  <div className="cb-dot" style={{ background: k.color }} title={k.label} />
                  <div>
                    <div className="cb-slug">
                      {canFill(s) && (
                        <input
                          type="checkbox"
                          className="cb-check"
                          checked={picked.has(s.id)}
                          disabled={!!running || (!picked.has(s.id) && picked.size >= MAX_BATCH)}
                          onChange={() => togglePick(s.id)}
                          aria-label={"Select " + s.slug + " for batch generation"}
                          style={{ marginRight: 8, verticalAlign: "middle" }}
                        />
                      )}
                      {s.slug}
                      <span className={"cb-tag " + s.priority}>{s.priority}</span>
                    </div>
                    <div className="cb-meta">
                      <span style={{ color: k.color }}>{k.label}</span>
                      {tries > 0 && ` · ${tries} attempt${tries === 1 ? "" : "s"}`}
                      {s.shot_size && ` · ${s.shot_size}`}
                      {s.duration_seconds && ` · ${s.duration_seconds}s`}
                    </div>
                    {s.purpose && st !== "covered" && <div className="cb-meta">{s.purpose}</div>}
                  </div>
                  <div className="cb-acts">
                    {st !== "covered" && st !== "skipped" && s.prompt && <button className="cb-btn go" onClick={() => fill(s)}>Fill this slot →</button>}
                    {/* One angle can be redone without touching the keepers on the others. */}
                    {st === "covered" && s.prompt && <button className="cb-btn" onClick={() => fill(s)}>Shoot it again</button>}
                    {st === "attempted" && <button className="cb-btn" onClick={() => setPage("takes")}>Pick a keeper</button>}
                    {!s.manual_status && st !== "covered" && <button className="cb-btn" onClick={() => setManual(s, "covered")} title="Covered some other way">Mark covered</button>}
                    {!s.manual_status && st !== "covered" && s.priority !== "essential" && <button className="cb-btn" onClick={() => setManual(s, "skipped")}>Skip</button>}
                    {s.manual_status && <button className="cb-btn" onClick={() => setManual(s, null)}>Undo</button>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}