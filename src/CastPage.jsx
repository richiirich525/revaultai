import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import { MEDIUMS, GENRES } from "./lib/stylePresets.js";
import { POSES, FREE_SET } from "./lib/stillSet.js";

/*
  CastPage — RevaultAI

  Be in the movie. Four screens: selfie, your pack, pick a look, the result.

  The one rule the whole flow is built around: NOTHING IS ASKED FOR TWICE,
  AND THE PACK IS BUILT BEFORE ANY CREATIVE CHOICE. An identity system users
  can skip is an identity system nobody uses — measured on this very
  codebase, not one of 71 finished takes ever referenced a Vault entry,
  because referencing one was optional and tucked in a menu. Here the pack is
  screen two, before a medium or a genre is chosen, and there is no path
  around it.

  No account until the end, and then it asks for exactly one thing: keep your
  pack. An anonymous pack lives under a token the server issues; the token is
  held here in memory only, so a refresh is a lost pack rather than a pack
  sitting in somebody's localStorage forever.

  This lives as a route inside the main app for now. It will want its own
  front door — a curated gallery for filmmakers and a consumer selfie toy
  have incompatible homepages — but a route is reversible in an afternoon
  and a separate app is not.
*/

const mono = { fontFamily: "'DM Mono', monospace" };

const css = `
  .cast { max-width: 880px; margin: 0 auto; padding: 48px 20px 96px; }
  .cast-h { font-family: 'Syne', sans-serif; font-size: clamp(32px, 6vw, 52px);
    font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }
  .cast-sub { font-family: var(--font-body); font-size: 16px; color: var(--muted);
    line-height: 1.7; margin-top: 12px; max-width: 54ch; }
  .cast-drop { margin-top: 28px; border: 1px dashed var(--border); border-radius: 12px;
    padding: 44px 24px; text-align: center; background: var(--surface); cursor: pointer;
    transition: border-color 0.2s, background 0.2s; }
  .cast-drop:hover { border-color: var(--accent); }
  .cast-drop[data-over="1"] { border-color: var(--accent); background: var(--surface-2, var(--surface)); }
  .cast-card { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap;
    border: 1px solid var(--border); border-radius: 12px; padding: 18px;
    background: var(--surface); margin-top: 24px; }
  .cast-face { width: 112px; height: 112px; border-radius: 10px; object-fit: cover;
    border: 1px solid var(--border); flex: none; }
  .cast-field { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted);
    line-height: 1.75; }
  .cast-field b { color: var(--text); font-weight: 600; }
  .cast-name { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700;
    background: transparent; border: none; border-bottom: 1px solid var(--border);
    color: var(--text); padding: 2px 0; width: 100%; max-width: 260px; }
  .cast-name:focus { outline: none; border-bottom-color: var(--accent); }
  .cast-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: 12px; margin-top: 16px; }
  .cast-opt { text-align: left; border: 1px solid var(--border); border-radius: 10px;
    padding: 14px; background: var(--surface); cursor: pointer; color: var(--text);
    transition: border-color 0.2s; }
  .cast-opt:hover { border-color: var(--accent); }
  .cast-opt[data-on="1"] { border-color: var(--accent); }
  .cast-opt-l { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; }
  .cast-opt-n { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted);
    line-height: 1.6; margin-top: 5px; }
  .cast-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--accent-text); margin-top: 36px; }
  .cast-out { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 12px; margin-top: 18px; }
  .cast-still { border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    background: var(--surface); }
  .cast-still img { width: 100%; display: block; aspect-ratio: 1; object-fit: cover; }
  .cast-still figcaption { font-family: 'DM Mono', monospace; font-size: 11px;
    color: var(--muted); padding: 8px 10px; }
  .cast-slot { border: 1px solid var(--border); border-radius: 10px; background: var(--surface);
    aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
    font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
  .cast-err { font-family: 'DM Mono', monospace; font-size: 13px; color: #E5B769;
    line-height: 1.75; margin-top: 18px; max-width: 60ch; }
  .cast-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; align-items: center; }
  .cast-keep { border: 1px solid var(--accent); border-radius: 10px; padding: 16px 18px;
    margin-top: 28px; background: var(--surface); }
  @media (pointer: coarse) { .cast-opt, .cast-drop { min-height: 44px; } }
`;

