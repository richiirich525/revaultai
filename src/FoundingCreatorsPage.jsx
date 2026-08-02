import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  FoundingCreatorsPage — RevaultAI
  Landing page for the founding-creator ad campaign.
  Styled to match the live site: Syne / DM Mono / Cormorant Garamond,
  purple accent (#7B3FE4) on #0E0F14. Self-contained (fc- prefix).
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
        .fc-page {
          background: var(--bg, #0E0F14);
          color: var(--text, #E8E6F0);
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }
        .fc-wrap { max-width: 880px; margin: 0 auto; padding: 0 48px; }

        .fc-eyebrow {
          font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.25em;
          text-transform: uppercase; color: var(--accent, #7B3FE4);
        }
        .fc-rule { height: 1px; background: var(--border, rgba(255,255,255,0.06)); border: 0; margin: 0; }

        /* Hero */
        .fc-hero { padding: 100px 0 72px; }
        .fc-hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300; font-size: clamp(40px, 6.5vw, 68px);
          line-height: 1.08; margin: 20px 0 24px; color: var(--text, #E8E6F0);
        }
        .fc-hero h1 em { font-style: italic; color: var(--accent, #7B3FE4); }
        .fc-hero p {
          font-family: 'DM Mono', monospace; color: var(--muted, #6B6878);
          font-size: 12px; line-height: 1.9; max-width: 560px; margin: 0;
        }

        /* Stats strip */
        .fc-plaque {
          margin: 64px 0; border: 1px solid var(--border, rgba(255,255,255,0.06));
          background: var(--bg2, #13141A); border-radius: 8px;
          padding: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px;
        }
        .fc-stat b {
          display: block; font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 34px; color: var(--text, #E8E6F0); line-height: 1;
        }
        .fc-stat:first-child b { color: var(--accent, #7B3FE4); }
        .fc-stat span {
          display: block; margin-top: 10px; font-family: 'DM Mono', monospace;
          font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--muted, #6B6878); line-height: 1.6;
        }

        .fc-section { padding: 8px 0 64px; }
        .fc-label {
          font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em;
          color: var(--accent, #7B3FE4); text-transform: uppercase; margin-bottom: 12px;
        }
        .fc-section h2 {
          font-family: 'Cormorant Garamond', serif; font-weight: 300;
          font-size: 38px; margin: 0 0 14px; color: var(--text, #E8E6F0);
        }
        .fc-section > p {
          font-family: 'DM Mono', monospace; color: var(--muted, #6B6878);
          font-size: 12px; line-height: 1.9; max-width: 620px;
        }

        .fc-gets { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 32px; }
        .fc-get {
          background: var(--bg2, #13141A); border: 1px solid var(--border, rgba(255,255,255,0.06));
          border-radius: 8px; padding: 32px 24px; transition: border-color 0.25s;
        }
        .fc-get:hover { border-color: var(--border-hover, rgba(123,63,228,0.35)); }
        .fc-get .fc-get-num {
          font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em;
          color: var(--accent, #7B3FE4); text-transform: uppercase; margin-bottom: 12px;
        }
        .fc-get h3 {
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          margin: 0 0 10px; color: var(--text, #E8E6F0);
        }
        .fc-get p {
          font-family: 'DM Mono', monospace; font-size: 11px;
          color: var(--muted, #6B6878); line-height: 1.7; margin: 0;
        }

        /* Form */
        .fc-form {
          border: 1px solid var(--border, rgba(255,255,255,0.06));
          background: var(--bg2, #13141A); border-radius: 8px;
          padding: 40px; margin-bottom: 96px;
        }
        .fc-form label {
          display: block; font-family: 'DM Mono', monospace; font-size: 10px;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--accent, #7B3FE4); margin: 24px 0 10px;
        }
        .fc-form label:first-child { margin-top: 0; }
        .fc-form input, .fc-form textarea {
          width: 100%; box-sizing: border-box; background: var(--bg3, #1A1B23);
          border: 1px solid var(--border, rgba(255,255,255,0.06));
          color: var(--text, #E8E6F0); padding: 12px 16px; font-size: 14px;
          font-family: 'Syne', sans-serif; border-radius: 4px; outline: none;
          transition: border-color 0.2s;
        }
        .fc-form input:focus, .fc-form textarea:focus { border-color: var(--accent, #7B3FE4); }
        .fc-form input::placeholder, .fc-form textarea::placeholder { color: var(--muted, #6B6878); }
        .fc-form textarea { min-height: 100px; resize: vertical; line-height: 1.6; }
        .fc-hp { position: absolute; left: -9999px; height: 0; overflow: hidden; }

        .fc-submit {
          margin-top: 32px; background: var(--accent, #7B3FE4); color: white;
          border: none; padding: 14px 32px; border-radius: 4px;
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
          transition: all 0.2s;
        }
        .fc-submit:hover { opacity: 0.88; box-shadow: 0 8px 32px var(--accent-glow, rgba(123,63,228,0.4)); }
        .fc-submit:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

        .fc-msg {
          font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.6;
          margin-top: 18px; padding: 10px 14px; border-radius: 3px;
        }
        .fc-msg--ok { color: #4ADE80; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); }
        .fc-msg--err { color: #F87171; background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.2); }

        @media (max-width: 760px) {
          .fc-wrap { padding: 0 24px; }
          .fc-hero { padding: 64px 0 48px; }
          .fc-hero h1 { font-size: 36px; }
          .fc-plaque, .fc-gets { grid-template-columns: 1fr; }
          .fc-plaque { padding: 28px; gap: 24px; margin: 48px 0; }
          .fc-form { padding: 24px; }
          .fc-section h2 { font-size: 30px; }
        }
      `}</style>

      <div className="fc-wrap">
        <header className="fc-hero">
          <span className="fc-eyebrow">Founding Cohort &middot; Limited Spots</span>
          <h1>
            Your film, in the vault.
            <br />
            Not in a <em>feed</em>.
          </h1>
          <p>
            RevaultAI is a curated archive for AI-generated films. We are selecting a small
            founding cohort of filmmakers whose work opens the vault — shown with intention,
            paid like it matters.
          </p>
        </header>

        <hr className="fc-rule" />

        <section className="fc-plaque" aria-label="The terms">
          <div className="fc-stat"><b>80%</b><span>of net revenue to creators</span></div>
          <div className="fc-stat"><b>Curated</b><span>every film reviewed, none buried</span></div>
          <div className="fc-stat"><b>Founding</b><span>permanent founding-creator badge</span></div>
        </section>

        <section className="fc-section">
          <div className="fc-label">The Offer</div>
          <h2>What founding creators receive</h2>
          <div className="fc-gets">
            <div className="fc-get">
              <div className="fc-get-num">01</div>
              <h3>Top placement</h3>
              <p>Founding work anchors the archive — Spotlight eligibility and featured positioning, not a slot in a scroll.</p>
            </div>
            <div className="fc-get">
              <div className="fc-get-num">02</div>
              <h3>80% of net</h3>
              <p>Sell premium films or prompts and keep 80% after payment fees. The free showcase costs nothing.</p>
            </div>
            <div className="fc-get">
              <div className="fc-get-num">03</div>
              <h3>A direct line</h3>
              <p>You work with the founder, not a support queue. Your feedback shapes the platform.</p>
            </div>
          </div>
        </section>

        <section className="fc-section">
          <div className="fc-label">Apply</div>
          <h2>Submit your work for consideration</h2>
          <p>
            Send a link to your strongest AI film work — a profile, a reel, a single film,
            or even a Google Drive folder. No public presence yet? Email your work to
            rich@revaultai.com instead. We review everything personally and reply either way.
          </p>

          <div className="fc-form">
            {status === "done" ? (
              <p className="fc-msg fc-msg--ok" style={{ marginTop: 0 }}>
                &#10003;&nbsp; Received. Your work is in the review queue — you'll hear back at the
                email you provided, usually within a few days.
              </p>
            ) : (
              <>
                <label htmlFor="fc-name">Name</label>
                <input id="fc-name" value={form.name} onChange={set("name")} autoComplete="name" placeholder="Your name" />

                <label htmlFor="fc-email">Email</label>
                <input id="fc-email" type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />

                <label htmlFor="fc-work">Link to your work (YouTube, Vimeo, Instagram, Drive — anywhere)</label>
                <input id="fc-work" type="url" placeholder="https://" value={form.workUrl} onChange={set("workUrl")} />

                <label htmlFor="fc-note">Anything we should know (optional)</label>
                <textarea id="fc-note" value={form.note} onChange={set("note")} placeholder="Tools you use, what you're working on..." />

                <div className="fc-hp" aria-hidden="true">
                  <label htmlFor="fc-website">Website</label>
                  <input id="fc-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
                </div>

                <button className="fc-submit" onClick={submit} disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Submit for Review"}
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