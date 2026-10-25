/*
  HomeFeatures — RevaultAI
  Sits directly under the hero on the homepage so visitors see what the
  platform actually does before scrolling. Uses the site's CSS variables.
*/

export default function HomeFeatures({ setPage, user, onSignInClick }) {
  const FEATURES = [
    {
      /*
        First because it is the only one a visitor can do in thirty seconds
        with no account, and because it is the thing most of them came for
        without knowing the site had it.
      */
      n: "01",
      title: "Be in it",
      body: "One photo becomes a character that stays you from shot to shot. Draw it, put it in a scene, bring friends into the same shot \u2014 or film a day you actually had. Free to start, no account.",
    },
    {
      n: "02",
      title: "Generate",
      body: "Veo 3.1, Kling 3.0, Seedance 2.5, MiniMax H3 Max and Wan 2.6 behind one credit balance. Text to video or animate from a still. No subscriptions, no API keys.",
    },
    {
      n: "03",
      title: "Finish",
      body: "Upscale to 4K, extend past the length cap, and re-sync dialogue with lip sync — all on a clip you already made.",
    },
    {
      n: "04",
      title: "Showcase",
      body: "Submit to a curated gallery where every film is personally reviewed. Or link a film from your own YouTube channel and keep it there.",
    },
    {
      n: "05",
      title: "Get paid",
      body: "Sell premium films and keep 80% of net revenue. Add tip, hire-me and licensing links to your profile — we take nothing from those.",
    },
  ];

  return (
    <section className="hf-wrap">
      <style>{`
        .hf-wrap { padding: 64px 48px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--bg2); }
        .hf-inner { max-width: 1180px; margin: 0 auto; }
        .hf-head { margin-bottom: 36px; }
        .hf-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.22em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; }
        .hf-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(28px, 3.4vw, 40px); color: var(--text); line-height: 1.15; margin-bottom: 10px; }
        .hf-sub { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.9; max-width: 560px; }
        .hf-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }
        .hf-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 28px 24px; transition: border-color 0.25s; }
        .hf-card:hover { border-color: var(--border-hover); }
        .hf-n { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; }
        .hf-card h3 { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 10px; }
        .hf-card p { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; margin: 0; }
        .hf-free { margin-top: 24px; border: 1px solid rgba(123,63,228,0.3); background: var(--accent-dim); border-radius: 8px; padding: 22px 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
        .hf-free-text { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.8; }
        .hf-free-text strong { font-family: 'Syne', sans-serif; font-weight: 700; }
        .hf-ctas { display: flex; gap: 14px; margin-top: 32px; flex-wrap: wrap; }
        @media (max-width: 1180px) { .hf-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { .hf-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 600px) {
          .hf-wrap { padding: 44px 24px; }
          .hf-grid { grid-template-columns: 1fr; }
          .hf-free { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="hf-inner">
        <div className="hf-head">
          <div className="hf-eyebrow">Make it, finish it, show it</div>
          <div className="hf-title">Everything an AI film needs, in one place.</div>
          <div className="hf-sub">
            RevaultAI is a curated gallery — and the tools to make what goes in it.
            Now including the one where you are the one on screen.
          </div>
        </div>

        <div className="hf-grid">
          {FEATURES.map((f) => (
            <div className="hf-card" key={f.n}>
              <div className="hf-n">{f.n}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>

        <div className="hf-free">
          <div className="hf-free-text">
            <strong>Free, no account needed:</strong> the Prompt Builder turns a rough idea into a
            director-grade prompt for Veo, Sora, Kling, Runway, Wan, Hailuo or Seedance.
          </div>
          <button className="btn-ghost" onClick={() => setPage("prompt-builder")}>Open Prompt Builder</button>
        </div>

        <div className="hf-ctas">
          <button className="btn-primary" onClick={() => (user ? setPage("generate") : onSignInClick?.())}>
            {user ? "Open the Generator" : "Start Generating"}
          </button>
          <button className="btn-ghost" onClick={() => setPage("cast")}>Cast Yourself</button>
          <button className="btn-ghost" onClick={() => setPage("tools")}>See the tools</button>
          <button className="btn-ghost" onClick={() => setPage("explore")}>Browse the Gallery</button>
        </div>
      </div>
    </section>
  );
}