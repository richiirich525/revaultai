import { LEGAL_CONTENT } from "./lib/legalContent.js";

/*
  LegalPage — RevaultAI
  Terms, Privacy, Refunds, DMCA and the AI disclaimer, from one source shared with the prerenderer.
*/

export default function LegalPage({ setPage, page }) {
  const content = LEGAL_CONTENT;

  const c = content[page];
  if (!c) return null;

  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>
          &larr; RevaultAI
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>{c.title}</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 48 }}>Last updated: {c.updated}</div>
        <div
          style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: 14 }}
          dangerouslySetInnerHTML={{ __html: c.body.replace(/<h2>/g, '<h2 style="font-family: \'Syne\', sans-serif; font-size: 14px; font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: 0.1em; margin: 32px 0 12px;">').replace(/<ul>/g, '<ul style="padding-left: 24px; margin: 12px 0;">').replace(/<li>/g, '<li style="margin-bottom: 8px;">').replace(/<p>/g, '<p style="margin-bottom: 16px;">') }}
        />
      </div>
    </div>
  );
}
