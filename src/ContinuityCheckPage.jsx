import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  ContinuityCheckPage — RevaultAI
  Free tool. Paste a set of shot prompts and get a script-supervisor read on
  what drifts between them. Flags issues, names the exact wording, and does not
  rewrite anything. Signed-in creators can check against locked vault entries.
*/

const SEV = {
  error:   { label: "Error",   color: "#F87171", bg: "rgba(248,113,113,0.07)", border: "rgba(248,113,113,0.35)", mark: "\u26A0" },
  warning: { label: "Warning", color: "#E5B769", bg: "rgba(229,183,105,0.06)", border: "rgba(229,183,105,0.32)", mark: "\u26A0" },
  ok:      { label: "Consistent", color: "#4ADE80", bg: "rgba(74,222,128,0.05)", border: "rgba(74,222,128,0.28)", mark: "\u2713" },
};

const styles = `
  .cc-wrap { max-width: 820px; margin: 0 auto; padding: 0 48px; }
  .cc-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
  .cc-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .cc-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .cc-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; resize: vertical; box-sizing: border-box; }
  .cc-find { border-radius: 8px; padding: 20px 22px; margin-bottom: 14px; }
  .cc-find-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
  .cc-sev { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; }
  .cc-subj { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); }
  .cc-shots { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.08em; }
  .cc-matters { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.75; margin-top: 8px; opacity: 0.8; }
  .cc-tally { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; margin-bottom: 28px; }
  .cc-tally-n { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 700; line-height: 1; }
  .cc-tally-l { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-top: 6px; }
  .cc-vault-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 4px; cursor: pointer; }
  .cc-vault-item:hover { background: var(--bg); }
  .cc-box { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--accent); line-height: 1; }
  .cc-box.on { border-color: var(--accent); background: var(--accent-dim); }
  @media (max-width: 760px) { .cc-wrap { padding: 0 24px; } .cc-card { padding: 22px; } }
`;

const PLACEHOLDER = `Paste one shot per block, separated by a blank line.

Medium shot of Maya entering the parking garage. She wears a charcoal field jacket over a burgundy shirt, short natural black curls, small scar through the left eyebrow. Low fluorescent light, damp concrete floor.

Tracking shot beside Maya as she crosses the garage. Dark jacket, shoulder-length hair. Warm overhead light.`;

