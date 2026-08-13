/*
  AiVideoGeneratorPage — RevaultAI
  Public, indexable marketing page for the generation + editing tools.
  /generate stays noindex (it's behind auth); this page does the ranking
  and hands people off to it. Styled with the site's CSS variables.
*/

export default function AiVideoGeneratorPage({ setPage, user, onSignInClick }) {
  const MODELS = [
    {
      name: "Seedance 2.0",
      by: "ByteDance",
      note: "Tops the public leaderboards. Director-level camera control, real-world physics, and native synchronized audio in a single pass. Available as a cheap 480p draft tier and a 720p flagship tier.",
    },
    {
      name: "Veo 3.1",
      by: "Google DeepMind",
      note: "The strongest all-around image quality, with native audio and lip-synced dialogue generated alongside the picture. Best for hero shots that need to look expensive.",
    },
    {
      name: "Kling 3.0",
      by: "Kuaishou",
      note: "The motion specialist. Fast action, physical performance, crowds, and fight choreography hold together where other models smear.",
    },
    {
      name: "Wan 2.6",
      by: "Alibaba",
      note: "The workhorse. Fast and cheap enough to iterate without rationing takes, which is what previz and blocking actually need.",
    },
  ];

  const TOOLS = [
    ["Image to video", "Attach a starting frame and any model animates from it. Your still becomes the first frame instead of a description the model has to guess at."],
    ["Upscale", "Take a finished clip to 1080p or 4K with temporal consistency — no shimmer or flicker between frames. Pairs with the 480p draft tier: iterate cheap, upscale the keeper."],
    ["Extend", "Continue a clip past its original length with consistent motion, style, and audio. Chain extensions to build past the 15-second ceiling every model shares."],
    ["Lip sync", "Upload an audio track and the mouth is re-timed to match it, carrying emotion and speaking style from the recording. Dialogue without a reshoot."],
  ];

  return (
    <div className="page avg-page">
      <style>{`
        .avg-wrap { max-width: 880px; margin: 0 auto; padding: 0 48px; }
        .avg-hero { padding: 96px 0 64px; }
        .avg-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent); }
        .avg-hero h1 { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(38px, 6vw, 64px); line-height: 1.08; margin: 20px 0 22px; color: var(--text); }
        .avg-hero h1 em { font-style: italic; color: var(--accent); }
        .avg-lede { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.95; max-width: 600px; margin: 0 0 32px; }
        .avg-cta-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .avg-rule { height: 1px; background: var(--border); border: 0; margin: 0; }
        .avg-section { padding: 56px 0; }
        .avg-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; }
        .avg-section h2 { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 36px; margin: 0 0 14px; color: var(--text); }
        .avg-section > p { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.95; max-width: 620px; }
        .avg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px; }
        .avg-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 28px 24px; transition: border-color 0.25s; }
        .avg-card:hover { border-color: var(--border-hover); }
        .avg-card h3 { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
        .avg-card .avg-by { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
        .avg-card p { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; margin: 0; }
        .avg-price { border: 1px solid var(--border); background: var(--bg2); border-radius: 8px; padding: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px; }
        .avg-price b { display: block; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 26px; color: var(--text); line-height: 1; }
        .avg-price span { display: block; margin-top: 10px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); line-height: 1.6; }
        .avg-final { padding: 64px 0 96px; text-align: center; }
        .avg-final h2 { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 34px; color: var(--text); margin: 0 0 14px; }
        .avg-final p { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; max-width: 480px; margin: 0 auto 28px; }
        @media (max-width: 760px) {
          .avg-wrap { padding: 0 24px; }
          .avg-hero { padding: 60px 0 44px; }
          .avg-grid, .avg-price { grid-template-columns: 1fr; }
          .avg-section h2 { font-size: 28px; }
        }
      `}</style>

      <div className="avg-wrap">
        <header className="avg-hero">
          <span className="avg-eyebrow">AI Video Generator</span>
          <h1>Four frontier models.<br />One <em>credit balance</em>.</h1>
          <p className="avg-lede">
            Generate cinematic video with Seedance 2.0, Veo 3.1, Kling 3.0, and Wan 2.6 — then
            upscale, extend, and lip-sync the result without leaving the page. No subscription,
            no API keys, no separate account for every model. Pay per second with credits, and
            keep what you make.
          </p>
          <div className="avg-cta-row">
            <button className="btn-primary" onClick={() => (user ? setPage("generate") : onSignInClick?.())}>
              {user ? "Open the Generator" : "Create an Account"}
            </button>
            <button className="btn-ghost" onClick={() => setPage("explore")}>See What People Made</button>
          </div>
        </header>

        <hr className="avg-rule" />

        <section className="avg-section">
          <div className="avg-label">The Models</div>
          <h2>Pick the model that suits the shot</h2>
          <p>
            No single model wins at everything. Motion, camera control, audio, and cost all pull
            in different directions, so the useful thing is having all of them behind one balance
            and routing each shot to whichever handles it best.
          </p>
          <div className="avg-grid">
            {MODELS.map((m) => (
              <div className="avg-card" key={m.name}>
                <h3>{m.name}</h3>
                <div className="avg-by">{m.by}</div>
                <p>{m.note}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="avg-rule" />

        <section className="avg-section">
          <div className="avg-label">The Tools</div>
          <h2>Finish the clip, not just start it</h2>
          <p>
            Generating is the easy part. What usually stops an AI film is everything after the
            first render — resolution that won't hold on a big screen, a clip that ends before
            the moment does, dialogue that doesn't land. Each of these runs on a finished clip
            you already made.
          </p>
          <div className="avg-grid">
            {TOOLS.map(([title, note]) => (
              <div className="avg-card" key={title}>
                <h3>{title}</h3>
                <p>{note}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="avg-rule" />

        <section className="avg-section">
          <div className="avg-label">Credits</div>
          <h2>Pay per second, not per month</h2>
          <p>
            Credits are deducted per second of output, priced by model. Cheap models cost less;
            flagship models cost more. If a generation fails, the credits come straight back.
          </p>
          <div className="avg-price">
            <div><b>50 credits</b><span>Starter &middot; $5</span></div>
            <div><b>200 credits</b><span>Creator &middot; $15</span></div>
          </div>
        </section>

        <hr className="avg-rule" />

        <section className="avg-final">
          <h2>And when it's finished, it has somewhere to go.</h2>
          <p>
            RevaultAI is a curated gallery for AI film, not another feed. Download your work, or
            submit it to the vault where it's shown with intention — and creators keep 80% of net
            revenue on anything they sell.
          </p>
          <div className="avg-cta-row" style={{ justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => (user ? setPage("generate") : onSignInClick?.())}>
              {user ? "Start Generating" : "Create an Account"}
            </button>
            <button className="btn-ghost" onClick={() => setPage("founding-creators")}>Become a Founding Creator</button>
          </div>
        </section>
      </div>
    </div>
  );
}