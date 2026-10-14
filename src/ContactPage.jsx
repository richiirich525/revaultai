/*
  ContactPage — RevaultAI
  How to reach RevaultAI.
*/

export default function ContactPage({ setPage }) {
  const contacts = [
    { category: "General Support", description: "Questions about your account, purchases, or how the platform works.", email: "rich@revaultai.com", response: "We respond within 48 hours." },
    { category: "Creator Inquiries", description: "Questions about submitting work, prompt pricing, or becoming a featured creator.", email: "rich@revaultai.com", response: "We respond within 48 hours." },
    { category: "Copyright and DMCA", description: "To report infringing content or file a DMCA takedown notice. This reaches our registered copyright agent.", email: "dmca@revaultai.com", response: "We respond within 24 hours." },
    { category: "Business and Partnerships", description: "Licensing inquiries, brand partnerships, or press requests.", email: "rich@revaultai.com", response: "We respond within 5 business days." },
  ];
  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>← RevaultAI</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>Contact</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 56 }}>We are a small team. We read every message.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {contacts.map((c, i) => (
            <div key={i} style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{c.category}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 12 }}>{c.description}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>{c.response}</div>
                </div>
                <a href={"mailto:" + c.email} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em", textDecoration: "none", border: "1px solid var(--accent)", padding: "10px 20px", borderRadius: 4, whiteSpace: "nowrap", alignSelf: "flex-start" }}>{c.email}</a>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </div>
        <div style={{ marginTop: 64, padding: "32px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Before You Write</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>Many questions are answered in our <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("faq")}>FAQ</span>. For purchase issues please include your order email and the creation title. For DMCA notices please review our <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("dmca")}>DMCA Policy</span> before writing.</div>
        </div>
      </div>
    </div>
  );
}
