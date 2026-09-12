import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  FramePlannerPage — RevaultAI
  Free tool. Plan where a shot starts and where it lands: two frame
  descriptions, an image prompt for each, and the motion between them.
  Signed-in creators can generate the frames (costs credits) and hand the
  opening frame straight into image-to-video generation.
*/

const MODELS = [
  ["veo", "Veo"], ["sora", "Sora"], ["kling", "Kling"], ["runway", "Runway"],
  ["wan", "Wan"], ["hailuo", "Hailuo"], ["seedance", "Seedance"],
];
const RATIOS = [["16:9", "16:9 Landscape"], ["9:16", "9:16 Vertical"], ["1:1", "1:1 Square"]];
const IMAGE_MODELS = [
  ["seedream-5.0", "Seedream 5.0 — Fast", 1],
  ["nano-banana-2", "Nano Banana 2 — Consistent characters", 2],
];

const EXAMPLES = [
  "Maya stands at the elevator, hears it arrive, turns toward the doors and takes one step back.",
  "A lighthouse keeper lowers his binoculars as the storm finally breaks behind him.",
  "A card is slid across a bar towards someone who doesn't reach for it.",
  "A runner crests a hill and stops dead at what she sees below.",
];

const styles = `
  .fp-wrap { max-width: 900px; margin: 0 auto; padding: 0 48px; }
  .fp-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; }
  .fp-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; }
  .fp-body { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; }
  .fp-textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); line-height: 1.7; resize: vertical; box-sizing: border-box; }
  .fp-chiprow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .fp-chip { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; padding: 8px 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s; }
  .fp-chip:hover { color: var(--text); border-color: var(--muted); }
  .fp-chip.on { border-color: var(--accent); color: var(--accent); background: var(--bg); }
  .fp-ex { display: block; width: 100%; text-align: left; background: none; border: 1px solid var(--border); border-radius: 4px; padding: 10px 14px; margin-bottom: 8px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.6; cursor: pointer; }
  .fp-ex:hover { color: var(--text); border-color: var(--muted); }
  .fp-frames { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
  .fp-frame { border: 1px solid var(--border); border-radius: 8px; padding: 22px 24px; background: var(--surface); }
  .fp-frame-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; }
  .fp-still { width: 100%; border-radius: 5px; border: 1px solid var(--border); display: block; margin-bottom: 14px; }
  .fp-placeholder { width: 100%; aspect-ratio: 16/9; border-radius: 5px; border: 1px dashed var(--border); display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.12em; margin-bottom: 14px; }
  .fp-imgprompt { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); line-height: 1.8; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 12px 14px; margin: 12px 0; }
  .fp-motion { border: 1px solid var(--accent); border-radius: 8px; padding: 22px 24px; margin-bottom: 24px; background: var(--surface); }
  .fp-motion-row { margin-bottom: 12px; }
  .fp-motion-k { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
  .fp-prompt { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 16px 18px; margin-bottom: 14px; }
  .fp-note { border-left: 2px solid var(--accent); padding-left: 14px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.85; margin-bottom: 28px; }
  .fp-vault-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 4px; cursor: pointer; }
  .fp-vault-item:hover { background: var(--bg); }
  .fp-box { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--accent); line-height: 1; }
  .fp-box.on { border-color: var(--accent); background: var(--accent-dim); }
  @media (max-width: 760px) { .fp-wrap { padding: 0 24px; } .fp-card { padding: 22px; } .fp-frames { grid-template-columns: 1fr; } }
`;

