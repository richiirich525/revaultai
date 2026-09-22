import { JOBS, EXAMPLE, ACCESS_LABEL, toolCount } from "./lib/toolCatalog.js";

/*
  ToolsPage — RevaultAI
  The toolkit arranged by the five jobs of making a film, with what you give
  each tool and what you get back — then one scene taken all the way through.
  Reads everything from toolCatalog, the same list the Create menu uses.
*/

const styles = `
  .tl-wrap { max-width: 920px; margin: 0 auto; padding: 0 48px; }
  .tl-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .tl-jobs { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 30px 0 10px; }
  .tl-jobchip { border: 1px solid var(--border); border-radius: 8px; padding: 14px 14px 12px; background: var(--surface); cursor: pointer; text-align: left; transition: border-color 0.2s; }
  .tl-jobchip:hover { border-color: var(--accent); }
  .tl-jobchip-n { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; color: var(--accent); }
  .tl-jobchip-name { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--text); margin: 6px 0 4px; line-height: 1.3; }
  .tl-jobchip-when { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); line-height: 1.6; }
  .tl-job { margin-top: 56px; scroll-margin-top: 110px; }
  .tl-job-n { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase; }
  .tl-job-name { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; color: var(--text); line-height: 1.2; margin-top: 4px; }
  .tl-job-when { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin: 6px 0 20px; }
  .tl-tool { display: grid; grid-template-columns: 220px 1fr; gap: 20px; border: 1px solid var(--border); border-radius: 8px; padding: 20px 22px; margin-bottom: 10px; background: var(--surface); cursor: pointer; transition: border-color 0.2s; }
  .tl-tool:hover { border-color: var(--accent); }
  .tl-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .tl-tag { display: inline-block; font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; border-radius: 3px; padding: 3px 8px; }
  .tl-tag.free { color: var(--accent); border: 1px solid rgba(123,63,228,0.4); }
  .tl-tag.account, .tl-tag.credits { color: var(--muted); border: 1px solid var(--border); }
  .tl-where { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); margin-top: 8px; letter-spacing: 0.06em; }
  .tl-io { font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.75; }
  .tl-io b { font-weight: 400; color: var(--accent); display: inline-block; min-width: 62px; }
  .tl-io span { color: var(--text); }
  .tl-blurb { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.8; margin-top: 8px; }
  .tl-ex { border: 1px solid var(--accent); border-radius: 10px; padding: 30px 32px; margin-top: 64px; background: var(--surface); scroll-margin-top: 110px; }
  .tl-step { display: grid; grid-template-columns: 34px 1fr; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--border); }
  .tl-step:last-child { border-bottom: none; }
  .tl-step-n { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: var(--accent); line-height: 1; }
  .tl-step-tool { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); cursor: pointer; margin-bottom: 6px; display: inline-block; }
  .tl-step-tool:hover { color: var(--accent); }
  @media (max-width: 860px) {
    .tl-wrap { padding: 0 22px; }
    .tl-jobs { grid-template-columns: 1fr 1fr; }
    .tl-tool { grid-template-columns: 1fr; gap: 10px; }
    .tl-ex { padding: 22px 20px; }
  }
`;

export default function ToolsPage({ setPage, user, onSignInClick }) {
  const all = JOBS.flatMap((j) => j.tools);
  const freeCount = all.filter((t) => t.access === "free").length;

  function open(page, access) {
    if (access === "account" && !user) { onSignInClick?.(); return; }
    setPage(page);
  }
  const accessOf = (page) => all.find((t) => t.page === page)?.access;
  const jump = (id) => document.getElementById("job-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">The Toolkit</div>
        <div className="page-hdr-title">What are you trying to do?</div>
        <div className="page-hdr-sub">
          {toolCount()} tools, arranged by the five jobs of making a film — {freeCount} of them free with no account.
        </div>
      </div>

      <section className="section">
        <div className="tl-wrap">
          <div className="tl-body" style={{ maxWidth: 640 }}>
            Most AI video platforms give you a prompt box and wish you luck. These are the parts either side of it. Pick the job you're doing — each tool below says what you give it and what you get back.
          </div>

          <div className="tl-jobs">
            {JOBS.map((j, i) => (
              <button key={j.id} className="tl-jobchip" onClick={() => jump(j.id)}>
                <div className="tl-jobchip-n">0{i + 1}</div>
                <div className="tl-jobchip-name">{j.name}</div>
                <div className="tl-jobchip-when">{j.when}</div>
              </button>
            ))}
          </div>
          <div className="tl-body" style={{ fontSize: 10 }}>
            New here? <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => document.getElementById("job-example")?.scrollIntoView({ behavior: "smooth", block: "start" })}>See one scene taken all the way through ↓</span>
          </div>

          {JOBS.map((j, i) => (
            <div className="tl-job" id={"job-" + j.id} key={j.id}>
              <div className="tl-job-n">Job 0{i + 1}</div>
              <div className="tl-job-name">{j.name}</div>
              <div className="tl-job-when">{j.when}</div>
              {j.tools.map((t) => (
                <div className="tl-tool" key={t.name} onClick={() => open(t.page, t.access)}>
                  <div>
                    <div className="tl-name">{t.name}</div>
                    <span className={"tl-tag " + t.access}>{ACCESS_LABEL[t.access]}</span>
                    {t.where && <div className="tl-where">{t.where}</div>}
                  </div>
                  <div>
                    <div className="tl-io"><b>You give</b> <span>{t.give}</span></div>
                    <div className="tl-io"><b>You get</b> <span>{t.get}</span></div>
                    <div className="tl-blurb">{t.blurb}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="tl-ex" id="job-example">
            <div className="tl-job-n">Worked example</div>
            <div className="tl-job-name">{EXAMPLE.title}</div>
            <div className="tl-body" style={{ margin: "10px 0 18px", color: "var(--text)" }}>
              The scene: {EXAMPLE.scene}
            </div>
            {EXAMPLE.steps.map((s, i) => (
              <div className="tl-step" key={i}>
                <div className="tl-step-n">{i + 1}</div>
                <div>
                  <span className="tl-step-tool" onClick={() => open(s.page, accessOf(s.page))}>{s.tool} →</span>
                  <div className="tl-io"><b>You give</b> <span>{s.give}</span></div>
                  <div className="tl-io"><b>You get</b> <span>{s.get}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 56 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Bring your story.</div>
            <div className="tl-body" style={{ maxWidth: 460, margin: "0 auto 28px" }}>
              Start with the first job — break down a scene — or jump to whichever one you're stuck on. Nothing asks for an account until you generate or save.
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