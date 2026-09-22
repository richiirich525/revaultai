/*
  productionBrain — RevaultAI
  Every finding here is a fact from the project's own records. Nothing is
  inferred, nothing is guessed. If the data doesn't support a finding, the
  finding doesn't appear — which is why this can never invent project state.

  Pure functions over already-fetched rows, so it runs instantly and costs
  nothing.
*/

const REASON_LABELS = {
  identity: "identity drift", anatomy: "hands or anatomy", motion: "motion",
  camera: "camera", adherence: "prompt adherence", continuity: "continuity",
  performance: "performance", artifact: "artifacts",
};

// Findings are ordered by how much they're costing the creator right now.
const PRIORITY = { blocked: 0, waste: 1, decision: 2, gap: 3, ready: 4 };

export function buildFindings({ shots = [], gens = [], specs = [], observed = [], breakdowns = [], slots = [] }) {
  const out = [];
  const done = gens.filter((g) => g.status === "complete" || g.status === "failed");
  const bySelected = new Set(shots.map((s) => s.selected_generation_id).filter(Boolean));

  // --- Shots that have burned attempts without landing one ---
  for (const shot of shots) {
    if (shot.selected_generation_id) continue;
    const takes = done.filter((g) => g.shot_id === shot.id);
    if (takes.length === 0) continue;

    const spent = takes.reduce((s, g) => s + (Number(g.credits_spent) || 0), 0);
    const reasons = {};
    for (const t of takes) if (t.reject_reason) reasons[t.reject_reason] = (reasons[t.reject_reason] || 0) + 1;
    const top = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];

    if (takes.length >= 3) {
      out.push({
        kind: "blocked",
        title: `"${shot.name || "Untitled shot"}" has no keeper after ${takes.length} attempts`,
        detail: top && top[1] >= 2
          ? `${top[1]} of them were rejected for ${REASON_LABELS[top[0]] ?? top[0]}. ${spent} credits spent on this shot so far.`
          : `${spent} credits spent on this shot so far.`,
        action: top && top[1] >= 2 ? "autopsy" : "takes",
        actionLabel: top && top[1] >= 2 ? "Run an autopsy on the last attempt" : "Review the takes",
        subjectId: takes[takes.length - 1]?.id ?? shot.id,
        weight: takes.length * 10 + spent / 10,
      });
    } else {
      out.push({
        kind: "gap",
        title: `"${shot.name || "Untitled shot"}" has no selected take`,
        detail: `${takes.length} attempt${takes.length === 1 ? "" : "s"} generated, none chosen yet.`,
        action: "takes",
        actionLabel: "Pick a take",
        subjectId: shot.id,
        weight: 5,
      });
    }
  }

  // --- A recurring failure mode across the whole project ---
  const projectReasons = {};
  for (const g of done) if (g.reject_reason) projectReasons[g.reject_reason] = (projectReasons[g.reject_reason] || 0) + 1;
  const worst = Object.entries(projectReasons).sort((a, b) => b[1] - a[1])[0];
  if (worst && worst[1] >= 4) {
    out.push({
      kind: "waste",
      title: `${REASON_LABELS[worst[0]] ?? worst[0]} is your most common failure`,
      detail: `${worst[1]} takes rejected for it on this project. Worth checking whether a different model handles it better before spending more.`,
      action: "which-model",
      actionLabel: "Check model fit",
      weight: worst[1] * 3,
    });
  }

  // --- Specs planned but never generated ---
  const generatedSpecIds = new Set(gens.map((g) => g.film_spec_id).filter(Boolean));
  const unshot = specs.filter((s) => !generatedSpecIds.has(s.id));
  if (unshot.length > 0) {
    out.push({
      kind: "ready",
      title: `${unshot.length} planned shot${unshot.length === 1 ? "" : "s"} not generated yet`,
      detail: unshot.length <= 3
        ? `Still to shoot: ${unshot.map((s) => s.title || "untitled").join(", ")}.`
        : `Starting with "${unshot[0].title || "untitled"}".`,
      action: "specs",
      actionLabel: "Open the shot specs",
      weight: 4,
    });
  }

  // --- Ending states waiting on a decision ---
  const pending = observed.filter((o) => o.resolution === "pending" && (o.differences?.length ?? 0) > 0);
  if (pending.length > 0) {
    out.push({
      kind: "decision",
      title: `${pending.length} take${pending.length === 1 ? "" : "s"} ended differently from the plan`,
      detail: "Adopt what the footage shows or keep the plan — the next shot inherits whichever you choose.",
      action: "takes",
      actionLabel: "Review the endings",
      weight: pending.length * 6,
    });
  }

  // --- A breakdown with nothing generated from it ---
  const cold = breakdowns.filter((b) => !specs.some((s) => s.breakdown_id === b.id && generatedSpecIds.has(s.id)));
  if (cold.length > 0 && unshot.length === 0) {
    out.push({
      kind: "ready",
      title: `"${cold[0].title || "A scene breakdown"}" hasn't been shot`,
      detail: `${cold[0].shot_count ?? "Several"} shots planned, none generated.`,
      action: "scene-breakdown",
      actionLabel: "Open Scene Breakdown",
      weight: 3,
    });
  }

  // --- Essential coverage with no keeper yet ---
  const keeperIds = new Set(shots.map((s) => s.selected_generation_id).filter(Boolean));
  const coveredSlots = new Set(gens.filter((g) => g.coverage_slot_id && keeperIds.has(g.id)).map((g) => g.coverage_slot_id));
  const triedSlots = new Set(gens.filter((g) => g.coverage_slot_id).map((g) => g.coverage_slot_id));
  const openSlots = slots.filter((s) => s.priority === "essential" && !s.manual_status && !coveredSlots.has(s.id));
  if (openSlots.length > 0) {
    const untried = openSlots.filter((s) => !triedSlots.has(s.id));
    const next = untried[0] ?? openSlots[0];
    const triedCount = openSlots.length - untried.length;
    const one = openSlots.length === 1;
    out.push({
      kind: "gap",
      title: `${openSlots.length} essential setup${one ? "" : "s"} still ${one ? "has" : "have"} no keeper`,
      detail: `Still missing: ${openSlots.slice(0, 3).map((s) => s.slug).join(", ")}${openSlots.length > 3 ? `, and ${openSlots.length - 3} more` : ""}.`
        + (triedCount ? (one ? " It's been tried, but nothing's been chosen." : ` ${triedCount} of them ${triedCount === 1 ? "has" : "have"} been tried without a keeper.`) : "")
        + ` The scene can't be cut without ${one ? "it" : "them"}.`,
      action: "fill-slot",
      actionLabel: `Fill "${next.slug}"`,
      subjectId: next.id,
      weight: 20 + openSlots.length * 4,
    });
  }

  return out
    .sort((a, b) => (PRIORITY[a.kind] - PRIORITY[b.kind]) || (b.weight - a.weight))
    .slice(0, 6);
}

// Plain numbers, no interpretation.
export function buildSummary({ shots = [], gens = [] }) {
  const done = gens.filter((g) => g.status === "complete" || g.status === "failed");
  const locked = shots.filter((s) => s.selected_generation_id).length;
  const credits = done.reduce((s, g) => s + (Number(g.credits_spent) || 0), 0);
  return {
    shots: shots.length,
    locked,
    open: shots.length - locked,
    attempts: done.length,
    credits,
    perKeeper: locked > 0 ? Math.round((done.length / locked) * 10) / 10 : null,
    creditsPerKeeper: locked > 0 ? Math.round(credits / locked) : null,
  };
}