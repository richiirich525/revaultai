/*
  GuidelinesPage — RevaultAI
  What the gallery accepts.
*/

export default function GuidelinesPage({ setPage }) {
  return (
    <div className="page">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12, cursor: "pointer" }} onClick={() => setPage("home")}>← RevaultAI</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>Submission Guidelines</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 56 }}>What we accept. What we reject. How to get featured.</div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Accepted Content</div>
          {["AI films and short films", "AI animations", "AI music visuals", "Experimental AI cinema", "AI-generated narrative works"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)" }}>{item}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Quality Requirements</div>
          {[
            ["Clear title", "Your title should describe the work — not just 'Untitled' or 'Test'."],
            ["Meaningful production note", "Tell us how the work was made. For a single generation, that's usually the prompt itself. For a multi-shot film, a workflow description, model choices, or the key creative decisions is exactly right. There's no word count — we're looking for something another filmmaker could learn from."],
            ["Original work", "You must own or have rights to the content you submit. AI-generated content must be your original creative work."],
            ["High-quality video", "Minimum 1080p. No watermarks, no platform logos, no TikTok borders. No slideshows of static images — content must have motion."],
            ["Cinematic first frame", "Mux generates your thumbnail from frame 0. Make it count. No black frames or title cards at the start."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Not Allowed</div>
          {["Spam or duplicate submissions", "Stolen or plagiarized content", "Hate speech or discriminatory content", "Illegal content of any kind", "Low-effort uploads with vague or missing prompts", "Content depicting real people without consent", "Political content or misinformation"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#F87171", flexShrink: 0 }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)" }}>{item}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Submission Types</div>
          {[
            ["Open Submissions", "Free to unlock. Your prompt is publicly visible. Great for building your audience and showcasing your range."],
            ["Premium Submissions", "Priced at $4.99. Your full prompt is locked behind a purchase. Buyers receive permanent access. You earn visibility and credibility on a premium platform."],
            ["Spotlight Eligibility", "Spotlight is hand-picked by the RevaultAI team. To be considered, your work must be approved, have a complete profile with bio and avatar, and represent exceptional quality. Spotlight rotates weekly."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>{title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 32 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
            All submissions are reviewed within 48 hours. Questions? <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => setPage("contact")}>Contact us.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
