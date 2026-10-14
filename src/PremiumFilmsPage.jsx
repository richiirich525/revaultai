/*
  PremiumFilmsPage — RevaultAI
  How buying and selling a film works.
*/

export default function PremiumFilmsPage({ setPage }) {
  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>← RevaultAI</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>Premium Films</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 56 }}>Every film plays free. Owning one supports the creator.</div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>How It Works</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>Everything in the RevaultAI gallery streams free, in full — no paywall, no locked previews. Every film is also published with its production note — how the work was made, in the creator's own words. For some that's the full prompt; for a multi-shot film it might be the workflow, the model choices, or the decisions that shaped it. Either way it stays open for anyone to learn from. When a creator marks a film as premium, you have the option to buy it: a full-quality download to own, and a direct way to support the person who made it.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Why Buy a Film You Can Watch Free?</div>
          {[
            ["Own the work", "A full-quality download of the finished film — yours to keep, on or off the platform."],
            ["Support the craft", "AI filmmaking is real creative labor: hours of iteration, direction, and taste. Buying a film pays the person behind it directly."],
            ["Back the culture", "Creators keep the overwhelming share of every sale. Collecting work here keeps independent AI film open — not locked behind paywalls."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>What Buyers Receive</div>
          {["A full-quality download of the finished film", "Permanent access — re-download any time from your account", "The satisfaction of directly supporting the creator", "The complete production note remains open to everyone"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{item}</div>
            </div>
          ))}
        </div>

                <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>For Creators: Selling Is Optional</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>You never have to sell anything. Most films in the gallery are free, and you can showcase your work here indefinitely without offering a single purchase. Premium is a switch you flip if and when you want it — and if you do, you keep 80% of net revenue on every sale.</div>
        </div>
        
        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Ownership and Usage</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9, marginBottom: 16 }}>Buying a film grants you a personal-use copy of the work. Creators retain full ownership and copyright of their films. Reselling or redistributing purchased films is not permitted. For commercial licensing, use the License This link on the film's page to arrange it with the creator directly.</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Refund Policy</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>All purchases are final once the film has been downloaded. If you experienced a technical issue that prevented delivery, contact us within 7 days and we will make it right. See our full <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("refunds")}>Refund Policy.</span></div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 40 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "var(--text)", marginBottom: 20, lineHeight: 1.4 }}>Find a film worth owning.</div>
          <button className="btn-primary" onClick={() => setPage("explore")}>Browse the Gallery</button>
        </div>
      </div>
    </div>
  );
}
