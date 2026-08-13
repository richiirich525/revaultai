import { useEffect, useState } from "react";
import { fetchComments, insertComment, deleteComment } from "./lib/comments.js";

/*
  Comments — RevaultAI
  Rendered on film detail pages. Public read, signed-in write.
  The film's owner can delete any comment; commenters can delete their own.
*/

const CM_CSS = `
  .cm-wrap { margin-top: 56px; }
  .cm-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.22em; color: var(--accent); text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
  .cm-label-line { flex: 1; height: 1px; background: rgba(123,63,228,0.18); }
  .cm-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 3px; padding: 24px 28px; max-width: 780px; }
  .cm-form textarea { width: 100%; box-sizing: border-box; background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 12px 14px; font-family: 'Syne', sans-serif; font-size: 14px; border-radius: 4px; outline: none; min-height: 80px; resize: vertical; line-height: 1.6; transition: border-color 0.2s; }
  .cm-form textarea:focus { border-color: var(--accent); }
  .cm-form textarea::placeholder { color: var(--muted); }
  .cm-form-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
  .cm-count { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.08em; }
  .cm-signin { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.7; }
  .cm-item { display: flex; gap: 14px; padding: 20px 0; border-bottom: 1px solid var(--border); }
  .cm-item:last-child { border-bottom: none; padding-bottom: 0; }
  .cm-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; object-fit: cover; background: var(--accent-dim); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--accent); overflow: hidden; }
  .cm-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .cm-body-wrap { flex: 1; min-width: 0; }
  .cm-meta { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .cm-name { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; color: var(--text); cursor: pointer; }
  .cm-name:hover { color: var(--accent); }
  .cm-time { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 0.06em; }
  .cm-text { font-size: 14px; color: var(--text); line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
  .cm-del { background: none; border: none; color: var(--muted); font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; padding: 4px 0; margin-top: 6px; transition: color 0.2s; }
  .cm-del:hover { color: #F87171; }
  .cm-empty { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.7; }
  .cm-off { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 0.06em; }
`;

function initial(name) {
  const s = (name || "").trim();
  return s ? s[0].toUpperCase() : "?";
}

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + "d ago";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Comments({ creation, user, isOwner, setPage, setCreatorUser, notify, onSignInClick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const enabled = creation?.comments_enabled !== false;

  useEffect(() => {
    if (!creation?.id || !enabled) { setItems([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await fetchComments(creation.id);
      if (cancelled) return;
      if (error) console.warn("[RevaultAI] Could not load comments:", error.message);
      setItems(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [creation?.id, enabled]);

  async function handlePost() {
    const text = body.trim();
    if (!text) return;
    if (text.length > 1000) { notify("Comments are limited to 1000 characters."); return; }
    setPosting(true);
    const { data, error } = await insertComment(creation.id, user.id, text);
    setPosting(false);
    if (error) { notify("Could not post comment: " + error.message); return; }
    setItems((prev) => [data, ...prev]);
    setBody("");
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this comment?")) return;
    const { error } = await deleteComment(id);
    if (error) { notify("Could not delete: " + error.message); return; }
    setItems((prev) => prev.filter((c) => c.id !== id));
  }

  if (!enabled) {
    return (
      <div className="cm-wrap">
        <style>{CM_CSS}</style>
        <div className="cm-label">Comments<div className="cm-label-line" /></div>
        <div className="cm-box"><div className="cm-off">Comments are turned off for this film.</div></div>
      </div>
    );
  }

  return (
    <div className="cm-wrap">
      <style>{CM_CSS}</style>
      <div className="cm-label">
        Comments{items.length > 0 ? " \u00B7 " + items.length : ""}
        <div className="cm-label-line" />
      </div>
      <div className="cm-box">
        {user ? (
          <div className="cm-form">
            <textarea
              placeholder="Share what you noticed about this film — craft, technique, questions."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
            />
            <div className="cm-form-row">
              <span className="cm-count">{body.length}/1000</span>
              <button className="btn-primary" style={{ padding: "10px 24px", fontSize: 11 }} onClick={handlePost} disabled={posting || !body.trim()}>
                {posting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </div>
        ) : (
          <div className="cm-signin">
            <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={onSignInClick}>Sign in</span> to leave a comment.
          </div>
        )}

        <div style={{ marginTop: user ? 28 : 20 }}>
          {loading ? (
            <div className="cm-empty">Loading comments...</div>
          ) : items.length === 0 ? (
            <div className="cm-empty">No comments yet. Be the first to say something worth reading.</div>
          ) : (
            items.map((c) => {
              const p = c.profiles || {};
              const name = p.display_name || p.username || "Someone";
              const canDelete = !!user && (user.id === c.user_id || isOwner);
              return (
                <div key={c.id} className="cm-item">
                  <div className="cm-avatar">
                    {p.avatar_url ? <img src={p.avatar_url} alt={name} onError={(e) => { e.target.style.display = "none"; }} /> : initial(name)}
                  </div>
                  <div className="cm-body-wrap">
                    <div className="cm-meta">
                      <span className="cm-name" onClick={() => { if (p.username) { setCreatorUser(p.username); setPage("profile"); } }}>{name}</span>
                      <span className="cm-time">{timeAgo(c.created_at)}</span>
                    </div>
                    <div className="cm-text">{c.body}</div>
                    {canDelete && <button className="cm-del" onClick={() => handleDelete(c.id)}>Delete</button>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}