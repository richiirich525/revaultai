import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  CastingPage — RevaultAI

  A role, and the page a stranger lands on when somebody posts it.

  Deliberately NOT built inside CastPage. That file is eleven hundred lines
  carrying Cast Yourself, Animate Yourself, booth capture, the phone remote,
  duets and crew hosting, and its own comment warns against threading one
  more parameter through it for the benefit of a single page. The part an
  audition actually needs — a photo, a call to build-pack, a name — is about
  sixty lines. Reusing the other thousand would mean inheriting a step
  machine with six states this page has no use for.

  Two audiences, one component, because the API answers both in one request:
  anybody holding the link sees the role and how many have gone up for it,
  and the owner additionally gets the auditions back and can cast one.
*/

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

const styles = `
  .ca-wrap { max-width: 720px; }
  .ca-panel { border: 1px solid var(--border); padding: 22px; margin-bottom: 20px; }
  .ca-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
              text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  .ca-brief { font-family: 'Cormorant Garamond', serif; font-size: 20px; line-height: 1.5; color: var(--text); }
  .ca-body { font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.8; color: var(--muted); }
  .ca-row { display: flex; align-items: center; justify-content: space-between; gap: 12px;
            border-top: 1px solid var(--border); padding: 12px 0; }
  .ca-pic { width: 84px; height: 84px; object-fit: cover; border: 1px solid var(--border); }
  .ca-input { width: 100%; background: transparent; border: 1px solid var(--border); color: var(--text);
              font-family: 'DM Mono', monospace; font-size: 12px; padding: 10px; }
  .ca-err { font-family: 'DM Mono', monospace; font-size: 11px; color: #E5B769; line-height: 1.7; margin-top: 10px; }
`;

