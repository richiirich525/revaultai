/*
  BacklotSection — RevaultAI
  The backlot story on the homepage, below the films. Copy lives in
  src/lib/backlotCopy.js so the prerendered HTML carries the same words.
  Uses the site's CSS variables, same as HomeFeatures.
*/

import { HOME_BACKLOT } from "./lib/backlotCopy.js";

export default function BacklotSection({ setPage }) {
  const { heading, intro, stations, cta } = HOME_BACKLOT;

  return (
    <section className="bl-wrap">
      <style>{`
        .bl-wrap { padding: 64px 48px; border-top: 1px solid var(--border); background: var(--bg2); }
        .bl-inner { max-width: 1180px; margin: 0 auto; }
        .bl-head { margin-bottom: 36px; }
        .bl-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(28px, 3.4vw, 40px); color: var(--text); line-height: 1.15; margin: 0 0 20px; }
        .bl-intro { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.9; max-width: 640px; margin: 0 0 14px; }
        .bl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .bl-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 28px 24px; transition: border-color 0.25s; }
        .bl-card:hover { border-color: var(--border-hover); }
        .bl-card h3 { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 10px; }
        .bl-card p { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; margin: 0; }
        .bl-cta { margin-top: 48px; }
        .bl-cta-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(26px, 3vw, 34px); color: var(--text); line-height: 1.2; margin: 0 0 10px; }
        .bl-cta-line { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.8; margin: 0; }
        .bl-ctas { display: flex; gap: 14px; margin-top: 24px; flex-wrap: wrap; }
        @media (max-width: 900px) { .bl-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 600px) {
          .bl-wrap { padding: 44px 24px; }
          .bl-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="bl-inner">
        <div className="bl-head">
          <h2 className="bl-title">{heading}</h2>
          {intro.map((p, i) => <p className="bl-intro" key={i}>{p}</p>)}
        </div>

        <div className="bl-grid">
          {stations.map((s) => (
            <div className="bl-card" key={s.lead}>
              <h3>{s.lead}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>

        <div className="bl-cta">
          <div className="bl-cta-title">{cta.heading}</div>
          <p className="bl-cta-line">{cta.line}</p>
          <div className="bl-ctas">
            <button className="btn-primary" onClick={() => setPage(cta.primary.page)}>{cta.primary.label}</button>
            <button className="btn-ghost" onClick={() => setPage(cta.secondary.page)}>{cta.secondary.label}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
