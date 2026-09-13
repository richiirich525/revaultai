import { useState } from "react";

/*
  ToolsPage — RevaultAI
  One indexable page listing every tool, grouped by where it sits in a
  production. Adding a tool here is one object in TOOLS.
*/

const TOOLS = [
  // --- Plan ---
  {
    group: "Plan",
    name: "Scene Breakdown",
    page: "scene-breakdown",
    free: true,
    blurb: "Paste a scene or logline and get a numbered shot list — size, camera move, lighting, duration and a full prompt per shot. Character and location descriptions are locked and repeated word-for-word across every shot, which is what keeps them recognisable from cut to cut.",
  },
  {
    group: "Plan",
    name: "Shot Director",
    page: "shot-director",
    free: true,
    blurb: "One dramatic beat, three genuinely different ways to shoot it. Each approach comes with a shot size, lens, camera move, lighting, blocking, duration, a full prompt, and the craft reasoning for why it works.",
  },
  {
    group: "Plan",
    name: "Coverage Planner",
    page: "coverage",
    free: true,
    blurb: "The setups an editor actually needs to cut your scene — master, singles, over-the-shoulders, reactions, inserts — ranked by how essential each is. The most useful part is what's missing, and the editorial problem it creates.",
  },
  {
    group: "Plan",
    name: "Performance & Blocking",
    page: "blocking",
    free: true,
    blurb: "Where people stand and move relative to camera, what their bodies do, and how each line lands. Your dialogue comes back exactly as you wrote it with delivery notes attached — nothing gets rewritten.",
  },
  {
    group: "Plan",
    name: "Frame Planner",
    page: "frame-planner",
    free: true,
    blurb: "Decide where a shot starts and where it lands. Two frame descriptions, an image prompt for each, the motion between them, and a note on what must stay identical for the shot to read as continuous.",
  },

  // --- Write ---
  {
    group: "Write",
    name: "Prompt Builder",
    page: "prompt-builder",
    free: true,
    blurb: "Turn a rough idea into a structured prompt written in real cinematography language. Six cinematic style presets, a strength control, and the craft language it applies is shown to you rather than hidden. Attach a reference still and it writes the shot from what it sees.",
  },
  {
    group: "Write",
    name: "Prompt Library",
    page: "prompts",
    free: true,
    blurb: "Thirty-nine director-grade prompts across three model pages and eight genres, each one copy-ready. The continuity set carries notes explaining what makes each prompt survive a continuity audit.",
  },
  {
    group: "Write",
    name: "Which Model?",
    page: "which-model",
    free: true,
    blurb: "Describe a shot and get ranked model recommendations with a real duration, a real credit cost, and an honest trade-off for each — plus a difficulty score naming what's likely to break before you spend anything.",
  },

  // --- Review ---
  {
    group: "Review",
    name: "Continuity Check",
    page: "continuity-check",
    free: true,
    blurb: "A script supervisor's read on a set of shot prompts: characters described two ways, wardrobe that drifts, unmotivated lighting, and reverse angles that cross the 180-degree line. It flags and quotes the exact wording — it never rewrites.",
  },
  {
    group: "Review",
    name: "Generation Autopsy",
    page: "autopsy",
    free: true,
    blurb: "Paste the prompt behind a disappointing generation and find out what in the wording broke it, ranked by confidence, with the offending phrase quoted — and a revised prompt built to hold.",
  },

  // --- Make ---
  {
    group: "Make",
    name: "Generate",
    page: "generate",
    free: false,
    blurb: "Seedance 2.5, Veo 3.1, Kling 3.0 and Wan 2.6 behind one credit balance. Text to video or animate from a still, at 16:9, 9:16 or 1:1. No subscription, no API keys — pay per second of output.",
  },
  {
    group: "Make",
    name: "Finish",
    page: "generate",
    free: false,
    blurb: "Upscale to 1080p or 4K, extend a clip past the length cap, and re-sync dialogue with lip sync — all running on a clip you already made.",
  },

  // --- Produce ---
  {
    group: "Produce",
    name: "The Vault",
    page: "vault",
    free: false,
    signedIn: true,
    blurb: "Your production bible. Save characters, locations, props and looks once — with reference images — and they drop into every tool locked, reproduced word-for-word rather than rewritten each time.",
  },
  {
    group: "Produce",
    name: "Takes",
    page: "takes",
    free: false,
    signedIn: true,
    blurb: "Every generation of a shot, grouped automatically. Select the one you'll use, star, reject, annotate, and compare two side by side — so a project picked up next week is already decided.",
  },
  {
    group: "Produce",
    name: "Projects",
    page: "projects",
    free: false,
    signedIn: true,
    blurb: "Keep a film's characters, scenes, shots and takes together. Set a project active and new work files itself under it. Nothing requires a project, and deleting one never deletes work.",
  },
];