export default function CastingPage({ id, user, setPage, onSignInClick }) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(null);

  const [preview, setPreview] = useState(null);
  const [pack, setPack] = useState(null);
  const [packId, setPackId] = useState(null);
  const [packToken, setPackToken] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef(null);

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }

  /*
    Fetching and state-setting are separate on purpose. A function that both
    fetches and writes state cannot be called from an effect body without
    tripping react-hooks/set-state-in-effect, however many awaits are inside
    it — the analyser sees the call, not the awaits. This one only returns,
    and every caller decides what to do with the answer.
  */
  async function fetchCall() {
    if (!id) return { error: null, call: null };
    try {
      const t = await token();
      const res = await fetch("/api/casting-call", {
        method: "POST",
        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
        body: JSON.stringify({ callId: id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { error: body.error || "That casting call could not be opened.", call: null };
      return { error: null, call: body };
    } catch {
      return { error: "That casting call could not be opened.", call: null };
    }
  }

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    (async () => {
      const { error: e, call: c } = await fetchCall();
      if (!alive) return;
      if (e) setError(e); else setCall(c);
      setLoading(false);
    })();
    return () => { alive = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id, user?.id]);

  /*
    The photograph. build-pack runs its three gates — one face, an adult, not
    a public figure — before a pack exists, and refuses on any uncertain
    answer, so nothing here needs to second-guess the image. Without an
    account the pack waits in pending_packs under a token and is claimed on
    sign-up, which is what somebody who is not cast still walks away with.
  */
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
      if (!res.ok) { setError(body.error || "We could not build a character from that photo."); setPreview(null); }
      else {
        setPack(body.pack);
        setName(body.pack?.name === "You" ? "" : (body.pack?.name ?? ""));
        setPackId(body.packId ?? null);
        setPackToken(body.packToken ?? null);
      }
    } catch (err) {
      setError(err.message || "Something went wrong reading that photo.");
      setPreview(null);
    }
    setBusy(null);
  }

  async function audition() {
    setBusy("audition");
    setError(null);
    try {
      const t = await token();
      const res = await fetch("/api/casting-audition", {
        method: "POST",
        headers: { "content-type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
        body: JSON.stringify({ callId: id, packId, packToken, displayName: name.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "That audition could not be sent.");
      else {
        setSubmitted(true);
        const { call: fresh } = await fetchCall();
        if (fresh) setCall(fresh);
      }
    } catch {
      setError("That audition could not be sent.");
    }
    setBusy(null);
  }

  if (loading) {
    return <div className="page"><section className="section"><div className="empty-state">
      <div className="empty-text">Opening the casting call&hellip;</div></div></section></div>;
  }

  if (!call) {
    return <div className="page"><section className="section"><div className="empty-state">
      <div className="empty-text">{error || "There is no casting call at this address."}</div>
      <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setPage("explore")}>Browse the gallery</button>
    </div></section></div>;
  }

  const closed = call.status !== "open";

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Casting call</div>
        <div className="page-hdr-title">{call.roleName}</div>
        <div className="page-hdr-sub">Cast by {call.casterName}.</div>
      </div>

      <section className="section">
        <div className="ca-wrap">
          <div className="ca-panel">
            <div className="ca-label">The role</div>
            <div className="ca-brief">{call.roleBrief}</div>
            <div className="ca-body" style={{ marginTop: 14 }}>
              {call.submissions} {call.submissions === 1 ? "person has" : "people have"} gone up for this.
              {closed && " This call is closed."}
            </div>
          </div>

          {/* ---- the audition ---- */}
          {!call.isOwner && !closed && (
            <div className="ca-panel">
              <div className="ca-label">Put yourself up for it</div>

              {submitted ? (
                <>
                  <div className="ca-body" style={{ color: "var(--text)" }}>
                    You are up for this role. If you are cast, {call.casterName} sends you an invite
                    showing the actual scene, and nothing is filmed until you accept that.
                  </div>
                  {!user && packToken && (
                    <div className="ca-body" style={{ marginTop: 12 }}>
                      Your character is saved and waiting. Sign up and it moves into your Vault,
                      whether or not you get the part.
                      <div style={{ marginTop: 12 }}>
                        <button className="btn-primary" onClick={onSignInClick}>Keep my character</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="ca-body" style={{ marginBottom: 14 }}>
                    One photo of your face. It becomes a locked character of you, which is yours to
                    keep whether or not you are cast. Nobody can put you in anything from a photo
                    somebody else uploaded.
                  </div>

                  {preview && <img className="ca-pic" src={preview} alt="" style={{ marginBottom: 12 }} />}

                  {!pack ? (
                    <>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: "none" }}
                        onChange={(e) => onFile(e.target.files?.[0])}
                      />
                      <button className="btn-primary" disabled={busy === "pack"} onClick={() => fileRef.current?.click()}>
                        {busy === "pack" ? "Reading the photo…" : "Choose a photo"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="ca-label" style={{ marginTop: 6 }}>What should they call you?</div>
                      <input
                        className="ca-input"
                        value={name}
                        maxLength={60}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="A first name is plenty"
                      />
                      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                        <button className="btn-primary" disabled={busy === "audition"} onClick={audition}>
                          {busy === "audition" ? "Sending…" : "Audition for " + call.roleName}
                        </button>
                        <button className="btn-ghost" style={{ fontSize: 11 }}
                          onClick={() => { setPack(null); setPreview(null); setPackId(null); setPackToken(null); }}>
                          Use a different photo
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {error && <div className="ca-err">{error}</div>}
            </div>
          )}

          {/* ---- the owner's side ---- */}
          {call.isOwner && (
            <div className="ca-panel">
              <div className="ca-label">Auditions &mdash; {call.auditions?.length ?? 0} of {call.maxAuditions}</div>
              {(call.auditions ?? []).length === 0 ? (
                <div className="ca-body">
                  Nobody yet. Send the link; this page is what they land on.
                </div>
              ) : (
                <>
                  <div className="ca-body" style={{ marginBottom: 6 }}>
                    Casting somebody does not film anything. It opens a scene and sends them an
                    invite showing it, and they decide again from there.
                  </div>
                  {(call.auditions ?? []).map((a) => (
                    <div className="ca-row" key={a.id}>
                      <div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, color: "var(--text)" }}>{a.name}</div>
                        <div className="ca-body">
                          {a.anonymous ? "No account yet" : "Has an account"}
                          {a.status !== "submitted" ? ` · ${a.status}` : ""}
                        </div>
                      </div>
                      {a.status === "cast" && <div className="ca-body" style={{ color: "#4ADE80" }}>Cast</div>}
                    </div>
                  ))}
                  <div className="ca-body" style={{ marginTop: 14 }}>
                    Casting is done from the scene you want them in, so it asks which movie and
                    which beat. That step is not on this page yet.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
