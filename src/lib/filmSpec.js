/*
  filmSpec — RevaultAI
  The structured representation of a shot. Creative intent lives here; the
  model-specific prompt is compiled from it. Everything is optional — a spec
  built from a rough idea is still a valid spec, just a thinner one.
*/

export const SPEC_VERSION = 1;

export function blankSpec() {
  return {
    _v: SPEC_VERSION,
    identity: { title: "", beat: null, purpose: "" },
    subjects: { characters: [], props: [], locations: [], vaultIds: [] },
    action: { primary: "", startState: "", endState: "" },
    camera: { shotSize: "", lens: "", height: "", angle: "", movement: "", layout: null },
    composition: { screenDirection: "", axis: null, positions: [], eyelines: [] },
    lighting: { keyDirection: "", quality: "", contrast: "", practicals: "" },
    style: { look: "", palette: "", texture: "" },
    timing: { durationSeconds: null, aspectRatio: "16:9" },
    performance: { register: "", notes: "" },
    continuityLocks: [],
    negatives: [],
    model: { target: "", compiledPrompt: "", transferReport: null },
  };
}

// Deep-merge a partial spec over a base, so each tool can contribute the
// fields it knows without clobbering what another tool already wrote.
export function mergeSpec(base, patch) {
  const out = { ...(base ?? blankSpec()) };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) out[k] = { ...(out[k] ?? {}), ...v };
    else if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

// How complete is this spec? Used to show the creator what's still thin.
export function specCoverage(spec) {
  const checks = [
    ["Subject", spec?.subjects?.characters?.length || spec?.subjects?.locations?.length],
    ["Action", spec?.action?.primary],
    ["Camera", spec?.camera?.shotSize && spec?.camera?.movement],
    ["Composition", spec?.composition?.positions?.length || spec?.composition?.screenDirection],
    ["Lighting", spec?.lighting?.keyDirection || spec?.lighting?.quality],
    ["Style", spec?.style?.look || spec?.style?.palette],
    ["Timing", spec?.timing?.durationSeconds],
    ["Performance", spec?.performance?.register || spec?.performance?.notes],
    ["Continuity locks", spec?.continuityLocks?.length],
  ];
  const filled = checks.filter(([, v]) => !!v);
  return { filled: filled.map(([k]) => k), missing: checks.filter(([, v]) => !v).map(([k]) => k), score: Math.round((filled.length / checks.length) * 100) };
}

// Build a spec from a Scene Breakdown shot plus the surrounding context.
export function specFromBreakdownShot(shot, ctx = {}) {
  return mergeSpec(blankSpec(), {
    identity: { title: shot.slug || "", beat: ctx.beat ?? null, purpose: ctx.logline || "" },
    subjects: {
      characters: (ctx.characters ?? []).map((c) => c.name),
      props: (ctx.props ?? []).map((p) => p.name),
      locations: (ctx.locations ?? []).map((l) => l.name),
      vaultIds: ctx.vaultIds ?? [],
    },
    action: { primary: shot.slug || "" },
    camera: { shotSize: shot.shot_size || "", movement: shot.camera_move || "" },
    lighting: { keyDirection: shot.lighting || "" },
    style: { look: ctx.style || "" },
    timing: { durationSeconds: shot.duration_seconds ?? null, aspectRatio: ctx.aspectRatio || "16:9" },
    continuityLocks: (ctx.characters ?? []).concat(ctx.locations ?? [], ctx.props ?? []).map((e) => `${e.name}: ${e.description}`),
    model: { target: ctx.modelKey || "", compiledPrompt: shot.prompt || "" },
  });
}