export default function ContinuityCheckPage({ setPage, user, ccPrefill, setCcPrefill }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [vault, setVault] = useState([]);
  const [lockedIds, setLockedIds] = useState([]);

  // A shot list handed over from Scene Breakdown.
  useEffect(() => {
    if (!ccPrefill) return;
    setText((ccPrefill.shots || []).join("\n\n"));
    if (Array.isArray(ccPrefill.lockedIds)) setLockedIds(ccPrefill.lockedIds);
    setCcPrefill?.(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [ccPrefill]);

  useEffect(() => {
    (async () => {
      if (!user?.id) { setVault([]); return; }
      const { data } = await supabase
        .from("vault_entries")
        .select("id, kind, name, description, wardrobe, distinguishing")
        .order("kind", { ascending: true })
        .order("name", { ascending: true });
      setVault(data ?? []);
    })();
  }, [user?.id]);

  function splitShots(raw) {
    return raw
      .split(/\n\s*\n/)
      .map((s) => s.replace(/^\s*(?:shot\s*\d+\s*[:.\-]|\d+\s*[:.\-])\s*/i, "").trim())
      .filter(Boolean);
  }

  const shotCount = splitShots(text).length;

  async function handleCheck() {
    const shots = splitShots(text);
    if (shots.length < 2) { setError("Add at least two shots, separated by a blank line."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/continuity-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shots, locked: vault.filter((v) => lockedIds.includes(v.id)) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the continuity checker. Check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <div className="page">
      <style>{styles}</style>

      <div className="cc-wrap" style={{ padding: "100px 48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 58, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Continuity Check</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>A script supervisor for your shot list.</div>
        <div className="cc-body" style={{ fontSize: 12, maxWidth: 560, margin: "0 auto" }}>
          Paste the prompts for a sequence and this reads them the way a script supervisor reads a shooting script — looking for the character described two different ways, the jacket that changes colour, the light that moves for no reason. It flags what drifts and quotes the exact wording. It doesn't rewrite anything.
        </div>
      </div>

      <div className="cc-wrap" style={{ paddingBottom: 56 }}>
        <div className="cc-card">
          <div className="cc-label">Your shots</div>
          <textarea
            className="cc-textarea"
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            style={{ marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 20 }}>
            {shotCount} shot{shotCount === 1 ? "" : "s"} detected · separate with a blank line
          </div>

          {user && vault.length > 0 && (
            <>
              <div className="cc-label">Check against your vault (optional)</div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 14, marginBottom: 20, background: "var(--bg)" }}>
                {vault.map((v) => {
                  const on = lockedIds.includes(v.id);
                  return (
                    <div key={v.id} className="cc-vault-item" onClick={() => setLockedIds((ids) => on ? ids.filter((x) => x !== v.id) : [...ids, v.id])}>
                      <div className={"cc-box" + (on ? " on" : "")}>{on ? "\u2713" : ""}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)" }}>{v.name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginLeft: 8 }}>{v.kind}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="cc-body" style={{ fontSize: 10, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", opacity: 0.8 }}>
                  Selected entries are treated as the source of truth — any shot that departs from their wording is flagged as an error.
                </div>
              </div>
            </>
          )}

          <button className="btn-primary" onClick={handleCheck} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Reading the shot list…" : "Check continuity"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}
        </div>
      </div>

      {result && (
        <div className="cc-wrap" style={{ paddingBottom: 80 }}>
          <div className="cc-tally">
            {[["error", result.counts.error], ["warning", result.counts.warning], ["ok", result.counts.ok]].map(([k, n]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div className="cc-tally-n" style={{ color: SEV[k].color }}>{n}</div>
                <div className="cc-tally-l">{k === "ok" ? "Consistent" : k + (n === 1 ? "" : "s")}</div>
              </div>
            ))}
          </div>

          {result.summary && (
            <div className="cc-body" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 32px", fontSize: 12, color: "var(--text)" }}>
              {result.summary}
            </div>
          )}

          {result.findings.map((f, i) => {
            const s = SEV[f.severity] ?? SEV.warning;
            return (
              <div className="cc-find" key={i} style={{ background: s.bg, border: "1px solid " + s.border }}>
                <div className="cc-find-head">
                  <span className="cc-sev" style={{ color: s.color }}>{s.mark} {s.label}</span>
                  {f.subject && <span className="cc-subj">{f.subject}</span>}
                  {f.shots.length > 0 && <span className="cc-shots">Shot{f.shots.length > 1 ? "s" : ""} {f.shots.join(", ")}</span>}
                  <span className="cc-shots" style={{ opacity: 0.7 }}>· {f.category}</span>
                </div>
                <div className="cc-body" style={{ color: "var(--text)" }}>{f.issue}</div>
                {f.matters && <div className="cc-matters">{f.matters}</div>}
              </div>
            );
          })}

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48, marginTop: 40 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.2 }}>Fix it at the source.</div>
            <div className="cc-body" style={{ maxWidth: 470, margin: "0 auto 28px" }}>
              The reliable way to stop drift is to write the description once and reuse it. Save your characters and locations, then build the scene with them locked.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setPage("scene-breakdown")}>Break down a scene</button>
              {user && <button className="btn-ghost" onClick={() => setPage("vault")}>Open your vault</button>}
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 34, textAlign: "center" }}>What it looks for</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              {[
                ["Descriptions that drift", "The same character written two ways across shots. This is the most common cause of a protagonist who looks like their own cousin by shot four."],
                ["Wardrobe and props", "A jacket that changes colour, a bag that vanishes, a prop that appears without ever being picked up."],
                ["Unmotivated light", "The same moment in the same room lit from a different direction. Light may change — it just needs a reason in the shots."],
                ["What it won't flag", "Coverage isn't an error. Different shot sizes, angles and camera moves of the same subject are normal filmmaking, and a change your story causes is a change, not a mistake."],
              ].map(([t, d], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "26px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t}</div>
                  <div className="cc-body">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}