const GROUPS = [
  ["Plan", "Before you generate anything"],
  ["Write", "Getting the prompt right"],
  ["Review", "Catching problems early"],
  ["Make", "Generating and finishing"],
  ["Produce", "Keeping a film together"],
];

const styles = `
  .tl-wrap { max-width: 900px; margin: 0 auto; padding: 0 48px; }
  .tl-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .tl-group { margin-top: 52px; }
  .tl-group-name { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 300; color: var(--text); line-height: 1.2; }
  .tl-group-sub { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 20px; margin-top: 6px; }
  .tl-card { border: 1px solid var(--border); border-radius: 8px; padding: 24px 26px; margin-bottom: 14px; background: var(--surface); cursor: pointer; transition: border-color 0.25s; }
  .tl-card:hover { border-color: var(--accent); }
  .tl-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  .tl-name { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: var(--text); }
  .tl-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; border-radius: 3px; padding: 3px 9px; }
  .tl-free { color: var(--accent); border: 1px solid rgba(123,63,228,0.35); }
  .tl-acct { color: var(--muted); border: 1px solid var(--border); }
  @media (max-width: 760px) { .tl-wrap { padding: 0 24px; } }
`;

export default function ToolsPage({ setPage, user, onSignInClick }) {
  const [filter, setFilter] = useState("all");
  const freeCount = TOOLS.filter((t) => t.free).length;

  function open(t) {
    if (t.signedIn && !user) { onSignInClick?.(); return; }
    setPage(t.page);
  }

  const shown = filter === "free" ? TOOLS.filter((t) => t.free) : TOOLS;

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">The Toolkit</div>
        <div className="page-hdr-title">Tools</div>
        <div className="page-hdr-sub">Everything for planning, writing, checking and making an AI film — {freeCount} of them free with no account.</div>
      </div>

      <section className="section">
        <div className="tl-wrap">
          <div className="tl-body" style={{ maxWidth: 620 }}>
            Most AI video platforms give you a prompt box and wish you luck. These are the parts either side of that — working out which shots a scene needs, how to shoot each one, which model suits it, what it will cost, and what's drifting before you spend anything on it.
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
            <button
              className="btn-ghost"
              style={{ fontSize: 11, borderColor: filter === "all" ? "var(--accent)" : undefined, color: filter === "all" ? "var(--accent)" : undefined }}
              onClick={() => setFilter("all")}
            >All {TOOLS.length}</button>
            <button
              className="btn-ghost"
              style={{ fontSize: 11, borderColor: filter === "free" ? "var(--accent)" : undefined, color: filter === "free" ? "var(--accent)" : undefined }}
              onClick={() => setFilter("free")}
            >Free, no account ({freeCount})</button>
          </div>

          {GROUPS.map(([g, sub]) => {
            const items = shown.filter((t) => t.group === g);
            if (items.length === 0) return null;
            return (
              <div className="tl-group" key={g}>
                <div className="tl-group-name">{g}</div>
                <div className="tl-group-sub">{sub}</div>
                {items.map((t) => (
                  <div className="tl-card" key={t.name} onClick={() => open(t)}>
                    <div className="tl-head">
                      <span className="tl-name">{t.name}</span>
                      {t.free
                        ? <span className="tl-tag tl-free">Free · no account</span>
                        : t.signedIn
                          ? <span className="tl-tag tl-acct">Free with an account</span>
                          : <span className="tl-tag tl-acct">Uses credits</span>}
                    </div>
                    <div className="tl-body">{t.blurb}</div>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 56 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Bring your story.</div>
            <div className="tl-body" style={{ maxWidth: 460, margin: "0 auto 28px" }}>
              Start anywhere — break down a scene, or just describe a shot and see what comes back. Nothing here asks for an account until you generate.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setPage("scene-breakdown")}>Break down a scene</button>
              <button className="btn-ghost" onClick={() => setPage("explore")}>Browse the gallery</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}