/* A file becomes the two things the server needs: bytes to read, and a type
   to read them as. The data-url prefix is stripped because the API wants raw
   base64 and sending it with the prefix fails in a way that reads as a model
   error rather than a client one. */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Could not read that file."));
    fr.onload = () => {
      const s = String(fr.result ?? "");
      const comma = s.indexOf(",");
      resolve({ base64: comma >= 0 ? s.slice(comma + 1) : s, dataUrl: s });
    };
    fr.readAsDataURL(file);
  });
}

export default function CastPage({ user, setPage, notify, onSignInClick }) {
  const [step, setStep] = useState("selfie");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const [preview, setPreview] = useState(null);
  const [pack, setPack] = useState(null);
  const [packToken, setPackToken] = useState(null);
  const [packId, setPackId] = useState(null);
  const [name, setName] = useState("");

  const [choice, setChoice] = useState(null);
  const [stills, setStills] = useState([]);
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  /* A pack made before signing in is claimed on sign-in. Until the claim
     route exists this only tells them it is kept; see the note at the foot
     of this file. */
  useEffect(() => {
    if (user && packToken && !packId) {
      notify?.("Signed in — your pack is kept.");
    }
  }, [user, packToken, packId, notify]);

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }

  async function onFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("That needs to be a JPEG, PNG or WebP photo.");
      return;
    }
    setError(null);
    setBusy("pack");
    try {
      const { base64, dataUrl } = await readFile(file);
      setPreview(dataUrl);
      const t = await token();
      const res = await fetch("/api/build-pack", {
        method: "POST",
        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
        body: JSON.stringify({ image: base64, mediaType: file.type, name: name.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "We could not build a pack from that photo.");
        setPreview(null);
      } else {
        setPack(body.pack);
        setName(body.pack.name === "You" ? "" : body.pack.name);
        setPackToken(body.packToken ?? null);
        setPackId(body.packId ?? null);
        setStep("pack");
      }
    } catch (err) {
      setError(err.message || "Something went wrong reading that photo.");
      setPreview(null);
    }
    setBusy(null);
  }

  async function draw(mediumId) {
    setError(null);
    setBusy("draw");
    setChoice(mediumId);
    setStills([]);
    setStep("out");
    try {
      const t = await token();
      const res = await fetch("/api/animate-pack", {
        method: "POST",
        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
        body: JSON.stringify({ packId, packToken, mediumId, count: user ? POSES.length : FREE_SET }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not draw that set.");
      else {
        setStills(body.stills ?? []);
        if (body.failed?.length) notify?.(`${body.failed.length} did not come back. You were not charged for those.`);
      }
    } catch (err) {
      setError(err.message || "Something went wrong drawing your set.");
    }
    setBusy(null);
  }

  const waiting = busy === "draw" ? (user ? POSES.length : FREE_SET) : 0;

  return (
    <div className="cast">
      <style>{css}</style>

      {step === "selfie" && (
        <>
          <h1 className="cast-h">Be in the movie.</h1>
          <p className="cast-sub">
            One photo of yourself. We build a character you can use again — as a drawing,
            or as the lead of a scene — and it is the same person every time.
          </p>
          <div
            className="cast-drop"
            data-over={over ? "1" : "0"}
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
          >
            <div style={{ ...mono, fontSize: 14, color: "var(--text)" }}>
              {busy === "pack" ? "Reading your photo…" : "Take or choose a photo"}
            </div>
            <div style={{ ...mono, fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.7 }}>
              Looking at the camera, just you in frame.<br />No account needed.
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            style={{ display: "none" }}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </>
      )}

      {step === "pack" && pack && (
        <>
          <h1 className="cast-h">This is you.</h1>
          <p className="cast-sub">
            Everything below is locked from here on. It is what keeps you looking like
            yourself in every scene, so it is not editable — only the name is yours to set.
          </p>
          <div className="cast-card">
            {preview && <img className="cast-face" src={preview} alt="Your reference photo" />}
            <div style={{ flex: 1, minWidth: 220 }}>
              <input
                className="cast-name"
                value={name}
                placeholder="Your name"
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                aria-label="Your name"
              />
              <div className="cast-field" style={{ marginTop: 12 }}>
                <div><b>Looks like</b> {pack.identity}</div>
                {pack.build && <div><b>Build</b> {pack.build}</div>}
                {pack.distinguishing && <div><b>Distinguishing</b> {pack.distinguishing}</div>}
                {pack.wardrobe && <div><b>Wearing</b> {pack.wardrobe}</div>}
              </div>
            </div>
          </div>
          <div className="cast-row">
            <button className="gen-button" type="button" onClick={() => setStep("look")}>
              That is me
            </button>
            <button className="btn-ghost" type="button" onClick={() => { setPack(null); setPreview(null); setStep("selfie"); }}>
              Use a different photo
            </button>
          </div>
        </>
      )}

      {step === "look" && (
        <>
          <h1 className="cast-h">Pick a look.</h1>
          <p className="cast-sub">
            A medium draws you. A movie puts you in a scene. Either way it is the same
            person — that is the whole point.
          </p>

          <div className="cast-label">Animate yourself</div>
          <div className="cast-grid">
            {MEDIUMS.map((m) => (
              <button key={m.id} className="cast-opt" data-on={choice === m.id ? "1" : "0"}
                type="button" onClick={() => draw(m.id)}>
                <div className="cast-opt-l">{m.label}</div>
                <div className="cast-opt-n">{m.note}</div>
              </button>
            ))}
          </div>

          <div className="cast-label">Be in the movie</div>
          <div className="cast-grid">
            {GENRES.map((g) => (
              <button key={g.id} className="cast-opt" type="button"
                onClick={() => notify?.("Scenes are coming next — the drawings work now.")}>
                <div className="cast-opt-l">{g.label}</div>
                <div className="cast-opt-n">{g.note}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "out" && (
        <>
          <h1 className="cast-h">{busy === "draw" ? "Drawing you…" : "Here you are."}</h1>
          <p className="cast-sub">
            {busy === "draw"
              ? "Same face in each one. That is the part nothing else does."
              : `${stills.length} of you, in ${(MEDIUMS.find((m) => m.id === choice) ?? {}).label ?? "your medium"}.`}
          </p>
          <div className="cast-out">
            {stills.map((s) => (
              <figure key={s.poseId} className="cast-still" style={{ margin: 0 }}>
                <img src={s.url} alt={`You, ${s.note.toLowerCase()}`} loading="lazy" />
                <figcaption>{s.note}</figcaption>
              </figure>
            ))}
            {busy === "draw" && Array.from({ length: Math.max(0, waiting - stills.length) }, (_, i) => (
              <div key={"slot" + i} className="cast-slot">· · ·</div>
            ))}
          </div>

          {!busy && stills.length > 0 && (
            <>
              {!user && (
                <div className="cast-keep">
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700 }}>
                    Keep this character
                  </div>
                  <div style={{ ...mono, fontSize: 12, color: "var(--muted)", lineHeight: 1.75, marginTop: 6 }}>
                    Sign in and this stays yours — the same face, in any medium, whenever you come back.
                    Without an account it is gone in seven days.
                  </div>
                  <div className="cast-row" style={{ marginTop: 14 }}>
                    <button className="gen-button" type="button" onClick={() => onSignInClick?.()}>
                      Keep my pack
                    </button>
                  </div>
                </div>
              )}
              <div className="cast-row">
                <button className="btn-ghost" type="button" onClick={() => setStep("look")}>
                  Another look
                </button>
                <button className="btn-ghost" type="button" onClick={() => setPage?.("vault")}>
                  {user ? "Open the Vault" : "What is a pack?"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {error && <div className="cast-err">{error}</div>}
    </div>
  );
}