export default function FramePlannerPage({ setPage, user, onSignInClick, setGenPrefill, notify }) {
  const [shot, setShot] = useState("");
  const [model, setModel] = useState("kling");
  const [aspect, setAspect] = useState("16:9");
  const [imgModel, setImgModel] = useState("seedream-5.0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);
  const [frames, setFrames] = useState({});     // "opening" | "ending" -> url
  const [busy, setBusy] = useState(null);
  const [vault, setVault] = useState([]);
  const [lockedIds, setLockedIds] = useState([]);

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

  async function handlePlan() {
    if (shot.trim().length < 10) { setError("Describe the shot in a few more words."); return; }
    setLoading(true); setError(null); setResult(null); setFrames({}); setCopied(null);
    try {
      const res = await fetch("/api/frame-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shot, model, aspectRatio: aspect, locked: vault.filter((v) => lockedIds.includes(v.id)) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the frame planner. Check your connection and try again.");
    }
    setLoading(false);
  }

  async function generateFrame(which) {
    if (!user) { onSignInClick?.(); return; }
    const prompt = result?.[which]?.image_prompt;
    if (!prompt) return;
    setBusy(which);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/generate-image", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: imgModel }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.imageUrl) { notify?.(j.error || "Frame generation failed."); setBusy(null); return; }
      setFrames((f) => ({ ...f, [which]: j.imageUrl }));
    } catch (err) {
      notify?.("Frame generation failed: " + err.message);
    }
    setBusy(null);
  }

  async function copyText(key, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Couldn't copy automatically — select the text and copy it manually.");
    }
  }

  function generateVideo() {
    if (!user) { onSignInClick?.(); return; }
    setGenPrefill({ prompt: result.video_prompt, modelKey: result.modelKey, aspectRatio: result.aspectRatio });
    setPage("generate");
  }

  const imgCost = IMAGE_MODELS.find(([k]) => k === imgModel)?.[2] ?? 1;

  return (
    <div className="page">
      <style>{styles}</style>

      <div className="fp-wrap" style={{ padding: "100px 48px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>Free Tool</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, fontWeight: 300, color: "var(--text)", marginBottom: 16, lineHeight: 1.1 }}>Frame Planner</h1>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: "var(--muted)", marginBottom: 24, fontStyle: "italic" }}>Decide where the shot starts and where it lands.</div>
        <div className="fp-body" style={{ fontSize: 12, maxWidth: 560, margin: "0 auto" }}>
          A shot is a change over time. Describe one and this plans both ends of it — the opening frame, the ending frame, and the motion between — with an image prompt for each so you can generate the frames themselves instead of hoping the model picks something reasonable.
        </div>
      </div>

      <div className="fp-wrap" style={{ paddingBottom: 56 }}>
        <div className="fp-card">
          <div className="fp-label">The shot</div>
          <textarea
            className="fp-textarea"
            rows={4}
            maxLength={700}
            value={shot}
            onChange={(e) => setShot(e.target.value)}
            placeholder="Maya stands at the elevator, hears it arrive, turns toward the doors and takes one step back."
            style={{ marginBottom: 6 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--muted)", textAlign: "right", marginBottom: 20 }}>{shot.length} / 700</div>

          {!result && (
            <>
              <div className="fp-label">Or try one of these</div>
              <div style={{ marginBottom: 22 }}>
                {EXAMPLES.map((e, i) => (
                  <button key={i} className="fp-ex" onClick={() => setShot(e)}>{e}</button>
                ))}
              </div>
            </>
          )}

          {user && vault.length > 0 && (
            <>
              <div className="fp-label">Lock from your vault (optional)</div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 14, marginBottom: 22, background: "var(--bg)" }}>
                {vault.map((v) => {
                  const on = lockedIds.includes(v.id);
                  return (
                    <div key={v.id} className="fp-vault-item" onClick={() => setLockedIds((ids) => on ? ids.filter((x) => x !== v.id) : [...ids, v.id])}>
                      <div className={"fp-box" + (on ? " on" : "")}>{on ? "\u2713" : ""}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text)" }}>{v.name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginLeft: 8 }}>{v.kind}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="fp-label">Target model</div>
          <div className="fp-chiprow">
            {MODELS.map(([v, l]) => (
              <button key={v} className={"fp-chip" + (model === v ? " on" : "")} onClick={() => setModel(v)}>{l}</button>
            ))}
          </div>

          <div className="fp-label">Aspect ratio</div>
          <div className="fp-chiprow">
            {RATIOS.map(([v, l]) => (
              <button key={v} className={"fp-chip" + (aspect === v ? " on" : "")} onClick={() => setAspect(v)}>{l}</button>
            ))}
          </div>

          <button className="btn-primary" onClick={handlePlan} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Planning the frames…" : "Plan the frames"}
          </button>

          {error && (
            <div style={{ marginTop: 20, border: "1px solid #F87171", borderRadius: 4, padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F87171", lineHeight: 1.7 }}>{error}</div>
          )}
        </div>
      </div>

      {result && (
        <div className="fp-wrap" style={{ paddingBottom: 80 }}>
          {result.read && (
            <div className="fp-body" style={{ textAlign: "center", maxWidth: 540, margin: "0 auto 32px", fontSize: 12, color: "var(--text)" }}>{result.read}</div>
          )}

          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <span className="fp-label" style={{ marginBottom: 0 }}>Frame image model</span>
              <select className="gen-model-select" value={imgModel} onChange={(e) => setImgModel(e.target.value)}>
                {IMAGE_MODELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <span className="fp-body" style={{ fontSize: 10 }}>{imgCost} credit{imgCost === 1 ? "" : "s"} per frame</span>
            </div>
          )}

          <div className="fp-frames">
            {["opening", "ending"].map((which) => (
              <div className="fp-frame" key={which}>
                <div className="fp-frame-tag">{which === "opening" ? "Opening frame" : "Ending frame"}</div>
                {frames[which] ? (
                  <img className="fp-still" src={frames[which]} alt={which + " frame"} />
                ) : (
                  <div className="fp-placeholder">{busy === which ? "GENERATING…" : "NOT GENERATED"}</div>
                )}
                <div className="fp-body">{result[which].description}</div>
                <div className="fp-imgprompt">{result[which].image_prompt}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => copyText(which, result[which].image_prompt)}>
                    {copied === which ? "\u2713 Copied" : "Copy"}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => generateFrame(which)} disabled={busy === which}>
                    {busy === which ? "Generating…" : user ? "Generate frame" : "Sign in to generate"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="fp-motion">
            <div className="fp-label">Between the frames</div>
            {[["Subject", result.motion.subject], ["Camera", result.motion.camera], ["Environment", result.motion.environment], ["Duration", result.motion.duration_seconds ? result.motion.duration_seconds + "s" : null]]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div className="fp-motion-row" key={k}>
                  <div className="fp-motion-k">{k}</div>
                  <div className="fp-body">{v}</div>
                </div>
              ))}
          </div>

          <div className="fp-label">The video prompt</div>
          <div className="fp-prompt">{result.video_prompt}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
            <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => copyText("video", result.video_prompt)}>
              {copied === "video" ? "\u2713 Copied" : "Copy prompt"}
            </button>
            <button className="btn-ghost" style={{ fontSize: 11 }} onClick={generateVideo}>
              {user ? "Generate the shot \u2192" : "Sign in to generate"}
            </button>
          </div>

          {result.continuity_note && (
            <>
              <div className="fp-label">Hold these constant</div>
              <div className="fp-note">{result.continuity_note}</div>
            </>
          )}

          <div className="fp-body" style={{ fontSize: 10, textAlign: "center", opacity: 0.75, marginBottom: 32 }}>
            Generate the opening frame, then attach it as the starting frame on the generator. The ending frame is your target and your continuity asset for the next shot — RevaultAI doesn't yet pass an end frame to the models.
          </div>

          <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 44 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: "var(--text)", marginBottom: 16 }}>Chain it into the next shot.</div>
            <div className="fp-body" style={{ maxWidth: 450, margin: "0 auto 26px" }}>
              This shot's ending frame is the next shot's opening frame. Plan that one the same way and the sequence carries its own continuity forward.
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => { setResult(null); setFrames({}); setShot(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Plan the next shot</button>
              <button className="btn-ghost" onClick={() => setPage("scene-breakdown")}>Break down a whole scene</button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "var(--text)", marginBottom: 34, textAlign: "center" }}>A shot has two ends</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              {[
                ["Start from an image, not a guess", "Generating the opening frame first and attaching it means the model inherits your composition, wardrobe and light instead of inventing them."],
                ["Direct toward a landing", "Knowing where the shot ends changes how you write the motion. It's the difference between 'she turns' and 'she ends facing camera with the doors open behind her'."],
                ["Ending frames chain", "This shot's last frame is the next shot's first. Plan a sequence that way and continuity carries itself forward rather than being reconstructed each time."],
              ].map(([t, d], i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "26px 24px", background: "var(--bg)" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t}</div>
                  <div className="fp-body">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}