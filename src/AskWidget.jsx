import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

/*
  AskWidget — RevaultAI

  A question box, answered from the site's own data.

  Deliberately not a chat. A thread invites small talk, and small talk costs
  a model call each: this takes a question, gives an answer, and offers the
  pages the answer came from. Asking again is one tap and starts clean.

  It never claims to be a person and it is allowed to say it does not know —
  which is recorded, because a question the site could not answer is the most
  useful thing anybody learns here.
*/

const SUGGESTED = [
  "What does a five-second shot cost?",
  "How do I put myself in a scene?",
  "What is the Vault for?",
];

const css = `
  .ask-fab { position: fixed; right: 20px; bottom: 20px; z-index: 60;
    border: 1px solid var(--border); background: var(--surface); color: var(--text);
    border-radius: 999px; padding: 11px 18px; cursor: pointer;
    font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.04em;
    box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
  .ask-fab:hover { border-color: var(--accent); }
  .ask-panel { position: fixed; right: 20px; bottom: 20px; z-index: 61; width: min(380px, calc(100vw - 40px));
    background: var(--bg); border: 1px solid var(--border); border-radius: 14px;
    box-shadow: 0 18px 48px rgba(0,0,0,0.5); overflow: hidden; }
  .ask-head { display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid var(--border); }
  .ask-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; }
  .ask-x { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 18px; line-height: 1; padding: 0 4px; }
  .ask-body { padding: 14px 16px; max-height: min(52vh, 420px); overflow-y: auto; }
  .ask-note { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
  .ask-answer { font-family: var(--font-body); font-size: 14px; line-height: 1.65; color: var(--text); white-space: pre-wrap; }
  .ask-pages { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .ask-page { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--accent-text, var(--accent));
    border: 1px solid var(--border); border-radius: 999px; padding: 5px 11px; background: none; cursor: pointer; }
  .ask-page:hover { border-color: var(--accent); }
  .ask-foot { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); }
  .ask-in { flex: 1; min-width: 0; background: var(--surface); border: 1px solid var(--border);
    border-radius: 9px; padding: 9px 11px; color: var(--text); font-family: var(--font-body); font-size: 14px; }
  .ask-in:focus { outline: none; border-color: var(--accent); }
  .ask-go { border: 1px solid var(--accent); background: var(--accent-dim, transparent); color: var(--text);
    border-radius: 9px; padding: 0 14px; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 12px; }
  .ask-go:disabled { opacity: 0.5; cursor: default; }
  .ask-sug { display: block; width: 100%; text-align: left; background: none; border: none; padding: 7px 0;
    color: var(--accent-text, var(--accent)); font-family: 'DM Mono', monospace; font-size: 11.5px; cursor: pointer; }
  .ask-sug:hover { text-decoration: underline; }
  @media (max-width: 520px) { .ask-fab { right: 14px; bottom: 14px; } .ask-panel { right: 10px; left: 10px; bottom: 10px; width: auto; } }
`;

export default function AskWidget({ setPage }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function ask(text) {
    const asked = (text ?? q).trim();
    if (asked.length < 3) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    setPages([]);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const t = sess?.session?.access_token;
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
        body: JSON.stringify({ question: asked }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not answer that just now.");
      else { setAnswer(body.answer); setPages(body.pages ?? []); }
    } catch {
      setError("We could not reach the answer service.");
    }
    setBusy(false);
    setQ("");
  }

  if (!open) {
    return (
      <>
        <style>{css}</style>
        <button className="ask-fab" type="button" onClick={() => setOpen(true)}>
          Ask about RevaultAI
        </button>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="ask-panel" role="dialog" aria-label="Ask about RevaultAI">
        <div className="ask-head">
          <div className="ask-title">Ask about RevaultAI</div>
          <button className="ask-x" type="button" aria-label="Close" onClick={() => setOpen(false)}>&times;</button>
        </div>

        <div className="ask-body">
          {!answer && !error && !busy && (
            <>
              <div className="ask-note">
                Answers come from this site&rsquo;s own pages, prices and tools. Signed in, it can
                also see your credits and your takes. It will say so when it does not know.
              </div>
              <div style={{ marginTop: 10 }}>
                {SUGGESTED.map((s) => (
                  <button key={s} className="ask-sug" type="button" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            </>
          )}

          {busy && <div className="ask-note">Reading&hellip;</div>}

          {answer && (
            <>
              <div className="ask-answer">{answer}</div>
              {pages.length > 0 && (
                <div className="ask-pages">
                  {pages.map((p) => (
                    <button key={p} className="ask-page" type="button"
                      onClick={() => { setPage?.(p.replace(/^\//, "")); setOpen(false); }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {error && <div className="ask-note" style={{ color: "#E5B769" }}>{error}</div>}
        </div>

        <form className="ask-foot" onSubmit={(e) => { e.preventDefault(); ask(); }}>
          <input ref={inputRef} className="ask-in" value={q} maxLength={500}
            placeholder={answer ? "Ask something else" : "What do you want to know?"}
            aria-label="Your question"
            onChange={(e) => setQ(e.target.value)} />
          <button className="ask-go" type="submit" disabled={busy || q.trim().length < 3}>
            {busy ? "…" : "Ask"}
          </button>
        </form>
      </div>
    </>
  );
}
