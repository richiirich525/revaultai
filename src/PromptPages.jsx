import { useState } from "react";
import { MODELS, getModel, genresFor } from "./prompts/models.js";

/*
  PromptPages — RevaultAI
  Two exported components:
    PromptIndexPage  -> /prompts        (hub listing every model)
    PromptModelPage  -> /prompts/[slug] (one model's prompt set)
  Content lives in src/prompts/models.js. Adding a model there is all that's
  needed for it to appear here, get routed, and get prerendered.
*/

const styles = `
  .pd-intro { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.95; max-width: 660px; margin-bottom: 40px; }
  .pd-cta { border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); padding: 22px 26px; margin-bottom: 48px; max-width: 720px; }
  .pd-cta-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
  .pd-cta-text { font-size: 14px; color: var(--text); line-height: 1.7; margin-bottom: 16px; }
  .pd-cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .pd-card { border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); padding: 26px 28px; margin-bottom: 22px; }
  .pd-card-num { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; }
  .pd-card-title { font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 700; color: var(--text); margin-bottom: 16px; }
  .pd-prompt { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.9; white-space: pre-wrap; background: var(--bg3); border: 1px solid var(--border); border-radius: 5px; padding: 18px 20px; margin-bottom: 14px; }
  .pd-copy { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; background: none; border: 1px solid var(--border); color: var(--muted); padding: 8px 16px; border-radius: 3px; cursor: pointer; transition: all 0.2s; }
  .pd-copy:hover { color: var(--accent); border-color: var(--accent); }
  .pd-copy.done { color: #4ADE80; border-color: rgba(74,222,128,0.4); }
  .pd-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
  .pd-model { border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); padding: 26px 28px; cursor: pointer; transition: border-color 0.25s; }
  .pd-model:hover { border-color: var(--accent); }
  .pd-model-name { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .pd-model-maker { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; }
  .pd-model-desc { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .pd-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
  .pd-chip { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; background: none; border: 1px solid var(--border); color: var(--muted); padding: 8px 15px; border-radius: 3px; cursor: pointer; transition: all 0.2s; }
  .pd-chip:hover { color: var(--text); border-color: var(--muted); }
  .pd-chip.active { color: var(--accent); border-color: var(--accent); background: var(--accent-dim); }
  .pd-genre { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
  .pd-count { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.08em; margin-bottom: 20px; }
  .pd-also { border-top: 1px solid var(--border); margin-top: 48px; padding-top: 32px; }
  .pd-also-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-bottom: 16px; }
  @media (max-width: 860px) { .pd-grid { grid-template-columns: 1fr; } .pd-prompt { font-size: 11px; padding: 14px 15px; } }
`;

function CtaBanner({ setPage }) {
  return (
    <div className="pd-cta">
      <div className="pd-cta-label">Free, no account</div>
      <div className="pd-cta-text">
        Skip the blank page. Build your own shot in the free Cinematic Prompt Builder — no sign-in, no credits — or generate natively on RevaultAI.
      </div>
      <div className="pd-cta-row">
        <button className="btn-primary" onClick={() => setPage("prompt-builder")}>Open the Prompt Builder</button>
        <button className="btn-ghost" onClick={() => setPage("generate")}>Generate on RevaultAI</button>
      </div>
    </div>
  );
}

export function PromptIndexPage({ setPage, openPromptModel }) {
  return (
    <div className="page">
      <style>{styles}</style>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Prompt Directory</div>
        <div className="page-hdr-title">AI Video Prompts</div>
        <div className="page-hdr-sub">Director-grade, copy-and-paste prompts written for each model's strengths.</div>
      </div>
      <section className="section">
        <div className="pd-intro">
          Every model rewards a different kind of writing. These are free, copy-and-paste prompts built around
          what each one actually does well — long unbroken takes, spoken performance, or fast physical action.
          No sign-in required.
        </div>
        <CtaBanner setPage={setPage} />
        <div className="pd-grid">
          {MODELS.map((m) => (
            <div key={m.slug} className="pd-model" onClick={() => openPromptModel(m.slug)}>
              <div className="pd-model-name">{m.name}</div>
              <div className="pd-model-maker">{m.maker}</div>
              <div className="pd-model-desc">{m.prompts.length} prompts across {genresFor(m).length} genres, built for {m.strength}.</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PromptModelPage({ slug, setPage, openPromptModel }) {
  const model = getModel(slug);
  const [copied, setCopied] = useState(null);
  const [genre, setGenre] = useState("All");

  if (!model) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-text">Prompt set not found.</div>
          <button className="btn-ghost" style={{ marginTop: 20 }} onClick={() => setPage("prompts")}>All prompt sets</button>
        </div>
      </div>
    );
  }

  async function copy(key, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  const available = genresFor(model);
  const shown = genre === "All" ? model.prompts : model.prompts.filter((p) => p.genre === genre);
  const others = MODELS.filter((m) => m.slug !== model.slug);

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="back-btn" onClick={() => setPage("prompts")}>&larr; Prompt Directory</div>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">{model.maker}</div>
        <div className="page-hdr-title">{model.h1}</div>
        <div className="page-hdr-sub">{model.prompts.length} free prompts built for {model.strength}.</div>
      </div>
      <section className="section">
        <div className="pd-intro">{model.intro}</div>
        <CtaBanner setPage={setPage} />
        <div className="pd-filters">
          <button className={"pd-chip" + (genre === "All" ? " active" : "")} onClick={() => setGenre("All")}>All ({model.prompts.length})</button>
          {available.map((g) => (
            <button key={g} className={"pd-chip" + (genre === g ? " active" : "")} onClick={() => setGenre(g)}>{g}</button>
          ))}
        </div>
        <div className="pd-count">
          Showing {shown.length} of {model.prompts.length} prompts{genre !== "All" ? " \u00b7 " + genre : ""}
        </div>
        {shown.map((p, i) => (
          <div className="pd-card" key={p.title}>
            <div className="pd-card-num">Prompt {i + 1} <span className="pd-genre">\u00b7 {p.genre}</span></div>
            <div className="pd-card-title">{p.title}</div>
            <div className="pd-prompt">{p.text}</div>
            <button className={"pd-copy" + (copied === p.title ? " done" : "")} onClick={() => copy(p.title, p.text)}>
              {copied === p.title ? "\u2713 Copied" : "Copy prompt"}
            </button>
          </div>
        ))}
        <div className="pd-also">
          <div className="pd-also-label">Also see</div>
          <div className="pd-grid">
            {others.map((m) => (
              <div key={m.slug} className="pd-model" onClick={() => openPromptModel(m.slug)}>
                <div className="pd-model-name">{m.name}</div>
                <div className="pd-model-maker">{m.maker}</div>
                <div className="pd-model-desc">{m.prompts.length} prompts for {m.strength}.</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}