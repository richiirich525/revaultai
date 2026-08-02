import { useEffect, useMemo, useState } from "react";
// ↓ Adjust this import to wherever your Supabase client lives
import { supabase } from "./lib/supabase.js";

/*
  FoundingCreatorsPage — RevaultAI
  Drop-in page for the founding-creator ad campaign.
  Self-contained: scoped styles (fc- prefix), no new dependencies.
  Captures UTM params from the URL and stores them with each application.
*/

export default function FoundingCreatorsPage() {
  const [form, setForm] = useState({ name: "", email: "", workUrl: "", note: "", website: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | done | error

  const utm = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") || null,
      utm_medium: p.get("utm_medium") || null,
      utm_campaign: p.get("utm_campaign") || null,
    };
  }, []);

  useEffect(() => {
    document.title = "Founding Creators — RevaultAI";
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (form.website) return; // honeypot — bots fill hidden fields
    if (!form.name.trim() || !form.email.trim() || !form.workUrl.trim()) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const { error } = await supabase.from("founding_applications").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      work_url: form.workUrl.trim(),
      note: form.note.trim() || null,
      ...utm,
    });
    setStatus(error ? "error" : "done");
  }

  return (
    <div className="fc-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Inter:wght@400;500;600&display=swap');

        .fc-page {
          --fc-black: #0b0b0a;
          --fc-charcoal: #171614;
          --fc-concrete: #211f1c;
          --fc-line: #33302b;
          --fc-gold: #c9a227;
          --fc-gold-soft: #d8b24a;
          --fc-ivory: #ede8dd;
          --fc-mute: #8a867c;
          background: var(--fc-black);
          color: var(--fc-ivory);
          font-family: 'Inter', system-ui, sans-serif;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }
        .fc-wrap { max-width: 880px; margin: 0 auto; padding: 0 24px; }

        .fc-eyebrow {
          font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase;
          color: var(--fc-gold); font-weight: 500;
        }
        .fc-rule { height: 1px; background: var(--fc-line); border: 0; margin: 0; }
        .fc-rule--gold { background: var(--fc-gold); width: 56px; height: 2px; }

        /* Hero — set like an exhibition wall label */
        .fc-hero { padding: 96px 0 72px; }
        .fc-hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300; font-size: clamp(40px, 7vw, 72px);
          line-height: 1.05; margin: 20px 0 24px; letter-spacing: 0.01em;
        }
        .fc-hero h1 em { font-style: italic; color: var(--fc-gold-soft); }
        .fc-hero p { color: var(--fc-mute); font-size: 17px; line-height: 1.65; max-width: 560px; margin: 0; }

        /* Plaque — the 80/20 split as etched museum signage */
        .fc-plaque {
          margin: 72px 0; border: 1px solid var(--fc-line); background: var(--fc-charcoal);
          padding: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px;
        }
        .fc-plaque .fc-stat b {
          display: block; font-family: 'Cormorant Garamond', serif; font-weight: 400;
          font-size: 44px; color: var(--fc-ivory); line-height: 1;
        }
        .fc-plaque .fc-stat span {
          display: block; margin-top: 10px; font-size: 12px; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--fc-mute);
        }

        .fc-section { padding: 8px 0 64px; }
        .fc-section h2 {
          font-family: 'Cormorant Garamond', serif; font-weight: 300;
          font-size: 34px; margin: 16px 0 12px;
        }
        .fc-section > p { color: var(--fc-mute); line-height: 1.7; max-width: 620px; }

        .fc-gets { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: var(--fc-line); border: 1px solid var(--fc-line); margin-top: 28px; }
        .fc-get { background: var(--fc-black); padding: 28px 24px; }
        .fc-get h3 { font-size: 15px; font-weight: 600; margin: 0 0 8px; color: var(--fc-ivory); }
        .fc-get p { font-size: 14px; color: var(--fc-mute); line-height: 1.6; margin: 0; }

        /* Form */
        .fc-form { border: 1px solid var(--fc-line); background: var(--fc-concrete); padding: 40px; margin-bottom: 96px; }
        .fc-form label { display: block; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fc-mute); margin: 22px 0 8px; }
        .fc-form input, .fc-form textarea {
          width: 100%; box-sizing: border-box; background: var(--fc-black);
          border: 1px solid var(--fc-line); color: var(--fc-ivory);
          padding: 13px 14px; font-size: 15px; font-family: inherit; border-radius: 0;
        }
        .fc-form input:focus-visible, .fc-form textarea:focus-visible {
          outline: 2px solid var(--fc-gold); outline-offset: 1px; border-color: var(--fc-gold);
        }
        .fc-form textarea { min-height: 90px; resize: vertical; }
        .fc-hp { position: absolute; left: -9999px; height: 0; overflow: hidden; }

        .fc-submit {
          margin-top: 30px; background: var(--fc-gold); color: var(--fc-black);
          border: 0; padding: 15px 34px; font-size: 14px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
        }
        .fc-submit:hover { background: var(--fc-gold-soft); }
        .fc-submit:focus-visible { outline: 2px solid var(--fc-ivory); outline-offset: 2px; }
        .fc-submit:disabled { opacity: 0.5; cursor: default; }

        .fc-msg { margin-top: 18px; font-size: 14px; line-height: 1.6; }
        .fc-msg--ok { color: var(--fc-gold-soft); }
        .fc-msg--err { color: #d47b6a; }

        @media (max-width: 720px) {
          .fc-hero { padding: 64px 0 48px; }
          .fc-plaque, .fc-gets { grid-template-columns: 1fr; }
          .fc-plaque { padding: 28px; gap: 24px; }
          .fc-form { padding: 24px; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .fc-hero h1, .fc-hero p, .fc-hero .fc-eyebrow { animation: fcRise 0.7s ease both; }
          .fc-hero p { animation-delay: 0.12s; }
          @keyframes fcRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        }
      `}</style>

      <div className="fc-wrap">
        <header className="fc-hero">
          <span className="fc-eyebrow">Founding cohort · Limited spots</span>
          <h1>
            Your film, on a wall.
            <br />
            Not in a <em>feed</em>.
          </h1>
          <p>
            RevaultAI is a curated gallery for AI-generated films. We are selecting a small
            founding cohort of filmmakers whose work opens the gallery — shown with intention,
            paid like it matters.
          </p>
        </header>

        <hr className="fc-rule" />

        <section className="fc-plaque" aria-label="The terms">
          <div className="fc-stat"><b>80%</b><span>of net revenue to creators</span></div>
          <div className="fc-stat"><b>Curated</b><span>every film reviewed, none buried</span></div>
          <div className="fc-stat"><b>Founding</b><span>permanent founding-creator status</span></div>
        </section>

        <section className="fc-section">
          <hr className="fc-rule fc-rule--gold" />
          <h2>What founding creators receive</h2>
          <div className="fc-gets">
            <div className="fc-get">
              <h3>Top placement</h3>
              <p>Founding work anchors the gallery — featured positioning, not a slot in a scroll.</p>
            </div>
            <div className="fc-get">
              <h3>80% of net</h3>
              <p>Sell premium films or prompts and keep 80% after payment fees. Free showcase costs nothing.</p>
            </div>
            <div className="fc-get">
              <h3>A direct line</h3>
              <p>You work with the founder, not a support queue. Your feedback shapes the platform.</p>
            </div>
          </div>
        </section>

        <section className="fc-section">
          <hr className="fc-rule fc-rule--gold" />
          <h2>Submit your work for consideration</h2>
          <p>
            Send a link to your strongest AI film work — a profile, a reel, a single film.
            We review everything personally and reply either way.
          </p>

          <div className="fc-form">
            {status === "done" ? (
              <p className="fc-msg fc-msg--ok">
                Received. Your work is in the review queue — you'll hear back at the email you
                provided, usually within a few days.
              </p>
            ) : (
              <>
                <label htmlFor="fc-name">Name</label>
                <input id="fc-name" value={form.name} onChange={set("name")} autoComplete="name" />

                <label htmlFor="fc-email">Email</label>
                <input id="fc-email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />

                <label htmlFor="fc-work">Link to your work</label>
                <input id="fc-work" type="url" placeholder="https://" value={form.workUrl} onChange={set("workUrl")} />

                <label htmlFor="fc-note">Anything we should know (optional)</label>
                <textarea id="fc-note" value={form.note} onChange={set("note")} />

                <div className="fc-hp" aria-hidden="true">
                  <label htmlFor="fc-website">Website</label>
                  <input id="fc-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
                </div>

                <button className="fc-submit" onClick={submit} disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Submit for review"}
                </button>

                {status === "error" && (
                  <p className="fc-msg fc-msg--err">
                    Something's missing or the send failed. Check name, email, and work link, then
                    try again — or email rich@revaultai.com directly.
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}