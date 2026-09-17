import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  FilmReceipt — RevaultAI
  What it actually took to make the film. Facts are assembled from the
  platform's own records; the creator chooses which of them are public and
  adds the part no database knows — why they made the choices they made.
*/

const FIELDS = [
  ["models", "Models and versions", "Which models made the film, and how much of it each one made."],
  ["tools", "Tools used", "The RevaultAI tools and any outside software."],
  ["rights", "Rights declarations", "Music, likeness and source material."],
  ["commentary", "Director's notes", "Your own account of the decisions."],
  ["generations", "Generation count", "How many attempts it took in total."],
  ["credits", "Generation cost", "Credits spent making the film."],
  ["attemptsPerKeeper", "Attempts per keeper", "How many tries the average usable shot needed."],
  ["rejections", "Why takes were rejected", "The failure modes you hit most."],
];

const RIGHTS = [
  ["music", "Music is licensed for commercial use, or original"],
  ["likeness", "No real person's likeness is used without consent"],
  ["source", "Source material is owned, licensed or public domain"],
  ["disclosure", "AI generation is disclosed to viewers"],
];

const styles = `
  .rc { border: 1px solid var(--border); border-radius: 8px; padding: 26px 28px; background: var(--surface); margin-top: 32px; }
  .rc-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 10px; }
  .rc-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .rc-stats { display: flex; gap: 26px; flex-wrap: wrap; margin: 16px 0; }
  .rc-n { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); line-height: 1; }
  .rc-k { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-top: 6px; }
  .rc-row { display: flex; gap: 10px; align-items: flex-start; padding: 7px 0; cursor: pointer; }
  .rc-box { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--accent); line-height: 1; }
  .rc-box.on { border-color: var(--accent); background: var(--accent-dim); }
  .rc-model { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; }
  .rc-model b { color: var(--text); font-weight: 400; }
  .rc-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 12px 14px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text); line-height: 1.8; resize: vertical; box-sizing: border-box; }
  .rc-scope { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.75; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); opacity: 0.8; }
`;

