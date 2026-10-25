import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import { MEDIUMS, GENRES } from "./lib/stylePresets.js";
import { POSES, FREE_SET } from "./lib/stillSet.js";
import { BEATS } from "./lib/sceneBeats.js";
import { ANGLES, USABLE_SET, angleById } from "./lib/captureAngles.js";
import { isAdmin } from "./lib/admin.js";

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
  const [step, setStep] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("crew")) return "invited";
    if (q.get("capture")) return "capture";
    return "selfie";
  });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const [preview, setPreview] = useState(null);
  const [pack, setPack] = useState(null);
  const [packToken, setPackToken] = useState(null);
  const [packId, setPackId] = useState(null);
  const [name, setName] = useState("");

  const [choice, setChoice] = useState(null);
  const [genre, setGenre] = useState(null);
  const [seats, setSeats] = useState(1);
  const [crewId, setCrewId] = useState(() => new URLSearchParams(window.location.search).get("crew"));
  const [crew, setCrew] = useState(null);
  const [joined, setJoined] = useState(false);
  const [mine, setMine] = useState([]);
  const [capture, setCapture] = useState(null);
  const [typedCode, setTypedCode] = useState("");
  const captureRef = useRef(null);
  const [stills, setStills] = useState([]);
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  /*
    A pack made before signing in is claimed the moment a session appears.

    Guarded by a ref rather than by state because this effect can run again
    before the claim returns — React re-runs it on any dependency change,
    and a second claim in flight is how somebody ends up with two of
    themselves in their Vault. The route is idempotent too; the ref just
    saves the round trip.
  */
  const claiming = useRef(false);
  useEffect(() => {
    if (!user || !packToken || packId || claiming.current) return;
    claiming.current = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const t = data?.session?.access_token;
        if (!t) { claiming.current = false; return; }
        const res = await fetch("/api/claim-pack", {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: "Bearer " + t },
          body: JSON.stringify({ packToken }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) { notify?.(body.error || "We could not keep that pack."); return; }
        if (body.packId) setPackId(body.packId);
        notify?.(body.sets
          ? `Kept — your pack and ${body.sets} set${body.sets === 1 ? "" : "s"} are in your Vault.`
          : "Kept — your pack is in your Vault.");
      } catch {
        notify?.("We could not keep that pack.");
        claiming.current = false;
      }
    })();
  }, [user, packToken, packId, notify]);

  /*
    Somebody opened an invite link. The whole first screen changes: this
    person was asked by name, which is the most convincing thing that will
    ever happen to them in this product, so it leads rather than sitting
    under a generic hero.

    Read straight from the address bar because the router here carries a page
    and nothing else, and threading one query parameter through it would be a
    change to every other page for the benefit of this one.
  */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("crew");
    if (!id) return;
    (async () => {
      try {
        const res = await fetch("/api/crew-invite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ inviteId: id }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) { setError(body.error || "That invite could not be opened."); return; }
        setCrew(body);
      } catch {
        setError("That invite could not be opened.");
      }
    })();
  }, []);

  /*
    A duet. Somebody who already has a locked character does not need to take
    another selfie to be in a scene, and asking them to would be the main
    reason they do not finish: they have already done this part, and the
    result is the same face.

    Read with the browser client on purpose. RLS scopes vault_entries to the
    owner, so this returns the viewer's own characters and cannot return
    anybody else's \u2014 the authorization is the policy, not this query.
  */
  useEffect(() => {
    if (step !== "invited" || !user) return;
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("vault_entries")
        .select("id, name, images")
        .eq("kind", "character")
        .order("created_at", { ascending: false })
        .limit(12);
      if (live) setMine((data ?? []).filter((r) => Array.isArray(r.images) && r.images.length));
    })();
    return () => { live = false; };
  }, [step, user]);

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

  /*
    A scene is a video generation, which means credits, a webhook and a wait
    measured in minutes rather than seconds. It goes through the generator
    this site already has \u2014 the same credits, the same refund on failure, the
    same take that appears on the Takes page \u2014 rather than a second pipeline
    that would drift from it.

    It needs an account, which is a change from the plan: there the first
    scene came before sign-up. A still can be anonymous because it costs
    almost nothing and lives under a token; a video generation is real money
    against a real queue, and a take has to belong to somebody to be refunded
    when it fails.
  */
  async function shoot(beatId) {
    if (!user) { onSignInClick?.(); return; }
    if (!packId) { notify?.("Keep your pack first \u2014 scenes need somewhere to live."); return; }
    setError(null);
    setBusy("shoot");
    try {
      const t = await token();
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + t },
        body: JSON.stringify({
          model: "seedance-2.5",
          duration: 5,
          aspectRatio: "16:9",
          /* The prompt is compiled on the server from these ids. Nothing
             about the identity is sent from here. */
          prompt: "cast",
          cast: { packIds: [packId], styleId: genre, beatId },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not start that scene.");
      else {
        notify?.("Shooting \u2014 it appears on your Takes page when it is done.");
        setPage?.("takes");
      }
    } catch (err) {
      setError(err.message || "We could not start that scene.");
    }
    setBusy(null);
  }

  /*
    A capture session. The camera is never on the machine you are working at:
    on the lot it is a rig with an operator, and at home it is the phone in
    your pocket rather than the laptop webcam pointing up your nose. Both are
    the same handoff, so both are this.
  */
  async function openCapture(source) {
    setError(null);
    setBusy("capture");
    try {
      const t = await token();
      const res = await fetch("/api/capture-open", {
        method: "POST",
        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
        body: JSON.stringify(source === "booth" ? { source: "booth", rig: "lot" } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not start that capture.");
      else { setCapture({ ...body, shot: [] }); setStep("remote"); }
    } catch (err) {
      setError(err.message || "We could not start that capture.");
    }
    setBusy(null);
  }

  async function readCapture(code) {
    const res = await fetch("/api/capture-open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "That code does not match a capture.");
    return body;
  }

  async function sendFrame(file, pose) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("That needs to be a JPEG, PNG or WebP photo.");
      return;
    }
    setError(null);
    setBusy("frame");
    try {
      const { base64 } = await readFile(file);
      const res = await fetch("/api/capture-frame", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: capture.code, pose, image: base64, mediaType: file.type }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not use that photo.");
      else setCapture((c) => ({ ...c, shot: body.shot, next: body.next, usable: body.usable }));
    } catch (err) {
      setError(err.message || "Something went wrong sending that photo.");
    }
    setBusy(null);
  }

  /* Build from the capture rather than from a photo. Every frame was already
     read and gated as it arrived, so this is a database read on the server,
     not another eight vision calls over the same faces. */
  async function buildFromCapture() {
    setError(null);
    setBusy("pack");
    try {
      const t = await token();
      const res = await fetch("/api/build-pack", {
        method: "POST",
        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
        body: JSON.stringify({ sessionCode: capture.code, name: name.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not build a pack from that capture.");
      else {
        setPack(body.pack);
        setName(body.pack.name === "You" ? "" : body.pack.name);
        setPackToken(body.packToken ?? null);
        setPackId(body.packId ?? null);
        setStep("pack");
      }
    } catch (err) {
      setError(err.message || "Something went wrong building that pack.");
    }
    setBusy(null);
  }

  /* The device holding the camera. It knows only the code, so it asks what
     has been shot already and carries on from there \u2014 which is also what
     makes a dropped connection recoverable: reopen the link, same session. */
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("capture");
    if (!code) return;
    let live = true;
    (async () => {
      try {
        const body = await readCapture(code);
        if (live) setCapture({ ...body, code: code.trim().toUpperCase() });
      } catch (err) {
        if (live) setError(err.message);
      }
    })();
    return () => { live = false; };
  }, []);

  /*
    The waiting room polls. A poll rather than a socket because the whole
    session is a few minutes long and a socket would be infrastructure for a
    progress bar; it stops the moment the capture is usable or finished, so
    it cannot run all day on a forgotten tab.
  */
  useEffect(() => {
    if (step !== "remote" || !capture?.code) return;
    if (capture.status !== "open" || capture.usable) return;
    const id = setInterval(async () => {
      try {
        const body = await readCapture(capture.code);
        setCapture((c) => (c ? { ...c, ...body } : c));
      } catch { /* a missed poll is a missed poll; the next one is in four seconds */ }
    }, 4000);
    captureRef.current = id;
    return () => clearInterval(id);
  }, [step, capture?.code, capture?.status, capture?.usable]);

  /* Typed off a laptop screen rather than followed as a link \u2014 which is
     most of the time, because the link is on the wrong device by definition. */
  async function joinCapture() {
    const code = typedCode.trim().toUpperCase();
    if (code.length < 6) { setError("That code is six characters."); return; }
    setError(null);
    setBusy("capture");
    try {
      const body = await readCapture(code);
      if (body.status !== "open") setError("That capture is already finished.");
      else { setCapture({ ...body, code }); setStep("capture"); }
    } catch (err) {
      setError(err.message || "That code does not match a capture.");
    }
    setBusy(null);
  }

  async function takeSeat(pid, ptok, displayName) {
    setBusy("join");
    try {
      const t = await token();
      const res = await fetch("/api/crew-join", {
        method: "POST",
        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
        body: JSON.stringify({ inviteId: crewId, packId: pid, packToken: ptok, displayName }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not add you to that scene.");
      else {
        setJoined(true);
        setCrew((c) => ({ ...(c ?? {}), taken: body.taken, seats: body.seats }));
        setStep("invited");
      }
    } catch (err) {
      setError(err.message || "We could not add you to that scene.");
    }
    setBusy(null);
  }

  /* The host opens a scene and gets a link. The beat is chosen first because
     what happens is the interesting part; who is in it follows. */
  async function askSomeone(beatId) {
    if (!user || !packId) { onSignInClick?.(); return; }
    setError(null);
    setBusy("invite");
    try {
      const t = await token();
      const res = await fetch("/api/crew-invite", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + t },
        body: JSON.stringify({ packId, styleId: genre, beatId, seats }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not open that scene.");
      else {
        setCrewId(body.inviteId);
        setCrew({
          ...body, host: true, status: "open",
          style: GENRES.find((g) => g.id === genre) ?? null,
          beat: BEATS.find((b) => b.id === beatId) ?? null,
        });
        setStep("hosting");
      }
    } catch (err) {
      setError(err.message || "We could not open that scene.");
    }
    setBusy(null);
  }

  async function refreshCrew() {
    if (!crewId) return;
    setBusy("check");
    try {
      const res = await fetch("/api/crew-invite", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteId: crewId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setCrew((c) => ({ ...(c ?? {}), ...body, host: true }));
    } catch { /* a failed check is a check that can be pressed again */ }
    setBusy(null);
  }

  async function shootCrew() {
    setError(null);
    setBusy("shoot");
    try {
      const t = await token();
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + t },
        body: JSON.stringify({
          model: "seedance-2.5", duration: 5, aspectRatio: "16:9", prompt: "cast",
          cast: { crewInviteId: crewId },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not shoot that scene.");
      else { notify?.("Shooting \u2014 it appears on your Takes page when it is done."); setPage?.("takes"); }
    } catch (err) {
      setError(err.message || "We could not shoot that scene.");
    }
    setBusy(null);
  }

  const inviteLink = crewId ? `${window.location.origin}/cast?crew=${crewId}` : "";
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
          <div className="cast-row">
            <button className="btn-ghost" type="button" disabled={busy === "capture"}
              onClick={() => openCapture("phone")}>
              {busy === "capture" ? "Starting\u2026" : "Use my phone, several angles"}
            </button>
            {isAdmin(user) && (
              <button className="btn-ghost" type="button" disabled={busy === "capture"}
                onClick={() => openCapture("booth")}>
                Open a booth capture
              </button>
            )}
          </div>
          <div style={{ ...mono, fontSize: 11, color: "var(--muted)", lineHeight: 1.7, marginTop: 10 }}>
            One photo works. {USABLE_SET} angles or more holds up when the camera moves —
            that is the only difference, and it is a real one.
          </div>

          <div className="cast-label">Or you have a code</div>
          <div className="cast-row">
            <input
              className="cast-name"
              style={{ maxWidth: 200, letterSpacing: 4, textTransform: "uppercase" }}
              value={typedCode}
              placeholder="ABC234"
              maxLength={6}
              aria-label="Capture code"
              onChange={(e) => setTypedCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); joinCapture(); } }}
            />
            <button className="btn-ghost" type="button"
              disabled={busy === "capture" || typedCode.trim().length < 6}
              onClick={joinCapture}>
              {busy === "capture" ? "Opening\u2026" : "Shoot the angles"}
            </button>
          </div>
        </>
      )}

      {/*
        The waiting room. Whoever opened the capture watches angles arrive
        from the other device. Nothing here is a face: the status read returns
        which angles are shot and nothing else.
      */}
      {step === "remote" && capture && (
        <>
          <h1 className="cast-h">
            {capture.source === "booth" ? "Booth capture open." : "Open this on your phone."}
          </h1>
          <p className="cast-sub">
            {capture.source === "booth"
              ? "The console shoots the angles. They appear here as they land."
              : "Go to revaultai.com/cast on your phone and enter this code, or open the link below on it."}
          </p>
          <div className="cast-card" style={{ display: "block" }}>
            <div style={{ ...mono, fontSize: 32, letterSpacing: 6, color: "var(--text)" }}>
              {capture.code}
            </div>
            <input className="cast-name" readOnly aria-label="Capture link"
              style={{ marginTop: 12 }}
              value={`${window.location.origin}/cast?capture=${capture.code}`}
              onFocus={(e) => e.target.select()} />
          </div>

          <div className="cast-label">Angles</div>
          <div className="cast-grid">
            {(capture.angles ?? ANGLES).map((a) => {
              const done = (capture.shot ?? []).includes(a.id);
              return (
                <div key={a.id} className="cast-opt" data-on={done ? "1" : "0"}>
                  <div className="cast-opt-l">{a.label}</div>
                  <div className="cast-opt-n">{done ? "Shot" : a.required ? "Needed" : "Waiting"}</div>
                </div>
              );
            })}
          </div>

          <div className="cast-row">
            <button className="gen-button" type="button"
              disabled={!capture.usable || busy === "pack"} onClick={buildFromCapture}>
              {busy === "pack"
                ? "Building\u2026"
                : capture.usable
                  ? "Build my character"
                  : `${(capture.shot ?? []).length} of ${USABLE_SET} so far`}
            </button>
            <button className="btn-ghost" type="button"
              onClick={() => { setCapture(null); setStep("selfie"); }}>
              Use one photo instead
            </button>
          </div>
          {capture.status === "expired" && (
            <p className="cast-sub">That capture expired. Start another one.</p>
          )}
        </>
      )}

      {/*
        The camera device. One angle at a time, named, because "upload some
        photos of yourself" produces six of the same forward-facing smile and
        only the first of those is worth anything downstream.
      */}
      {step === "capture" && (
        <>
          <h1 className="cast-h">{capture ? "Shoot these angles." : "Opening that capture\u2026"}</h1>
          {capture && (
            <>
              <p className="cast-sub">
                {capture.next
                  ? `Next: ${capture.next.label}. ${angleById(capture.next.id)?.note ?? ""}`
                  : "Every angle is shot. You can retake any of them."}
              </p>
              <div className="cast-grid">
                {(capture.angles ?? ANGLES).map((a) => {
                  const done = (capture.shot ?? []).includes(a.id);
                  return (
                    <div key={a.id}>
                      <button className="cast-opt" data-on={done ? "1" : "0"} type="button"
                        style={{ width: "100%" }}
                        disabled={busy === "frame"}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/jpeg,image/png,image/webp";
                          input.capture = a.id === "full-body" ? "environment" : "user";
                          input.onchange = () => sendFrame(input.files?.[0], a.id);
                          input.click();
                        }}>
                        <div className="cast-opt-l">{a.label}</div>
                        <div className="cast-opt-n">
                          {busy === "frame" ? "Sending\u2026" : done ? "Shot \u2014 tap to retake" : a.note}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ ...mono, fontSize: 11, color: "var(--muted)", lineHeight: 1.7, marginTop: 14 }}>
                {capture.usable
                  ? "That is enough. Finish on the device you started on, or build it here."
                  : `${(capture.shot ?? []).length} of ${USABLE_SET}. Straight at the camera is the one we cannot do without.`}
              </div>
              {capture.usable && (
                <div className="cast-row">
                  <button className="gen-button" type="button" disabled={busy === "pack"}
                    onClick={buildFromCapture}>
                    {busy === "pack" ? "Building\u2026" : "Build my character here"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {step === "pack" && pack && (
        <>
          <h1 className="cast-h">{crewId ? "Say who you are." : "This is you."}</h1>
          <p className="cast-sub">
            {crewId ? "Your name goes in the scene, so it has to be yours. " : ""}
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
            <button
              className="gen-button"
              type="button"
              disabled={busy === "join" || (crewId ? !name.trim() : false)}
              onClick={() => (crewId ? takeSeat(packId, packToken, name.trim()) : setStep("look"))}
            >
              {crewId ? (busy === "join" ? "Taking your seat\u2026" : "That is me \u2014 I am in") : "That is me"}
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
              <button key={g.id} className="cast-opt" data-on={genre === g.id ? "1" : "0"}
                type="button" onClick={() => setGenre(genre === g.id ? null : g.id)}>
                <div className="cast-opt-l">{g.label}</div>
                <div className="cast-opt-n">{g.note}</div>
              </button>
            ))}
          </div>

          {genre && (
            <>
              <div className="cast-label">Who is in it</div>
              <div className="cast-grid">
                {[
                  { n: 1, l: "Just me", t: "Shoots as soon as you pick what happens." },
                  { n: 2, l: "Me and one other", t: "You get a link to send. They add their own photo." },
                  { n: 3, l: "Me and two others", t: "Same, with room for one more." },
                ].map((o) => (
                  <button key={o.n} className="cast-opt" data-on={seats === o.n ? "1" : "0"}
                    type="button" onClick={() => setSeats(o.n)}>
                    <div className="cast-opt-l">{o.l}</div>
                    <div className="cast-opt-n">{o.t}</div>
                  </button>
                ))}
              </div>

              <div className="cast-label">And what happens</div>
              <div className="cast-grid">
                {BEATS.map((b) => (
                  <button key={b.id} className="cast-opt" type="button"
                    disabled={busy === "shoot" || busy === "invite"}
                    onClick={() => (seats > 1 ? askSomeone(b.id) : shoot(b.id))}>
                    <div className="cast-opt-l">{b.label}</div>
                    <div className="cast-opt-n">{b.note}</div>
                  </button>
                ))}
              </div>
              <div style={{ ...mono, fontSize: 11, color: "var(--muted)", lineHeight: 1.7, marginTop: 12 }}>
                {busy === "shoot" || busy === "invite"
                  ? "Starting\u2026"
                  : !user
                    ? "Scenes need an account \u2014 the drawings do not."
                    : seats > 1
                      ? "You get a link to send. Nothing is shot, and nothing is charged, until everybody is in."
                      : "Five seconds, and it costs credits. It appears on your Takes page when it is done."}
              </div>
            </>
          )}
        </>
      )}

      {/*
        Somebody arrived on a link. They were asked by name, by a person, into
        a specific scene, and all three of those facts go above the fold: they
        are the reason this person will put their face in.
      */}
      {step === "invited" && !crew && !error && (
        <p className="cast-sub" style={{ marginTop: 40 }}>Opening that invite…</p>
      )}

      {step === "invited" && crew && !crew.host && (
        <>
          <h1 className="cast-h">
            {joined ? "You are in." : `${crew.hostName || "Somebody"} wants you in a scene.`}
          </h1>
          <p className="cast-sub">
            {joined
              ? `${crew.hostName || "They"} shoots it once everybody is in. It lands on their Takes page, and you will be in it.`
              : user && mine.length
                ? "Pick somebody you have already played, or take a new photo. Either way it is the same face it always was."
                : "One photo of yourself and you are in the scene with them. No account needed."}
          </p>
          <div className="cast-card" style={{ display: "block" }}>
            <div className="cast-field">
              {crew.style?.label && <div><b>The look</b> {crew.style.label}</div>}
              {crew.beat?.label && <div><b>What happens</b> {crew.beat.label}</div>}
              <div>
                <b>Seats</b>{" "}
                {crew.seats - (crew.taken ?? 0) > 0
                  ? `${crew.seats - (crew.taken ?? 0)} of ${crew.seats} still open`
                  : "full"}
              </div>
            </div>
          </div>

          {!joined && crew.status === "open" && (crew.seats - (crew.taken ?? 0)) > 0 && user && mine.length > 0 && (
            <>
              <div className="cast-label">Somebody you have already played</div>
              <div className="cast-grid">
                {mine.map((m) => (
                  <button key={m.id} className="cast-opt" type="button" disabled={busy === "join"}
                    onClick={() => takeSeat(m.id, null, m.name)}>
                    <div className="cast-opt-l">{m.name}</div>
                    <div className="cast-opt-n">
                      {busy === "join" ? "Taking your seat\u2026" : "Same face, no new photo"}
                    </div>
                  </button>
                ))}
              </div>
              <div className="cast-label">Or somebody new</div>
            </>
          )}

          {!joined && crew.status === "open" && (crew.seats - (crew.taken ?? 0)) > 0 && (
            <>
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
                  {busy === "pack" ? "Reading your photo\u2026" : busy === "join" ? "Taking your seat\u2026" : "Take or choose a photo"}
                </div>
                <div style={{ ...mono, fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.7 }}>
                  Looking at the camera, just you in frame.
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

          {!joined && crew.status !== "open" && (
            <p className="cast-sub">That scene has already been shot.</p>
          )}
          {!joined && crew.status === "open" && (crew.seats - (crew.taken ?? 0)) <= 0 && (
            <p className="cast-sub">Every seat in that scene is taken.</p>
          )}

          {joined && (
            <div className="cast-row">
              <button className="gen-button" type="button" onClick={() => { setCrewId(null); setCrew(null); setJoined(false); setStep("look"); }}>
                Make one of your own
              </button>
            </div>
          )}
        </>
      )}

      {/*
        The host's side is a waiting room, and the only honest thing to put in
        it is the link and a count. Checking is a button rather than a poll:
        a poll would run for however long this tab stays open, and the person
        is going to be in a text message, not on this page.
      */}
      {step === "hosting" && crew && (
        <>
          <h1 className="cast-h">Send this to them.</h1>
          <p className="cast-sub">
            Whoever opens it lands in the scene with you — with a new photo, or with a
            character they have already played. Nothing is shot, and nothing is charged,
            until everybody is in.
          </p>
          <div className="cast-card" style={{ display: "block" }}>
            <input className="cast-name" readOnly value={inviteLink} aria-label="Invite link"
              onFocus={(e) => e.target.select()} />
            <div className="cast-field" style={{ marginTop: 12 }}>
              <div><b>In it so far</b> {(crew.taken ?? 1)} of {crew.seats}</div>
              {crew.beat?.label && <div><b>What happens</b> {crew.beat.label}</div>}
            </div>
          </div>
          <div className="cast-row">
            <button className="gen-button" type="button"
              onClick={() => { navigator.clipboard?.writeText(inviteLink); notify?.("Link copied."); }}>
              Copy the link
            </button>
            <button className="btn-ghost" type="button" disabled={busy === "check"} onClick={refreshCrew}>
              {busy === "check" ? "Checking\u2026" : "Has anybody joined?"}
            </button>
          </div>
          {(crew.taken ?? 1) >= 2 && crew.status === "open" && (
            <div className="cast-row">
              <button className="gen-button" type="button" disabled={busy === "shoot"} onClick={shootCrew}>
                {busy === "shoot" ? "Starting\u2026" : "Shoot it"}
              </button>
            </div>
          )}
          {crew.status !== "open" && <p className="cast-sub">Already shot. It is on your Takes page.</p>}
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
                <button className="btn-ghost" type="button" disabled={busy === "delete"}
                  onClick={async () => {
                    if (!window.confirm("Delete this character and every drawing of it? This cannot be undone.")) return;
                    setBusy("delete");
                    try {
                      const t = await token();
                      const res = await fetch("/api/delete-pack", {
                        method: "POST",
                        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
                        body: JSON.stringify({ packId, packToken }),
                      });
                      const body = await res.json().catch(() => ({}));
                      if (!res.ok) { setError(body.error || "We could not delete that."); }
                      else {
                        notify?.("Deleted — the pack and every image of it are gone.");
                        setPack(null); setPackId(null); setPackToken(null);
                        setPreview(null); setStills([]); setStep("selfie");
                      }
                    } catch (err) {
                      setError(err.message || "We could not delete that.");
                    }
                    setBusy(null);
                  }}>
                  {busy === "delete" ? "Deleting\u2026" : "Delete this character"}
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
