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
    action: { primary: shot.slug || "", startState: shot.start_state || "", endState: shot.end_state || "" },
    camera: { shotSize: shot.shot_size || "", movement: shot.camera_move || "" },
    lighting: { keyDirection: shot.lighting || "" },
    style: { look: ctx.style || "" },
    timing: { durationSeconds: shot.duration_seconds ?? null, aspectRatio: ctx.aspectRatio || "16:9" },
    continuityLocks: (ctx.characters ?? []).concat(ctx.locations ?? [], ctx.props ?? []).map((e) => `${e.name}: ${e.description}`),
    model: { target: ctx.modelKey || "", compiledPrompt: shot.prompt || "" },
  });
}

/*
  What each model can actually do. The compiler uses this to decide what
  transfers cleanly, what needs rewording, and what has to be dropped — and
  says so rather than silently losing the creator's intent.
*/
export const MODEL_PROFILES = {
  "veo-3.1": {
    label: "Veo 3.1",
    maxSeconds: 8,
    ratios: ["16:9", "9:16"],
    audio: true, dialogue: true,
    strengths: ["faces", "close work", "dialogue", "image quality"],
    weak: ["fast action", "crowds"],
    phrasing: "Responds to explicit sound and dialogue cues. Put the spoken line in quotes. Detailed cinematography lands well.",
  },
  "kling-3.0": {
    label: "Kling 3.0",
    maxSeconds: 10,
    ratios: ["16:9", "9:16", "1:1"],
    audio: false, dialogue: false,
    strengths: ["motion", "action", "crowds", "physical performance"],
    weak: ["dialogue", "long takes"],
    phrasing: "Describe motion precisely and keep the camera move simple — a complex move competes with subject motion.",
  },
  "wan-2.6": {
    label: "Wan 2.6",
    maxSeconds: 15,
    ratios: ["16:9", "9:16", "1:1"],
    audio: false, dialogue: false,
    strengths: ["single subject", "iteration", "cost"],
    weak: ["crowds", "simultaneous actions", "dialogue"],
    phrasing: "One clear subject doing one clear action. Strip secondary business.",
  },
  "seedance-2.5": {
    label: "Seedance 2.5 — Flagship",
    maxSeconds: 30,
    ratios: ["16:9", "9:16", "1:1", "21:9"],
    audio: true, dialogue: true,
    strengths: ["long takes", "physics", "camera control", "audio"],
    weak: ["cost"],
    phrasing: "Director-level camera language works. Long continuous takes hold.",
  },
  "seedance-2.5-480": { label: "Seedance 2.5 — Draft", maxSeconds: 30, ratios: ["16:9", "9:16", "1:1", "21:9"], audio: true, dialogue: true, strengths: ["long takes", "cheap testing"], weak: ["resolution"], phrasing: "Same as flagship at draft resolution — use to prove a long take before paying for it." },
  "seedance-2.0": { label: "Seedance 2.0 — Flagship", maxSeconds: 15, ratios: ["16:9", "9:16", "1:1", "21:9"], audio: true, dialogue: true, strengths: ["physics", "audio", "camera control"], weak: [], phrasing: "Director-level camera language works." },
  "seedance-2.0-480": { label: "Seedance 2.0 — Draft", maxSeconds: 15, ratios: ["16:9", "9:16", "1:1", "21:9"], audio: true, dialogue: true, strengths: ["cheap testing"], weak: ["resolution"], phrasing: "Draft resolution for testing." },
};

/*
  Compare a spec against a target model and report what transfers.
  This runs locally — no API call — so switching models is instant.
*/
export function transferReport(spec, targetKey) {
  const p = MODEL_PROFILES[targetKey];
  if (!p) return null;

  const carried = [];
  const rewritten = [];
  const unsupported = [];

  const add = (arr, what, why) => arr.push(why ? `${what} — ${why}` : what);

  // Duration
  const d = spec?.timing?.durationSeconds;
  if (d) {
    if (d <= p.maxSeconds) add(carried, `${d}s duration`);
    else add(unsupported, `${d}s duration`, `${p.label} caps at ${p.maxSeconds}s. Shorten the shot, or split it.`);
  }

  // Aspect ratio
  const r = spec?.timing?.aspectRatio;
  if (r) {
    if (p.ratios.includes(r)) add(carried, `${r} framing`);
    else add(unsupported, `${r} framing`, `${p.label} supports ${p.ratios.join(", ")}.`);
  }

  // Audio and dialogue
  const wantsDialogue = /".+"|dialogue|says|speaks|line/i.test(spec?.performance?.notes || "") ||
                        /".+"/.test(spec?.model?.compiledPrompt || "");
  if (wantsDialogue) {
    if (p.dialogue) add(carried, "spoken dialogue", `${p.label} generates synchronised audio`);
    else add(unsupported, "spoken dialogue", `${p.label} has no audio. Generate silent and add sound in post, or use an audio-capable model.`);
  }

  // Straight transfers
  for (const [label, value] of [
    ["shot size", spec?.camera?.shotSize],
    ["lens intent", spec?.camera?.lens],
    ["camera movement", spec?.camera?.movement],
    ["lighting", spec?.lighting?.keyDirection || spec?.lighting?.quality],
    ["visual style", spec?.style?.look || spec?.style?.palette],
    ["blocking and screen direction", spec?.composition?.positions?.length ? "yes" : ""],
    ["performance register", spec?.performance?.register],
  ]) if (value) add(carried, label);

  // Locks always transfer — that's the point of them
  const locks = spec?.continuityLocks?.length ?? 0;
  if (locks) add(carried, `${locks} continuity lock${locks === 1 ? "" : "s"}`, "reproduced verbatim");

  // Phrasing changes
  if (p.phrasing) add(rewritten, "prompt phrasing", p.phrasing);
  if (targetKey === "kling-3.0" && /orbit|crane|complex|whip/i.test(spec?.camera?.movement || "")) {
    add(rewritten, "camera move", "simplified — Kling holds subject motion better when the camera is simple");
  }
  if (targetKey === "wan-2.6" && (spec?.subjects?.characters?.length ?? 0) > 1) {
    add(rewritten, "multiple characters", "Wan is strongest with one subject — consider splitting the shot");
  }

  return { model: p.label, carried, rewritten, unsupported, safe: unsupported.length === 0 };
}