export default function FilmReceipt({ creationId, projectId, isOwner, notify }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [commentary, setCommentary] = useState("");

  async function load() {
    const { data } = await supabase.from("film_receipts").select("*").eq("creation_id", creationId).maybeSingle();
    setReceipt(data ?? null);
    setCommentary(data?.commentary ?? "");
    setLoading(false);
  }
  useEffect(() => { load(); }, [creationId]);

  async function build() {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/build-receipt", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ creationId, projectId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Could not build the receipt.");
      else { setReceipt(j.receipt); setCommentary(j.receipt.commentary ?? ""); }
    } catch { notify?.("Could not reach the receipt builder."); }
    setBusy(false);
  }

  async function patch(fields) {
    const { data, error } = await supabase
      .from("film_receipts")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", receipt.id)
      .select()
      .single();
    if (error) { notify?.("Could not save: " + error.message); return; }
    setReceipt(data);
  }

  const vis = receipt?.visibility ?? {};
  const f = receipt?.facts ?? {};
  const rights = receipt?.rights ?? {};
  const show = (k) => receipt?.published && vis[k];

  if (loading) return null;

  // --- Public view ---
  if (!isOwner) {
    if (!receipt?.published) return null;
    return (
      <div className="rc">
        <style>{styles}</style>
        <div className="rc-label">Production receipt</div>

        {(show("generations") || show("credits") || show("attemptsPerKeeper")) && (
          <div className="rc-stats">
            {show("generations") && <div><div className="rc-n">{f.generations}</div><div className="rc-k">Generations</div></div>}
            {show("attemptsPerKeeper") && f.attemptsPerKeeper && <div><div className="rc-n">{f.attemptsPerKeeper}</div><div className="rc-k">Attempts per keeper</div></div>}
            {show("credits") && <div><div className="rc-n">{f.totalCredits}</div><div className="rc-k">Credits spent</div></div>}
          </div>
        )}

        {show("models") && f.models?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="rc-k" style={{ marginBottom: 6 }}>Models</div>
            {f.models.map((m) => (
              <div className="rc-model" key={m.key}>
                <b>{m.key}</b>{show("generations") ? ` — ${m.attempts} generation${m.attempts === 1 ? "" : "s"}` : ""}{m.seconds ? `, ${m.seconds}s of output` : ""}
              </div>
            ))}
          </div>
        )}

        {show("rejections") && f.rejectionReasons?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="rc-k" style={{ marginBottom: 6 }}>Takes were rejected for</div>
            <div className="rc-body">{f.rejectionReasons.map((r) => `${r.reason} (${r.count})`).join(", ")}.</div>
          </div>
        )}

        {show("rights") && Object.keys(rights).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="rc-k" style={{ marginBottom: 6 }}>Rights</div>
            {RIGHTS.filter(([k]) => rights[k]).map(([k, l]) => (
              <div className="rc-body" key={k}>✓ {l}</div>
            ))}
          </div>
        )}

        {show("commentary") && receipt.commentary && (
          <div style={{ marginBottom: 6 }}>
            <div className="rc-k" style={{ marginBottom: 6 }}>From the director</div>
            <div className="rc-body" style={{ color: "var(--text)" }}>{receipt.commentary}</div>
          </div>
        )}

        <div className="rc-scope">
          {f.scope} Rights declarations are the creator's own statement. RevaultAI records what happened on this platform and does not verify work made elsewhere.
        </div>
      </div>
    );
  }

  // --- Owner view ---
  return (
    <div className="rc">
      <style>{styles}</style>
      <div className="rc-label">Production receipt</div>

      {!receipt ? (
        <>
          <div className="rc-body" style={{ marginBottom: 16 }}>
            Build a receipt for this film — which models made it, what it took, and the rights behind it. You choose what's public.
          </div>
          <button className="btn-primary" onClick={build} disabled={busy}>{busy ? "Building…" : "Build receipt"}</button>
        </>
      ) : (
        <>
          <div className="rc-stats">
            <div><div className="rc-n">{f.generations}</div><div className="rc-k">Generations</div></div>
            {f.attemptsPerKeeper && <div><div className="rc-n">{f.attemptsPerKeeper}</div><div className="rc-k">Per keeper</div></div>}
            <div><div className="rc-n">{f.totalCredits}</div><div className="rc-k">Credits</div></div>
            {f.shotSpecs > 0 && <div><div className="rc-n">{f.shotSpecs}</div><div className="rc-k">Shot specs</div></div>}
          </div>

          <div className="rc-label" style={{ marginTop: 18 }}>What's public</div>
          {FIELDS.map(([k, label, hint]) => (
            <div className="rc-row" key={k} onClick={() => patch({ visibility: { ...vis, [k]: !vis[k] } })}>
              <div className={"rc-box" + (vis[k] ? " on" : "")}>{vis[k] ? "\u2713" : ""}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)" }}>{label}</div>
                <div className="rc-body" style={{ fontSize: 10, opacity: 0.75 }}>{hint}</div>
              </div>
            </div>
          ))}

          <div className="rc-label" style={{ marginTop: 20 }}>Rights you're declaring</div>
          {RIGHTS.map(([k, l]) => (
            <div className="rc-row" key={k} onClick={() => patch({ rights: { ...rights, [k]: !rights[k] } })}>
              <div className={"rc-box" + (rights[k] ? " on" : "")}>{rights[k] ? "\u2713" : ""}</div>
              <div className="rc-body" style={{ color: "var(--text)", fontSize: 11 }}>{l}</div>
            </div>
          ))}
          <div className="rc-body" style={{ fontSize: 10, marginTop: 6, opacity: 0.8 }}>
            These are your statement, not something RevaultAI can verify. Only tick what's true.
          </div>

          <div className="rc-label" style={{ marginTop: 20 }}>Director's notes</div>
          <textarea
            className="rc-textarea"
            rows={4}
            maxLength={1500}
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            onBlur={() => commentary !== (receipt.commentary ?? "") && patch({ commentary: commentary.trim() || null })}
            placeholder="The decisions a database can't record — what you tried that didn't work, what you'd do differently, why a shot is the way it is."
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <button className="btn-primary" onClick={() => patch({ published: !receipt.published })}>
              {receipt.published ? "Unpublish receipt" : "Publish receipt"}
            </button>
            <button className="btn-ghost" style={{ fontSize: 11 }} onClick={build} disabled={busy}>
              {busy ? "Refreshing…" : "Refresh the numbers"}
            </button>
          </div>

          <div className="rc-scope">{f.scope}</div>
        </>
      )}
    </div>
  );
}