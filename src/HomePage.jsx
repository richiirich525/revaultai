import BacklotSection from "./BacklotSection.jsx";
import CreationCard from "./CreationCard.jsx";
import DiscoveredStrip from "./DiscoveredStrip.jsx";
import HomeFeatures from "./HomeFeatures.jsx";
import SpotlightSection from "./SpotlightSection.jsx";

/*
  HomePage — RevaultAI
  Extracted from App.jsx.
*/

export default function HomePage({ creations, setPage, setDetailId, user, onSignInClick }) {
  const premiumCreations = creations.filter((c) => c.is_premium && c.premium_status === "Approved");
  const openCreations    = creations.filter((c) => !c.is_premium);
  function goDetail(id) { setDetailId(id); setPage("detail"); }
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">AI-Native Creative Platform</div>
          <div className="hero-tagline">The AI era doesn't<br />need more content.</div>
          <span className="hero-tagline-accent">It needs curation.</span>
          <p className="hero-sub" style={{ color: "var(--text)", fontSize: 16, fontWeight: 500, lineHeight: 1.6, maxWidth: 440, marginBottom: 24 }}>Home to the world's best AI films, short films, images, prompts, workflows, and creative experiments.</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => setPage("explore")}>Explore Films</button>
            <button className="btn-ghost" onClick={() => setPage(user ? "generate" : "ai-video-generator")}>Create Now</button>
          </div>
        </div>
        <div className="hero-right"><img src="/hero-vault.png" alt="A filmmaker standing before an illuminated screen inside an open vault" /></div>
      </section>
      <HomeFeatures setPage={setPage} user={user} onSignInClick={onSignInClick} />
      <SpotlightSection creations={creations} onView={goDetail} />
<DiscoveredStrip setPage={setPage} />
      <section className="section">
        <div className="section-header"><div><div className="section-label">Open Archive</div><div className="section-sublabel">Free access to outstanding AI creations.</div></div><span className="section-link" onClick={() => setPage("explore")}>View All &rarr;</span></div>
        <div className="creation-grid">{openCreations.slice(0, 4).map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}</div>
      </section>
      {premiumCreations.length > 0 && (
        <section className="section">
          <div className="section-header"><div><div className="section-label">Premium Films</div><div className="section-sublabel">Own the film. Support the creator.</div></div><span className="section-link" onClick={() => setPage("explore")}>View All &rarr;</span></div>
          <div className="creation-grid">{premiumCreations.slice(0, 4).map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}</div>
        </section>
      )}
      <BacklotSection setPage={setPage} />
      <section className="section" style={{ textAlign: "center", borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.22em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 18 }}>For Creators</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 300, color: "var(--text)", marginBottom: 18, lineHeight: 1.15 }}>Build your creative legacy.</div>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.8, maxWidth: 520, margin: "0 auto 36px" }}>Share your work, grow your audience, sell your films, and become part of a curated archive of AI-native creativity.</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => setPage("become-creator")}>Become a Creator</button>
            <button className="btn-ghost" onClick={() => setPage("creators")}>Explore Creators</button>
          </div>
        </div>
      </section>
      <section className="manifesto"><div className="manifesto-rule" /><p className="manifesto-quote">"The AI era doesn't need more content. It needs curation."</p><p className="manifesto-sub">RevaultAI is built for creators who believe AI is a medium, not just a tool.</p></section>
      <footer className="footer">
  <div className="footer-logo">RevaultAI</div>
  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("faq")}>FAQ</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("contact")}>Contact</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("guidelines")}>Guidelines</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("premium-films")}>Premium Films</span>
    <span style={{ display: "inline-flex", gap: 14, alignItems: "center", marginLeft: 4 }}>
      <a className="footer-copy" href="https://discord.gg/tQyAhhAK5" target="_blank" rel="noopener noreferrer" aria-label="RevaultAI on Discord" title="Discord" style={{ display: "inline-flex" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.54 5.34A16.2 16.2 0 0 0 15.5 4.1l-.2.4a12.4 12.4 0 0 1 3.5 1.8 17.6 17.6 0 0 0-13.6 0 12.4 12.4 0 0 1 3.5-1.8l-.2-.4a16.2 16.2 0 0 0-4.04 1.24C1.9 9.1 1.2 12.8 1.5 16.4a16.4 16.4 0 0 0 5 2.5l.9-1.5c-.6-.2-1.2-.5-1.8-.9l.4-.3a11.7 11.7 0 0 0 10 0l.4.3c-.6.4-1.2.7-1.8.9l.9 1.5a16.4 16.4 0 0 0 5-2.5c.4-4.2-.7-7.9-2.96-11.06ZM8.5 14.3c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/>
        </svg>
      </a>
      <a className="footer-copy" href="https://www.instagram.com/revaultai" target="_blank" rel="noopener noreferrer" aria-label="RevaultAI on Instagram" title="Instagram" style={{ display: "inline-flex" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/>
          <circle cx="12" cy="12" r="4.2"/>
          <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/>
        </svg>
      </a>
      <a className="footer-copy" href="https://x.com/airevault" target="_blank" rel="noopener noreferrer" aria-label="RevaultAI on X" title="X" style={{ display: "inline-flex" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.7 3h3.3l-7.2 8.2L22 21h-6.6l-5.2-6.8L4.3 21H1l7.7-8.8L1.5 3h6.8l4.7 6.2L17.7 3Zm-1.2 16h1.8L7.6 4.9H5.7L16.5 19Z"/>
        </svg>
      </a>
    </span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("about")}>About</span><span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("blog")}>Journal</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("ai-video-generator")}>AI Video Generator</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("become-creator")}>Become a Creator</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("terms")}>Terms</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("privacy")}>Privacy</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("refunds")}>Refunds</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("dmca")}>DMCA</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("ai-disclaimer")}>AI Disclaimer</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("prompts")}>AI Video Prompts</span>
    <span className="footer-copy" style={{ cursor: "pointer" }} onClick={() => setPage("prompt-builder")}>Prompt Builder</span>
  </div>
  <div className="footer-copy">&copy; 2026 RevaultAI</div>
</footer>
    </div>
  );
}
