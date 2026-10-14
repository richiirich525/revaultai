

/*
  BecomeCreatorPage — RevaultAI
  Extracted from App.jsx.
*/

export default function BecomeCreatorPage({ setPage, user, onSignInClick }) {
  const whyCards = [
    { title: "Show the Process, Not Just the Result", desc: "Share the prompts, workflows, tools, and techniques behind your creations. RevaultAI is built for creators who want their work understood, not just viewed." },
    { title: "Build a Creator Profile", desc: "Create a permanent portfolio of your AI-native work. Gain followers, showcase your best creations, and build your reputation inside a curated creative community." },
    { title: "Sell Your Films", desc: "Every film streams free for the world to watch. Mark yours as premium and viewers can buy the full-quality download — you keep 80% of every sale, and your craft stays open." },
    { title: "Get Curated, Not Buried", desc: "Unlike massive content platforms, RevaultAI is built around quality and discovery. Exceptional work can be featured in spotlights, collections, and creator showcases." },
  ];
  const content = ["AI Films", "AI Short Films", "AI Animations", "Experimental Cinema", "Music Visuals", "Narrative Projects", "Hybrid Human and AI Productions"];
  const steps = [
    ["01", "Create your account", "Sign up and verify your email to get started."],
    ["02", "Complete your creator profile", "Add your display name, username, bio, and avatar. Profiles with complete information receive priority in curation."],
    ["03", "Upload your first creation", "Submit your video directly from the Submit page. Uploads go straight to our secure vault."],
    ["04", "Choose Open or Premium", "Open creations are free for everyone. Premium creations lock the full prompt behind a purchase."],
    ["05", "Submit for review", "Every creation is reviewed by the RevaultAI team within 48 hours before going live."],
    ["06", "Grow your audience", "Approved creations are discoverable in Explore. Build your following and earn Spotlight placement."],
  ];
  const encouraged = ["Original work", "Complete and detailed prompts", "Strong visual presentation", "Cinematic storytelling", "Experimental creativity"];
  const notAllowed = ["Spam or duplicate submissions", "Stolen or plagiarized content", "Copyright violations", "Hate content or discrimination", "Illegal content of any kind"];

  return (
    <div className="page">

      {/* HERO */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "100px 48px 80px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Early Creator Program</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 64, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Become a Creator</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>Help define the future of AI-native filmmaking.</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9, maxWidth: 560, margin: "0 auto 40px" }}>RevaultAI is building a curated home for exceptional AI films, short films and animation. We are currently inviting a small group of creators to help shape the platform before public launch.</div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={() => user ? setPage("submit") : onSignInClick?.()}>{user ? "Start Creating" : "Create Your Account"}</button>
          <button className="btn-ghost" onClick={() => setPage("guidelines")}>View Submission Guidelines</button>
        </div>
      </div>

      {/* FOUNDING CREATOR BADGE */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "32px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "inline-block", border: "1px solid var(--accent)", borderRadius: 4, padding: "4px 16px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12 }}>Founding Creator</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>Creators who join before public launch may receive special recognition as founding creators of RevaultAI — visible on their profile and in the platform archive.</div>
        </div>
      </div>

      {/* WHY CREATORS JOIN */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>Why Creators Join</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 20, lineHeight: 1.1 }}>Your work deserves more than another feed.</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>Most platforms focus on views. RevaultAI focuses on creators. Whether you're making AI films, short films, images, music, animations, prompt collections, workflows, or creative experiments, this is a place to showcase the craft behind the creation.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
          {whyCards.map((c, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "32px 24px" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12 }}>0{i + 1}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{c.title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ACCEPTED CONTENT */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 48px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 48, textAlign: "center" }}>Accepted Content</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
            {content.map((item, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: "12px 24px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)", letterSpacing: "0.08em" }}>{item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* PREMIUM FILMS */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 16, textAlign: "center" }}>Monetize Your Films</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", textAlign: "center", marginBottom: 48, lineHeight: 1.8 }}>Every film streams free either way. Premium simply adds the option to buy a download, and selling is entirely optional. You keep full ownership of your work.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "40px 32px" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 16 }}>Open</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Free to Watch</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>Your film streams free to everyone, with your production note published alongside it. The simplest way to build an audience and show your range.</div>
          </div>
          <div style={{ border: "1px solid var(--accent)", borderRadius: 8, padding: "40px 32px", background: "var(--surface)" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>Premium</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Film for Purchase</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>Your film still streams free and your production note stays open to everyone. Viewers who want to keep it can buy a full-quality download. You set the price and keep 80% of net revenue on every sale.</div>
          </div>
        </div>
      </div>

      {/* MORE MONETIZATION (COMING SOON) */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 48px", textAlign: "center" }}>
        <div style={{ display: "inline-block", border: "1px solid var(--accent)", borderRadius: 4, padding: "4px 16px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>On the Roadmap</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>More ways to earn, ahead.</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>Premium films are just the start. We're building additional ways for creators to be rewarded for exceptional work, and we'll share more as those options take shape. RevaultAI is designed around creators first — earning included.</div>
      </div>

      {/* SPOTLIGHT */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 16 }}>Earn a Place in Spotlight</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.9, marginBottom: 40 }}>The Spotlight section highlights the best work on RevaultAI. Only a limited number of creations are spotlighted at any time. Selection is based on originality, storytelling, visual quality, prompt craftsmanship, and community engagement.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {["Originality", "Storytelling", "Visual Quality", "Prompt Craftsmanship", "Community Engagement"].map((item, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: "8px 16px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>{item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* GETTING STARTED */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 48px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 56, textAlign: "center" }}>Getting Started</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map(([num, title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 32, paddingBottom: 40, borderLeft: i < steps.length - 1 ? "1px solid var(--border)" : "none", marginLeft: 20, paddingLeft: 40, position: "relative" }}>
              <div style={{ position: "absolute", left: -16, top: 0, width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--accent)", letterSpacing: "0.1em", flexShrink: 0 }}>{num}</div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{title}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QUALITY STANDARDS */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 48px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, color: "var(--text)", marginBottom: 48, textAlign: "center" }}>Quality Standards</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>We Encourage</div>
              {encouraged.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#4ADE80" }}>✓</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)" }}>{item}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Not Allowed</div>
              {notAllowed.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#F87171" }}>✕</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)" }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "100px 48px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Ready to Join RevaultAI?</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.9, marginBottom: 40 }}>Become one of the founding creators helping shape the future of AI-native creativity.</div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={() => user ? setPage("submit") : onSignInClick?.()}>{user ? "Submit Your First Creation" : "Create Your Account"}</button>
          <button className="btn-ghost" onClick={() => setPage("explore")}>Explore the Archive</button>
        </div>
      </div>

    </div>
  );
}
