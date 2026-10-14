import { ABOUT_BACKLOT, splitBold } from "./lib/backlotCopy.js";

/*
  AboutPage — RevaultAI
  The studio-lot argument for why RevaultAI exists.
*/

export default function AboutPage({ setPage }) {
  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>← RevaultAI</div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, fontWeight: 300, color: "var(--text)", marginBottom: 56, lineHeight: 1.1 }}>{ABOUT_BACKLOT.heading}</h1>

        <div style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
          {ABOUT_BACKLOT.intro.map((p, i, all) => (
            <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2, marginBottom: i < all.length - 1 ? 24 : 0 }}>{p}</div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
          {ABOUT_BACKLOT.stations.map((s, i, all) => (
            <div key={s.lead} style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2, marginBottom: i < all.length - 1 ? 24 : 0 }}>
              <strong style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--text)" }}>{s.lead}</strong> {s.body}
            </div>
          ))}
        </div>

        {ABOUT_BACKLOT.sections.map((sec) => (
          <div key={sec.title} style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>{sec.title}</div>
            {sec.paragraphs.map((p, i, all) => (
              <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2, marginBottom: i < all.length - 1 ? 24 : 0 }}>
                {splitBold(p).map((part, j) => (j % 2 ? <strong key={j} style={{ color: "var(--text)" }}>{part}</strong> : part))}
              </div>
            ))}
          </div>
        ))}

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 48 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: "var(--text)", marginBottom: 32, lineHeight: 1.4 }}>{ABOUT_BACKLOT.closing}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => setPage("explore")}>Explore the Archive</button>
            <button className="btn-ghost" onClick={() => setPage("guidelines")}>Submit Your Work</button>
          </div>
        </div>
      </div>
    </div>
  );
}
