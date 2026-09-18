/*
  scriptSupervisor — RevaultAI
  Reads continuity across a whole project from what's already recorded:
  planned states, what the footage actually showed, decisions the creator
  made, and declared asset changes. Every finding here is structural — a
  contradiction between two records, not an opinion about the footage.
*/

const SEV = { break: 0, unresolved: 1, stale: 2, ok: 3 };

// Trim a state description to something readable in a list.
function short(s, n = 90) {
  const t = String(s || "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

export function structuralFindings({ specs = [], gens = [], shots = [], observed = [], mutations = [], vault = [] }) {
  const out = [];
  const ordered = [...specs].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));
  const selected = new Set(shots.map((s) => s.selected_generation_id).filter(Boolean));
  const obsByGen = Object.fromEntries(observed.map((o) => [o.generation_id, o]));
  const genBySpec = {};
  for (const g of gens) if (g.film_spec_id && selected.has(g.id)) genBySpec[g.film_spec_id] = g;

  // --- The state chain: does each shot start where the last one ended? ---
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const cur = ordered[i];
    const prevEnd = prev.spec?.action?.endState;
    const curStart = cur.spec?.action?.startState;
    if (!prevEnd || !curStart) continue;

    // If the previous shot's ending was adopted from footage, the chain should
    // follow the footage, not the plan.
    const prevGen = genBySpec[prev.id];
    const obs = prevGen ? obsByGen[prevGen.id] : null;
    if (obs?.resolution === "adopted" && obs.observed_end) {
      out.push({
        kind: "break",
        area: "state chain",
        title: `"${cur.title || "Shot " + (i + 1)}" still starts from the planned state`,
        detail: `You adopted what the footage showed at the end of "${prev.title || "the previous shot"}" — ${short(obs.observed_end)} — but this shot's start state is still the original plan: ${short(curStart)}.`,
        fix: "Update this shot's start state to match what was adopted, then recompile its prompt.",
        subject: cur.id,
        action: "specs",
      });
    }
  }

  // --- Decisions still outstanding ---
  for (const o of observed) {
    if (o.resolution !== "pending" || (o.differences?.length ?? 0) === 0) continue;
    const spec = specs.find((s) => s.id === o.film_spec_id);
    out.push({
      kind: "unresolved",
      area: "ending state",
      title: `"${spec?.title || "A shot"}" ended differently and hasn't been decided`,
      detail: o.differences.map((d) => `${d.aspect}: planned ${short(d.planned, 40)}, filmed ${short(d.observed, 40)}`).join(". ") + ".",
      fix: "Adopt the filmed state or keep the plan — everything after this inherits whichever you choose.",
      action: "takes",
    });
  }

  // --- Declared changes that no shot reflects ---
  for (const m of mutations) {
    const entry = vault.find((v) => v.id === m.entry_id);
    const after = ordered.filter((s) => (s.spec?.identity?.beat ?? 0) >= m.beat);
    if (after.length === 0) continue;
    const mentioned = after.some((s) =>
      JSON.stringify(s.spec || {}).toLowerCase().includes(String(m.modifier).toLowerCase().slice(0, 25))
    );
    if (!mentioned) {
      out.push({
        kind: "stale",
        area: "asset state",
        title: `${entry?.name || "An asset"} changes at beat ${m.beat}, but no later shot shows it`,
        detail: `You recorded "${short(m.event, 70)}" — the visual change is "${short(m.modifier, 70)}". ${after.length} shot${after.length === 1 ? "" : "s"} at or after that beat don't mention it.`,
        fix: "Rebuild those shots with the asset selected, or check the beat number is right.",
        action: "scene-breakdown",
      });
    }
  }

  // --- Debug errors never acted on ---
  for (const g of gens) {
    if (!selected.has(g.id) || !g.debug_report) continue;
    const errors = (g.debug_report.findings ?? []).filter((f) => f.severity === "error");
    if (errors.length === 0) continue;
    const spec = specs.find((s) => s.id === g.film_spec_id);
    out.push({
      kind: "unresolved",
      area: "selected take",
      title: `"${spec?.title || "A selected take"}" has ${errors.length} unresolved issue${errors.length === 1 ? "" : "s"}`,
      detail: errors.map((e) => e.observed).slice(0, 2).join(" "),
      fix: "This is the take you're using — either accept the difference or regenerate it.",
      action: "takes",
    });
  }

  // --- What's holding ---
  const chained = ordered.filter((s, i) => i > 0 && s.spec?.action?.startState && ordered[i - 1].spec?.action?.endState).length;
  if (chained > 0 && out.filter((f) => f.kind === "break").length === 0) {
    out.push({
      kind: "ok",
      area: "state chain",
      title: `State carries cleanly across ${chained + 1} shots`,
      detail: "Each shot begins where the one before it ends.",
      fix: "",
    });
  }

  return out.sort((a, b) => SEV[a.kind] - SEV[b.kind]).slice(0, 12);
}

// The narrative layer needs an LLM — assemble what it should read.
export function narrativeContext({ specs = [], observed = [], mutations = [], vault = [] }) {
  const ordered = [...specs].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));
  return {
    shots: ordered.map((s, i) => ({
      n: i + 1,
      title: s.title,
      beat: s.spec?.identity?.beat ?? null,
      purpose: s.spec?.identity?.purpose ?? "",
      action: s.spec?.action?.primary ?? "",
      startState: s.spec?.action?.startState ?? "",
      endState: s.spec?.action?.endState ?? "",
      characters: s.spec?.subjects?.characters ?? [],
      performance: s.spec?.performance?.notes ?? "",
    })),
    adopted: observed.filter((o) => o.resolution === "adopted").map((o) => o.observed_end),
    changes: mutations.map((m) => ({
      beat: m.beat,
      asset: vault.find((v) => v.id === m.entry_id)?.name ?? "unknown",
      event: m.event,
    })),
  };
}