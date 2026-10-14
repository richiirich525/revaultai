import { useState } from "react";
import { FAQS } from "./lib/faqContent.js";

/*
  FAQPage — RevaultAI
  The questions, from the same source the prerenderer reads.
*/

export default function FAQPage({ setPage }) {
    const faqs = FAQS;

  const [open, setOpen] = useState(null);

  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>
          &larr; RevaultAI
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>
          Frequently Asked Questions
        </h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 56 }}>
          Everything you need to know about RevaultAI.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderTop: "1px solid var(--border)", padding: "24px 0" }}>
              <div
                onClick={() => setOpen(open === i ? null : i)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", gap: 24 }}
              >
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
                  {faq.q}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>
                  {open === i ? "−" : "+"}
                </div>
              </div>
              {open === i && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.8, marginTop: 16, letterSpacing: "0.02em" }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </div>
      </div>
    </div>
  );
}
