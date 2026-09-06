import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { fetchCreators } from "./lib/profiles.js";
import { MODELS } from "./prompts/models.js";
import { POSTS } from "./blog/posts.js";

/*
  SearchPage — RevaultAI
  One search across films, creators, Discovered, prompts and the Journal.
  Creations come in as a prop (already loaded by App). Creators and Discovered
  films are fetched once on mount; prompts and posts are local data. Everything
  is filtered client-side, which is fast at this scale and needs no backend.
*/

const styles = `
  .sr-input { width: 100%; background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 16px 20px; border-radius: 4px; font-family: 'Syne', sans-serif; font-size: 17px; outline: none; transition: border-color 0.2s; }
  .sr-input:focus { border-color: var(--accent); }
  .sr-count { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; margin: 18px 0 8px; }
  .sr-group { margin-top: 40px; }
  .sr-group-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .sr-row { padding: 14px 16px; border: 1px solid transparent; border-radius: 5px; cursor: pointer; transition: all 0.2s; }
  .sr-row:hover { background: var(--bg2); border-color: var(--border); }
  .sr-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .sr-meta { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--muted); }
  .sr-snip { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.7; margin-top: 6px; }
  .sr-empty { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.9; padding: 48px 0; text-align: center; }
  .sr-hint { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9; margin-top: 14px; }
`;

function norm(s) {
  return String(s ?? "").toLowerCase();
}

function snippet(text, q, len = 150) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const i = norm(s).indexOf(norm(q));
  if (i < 0) return s.slice(0, len) + (s.length > len ? "…" : "");
  const start = Math.max(0, i - 40);
  const out = s.slice(start, start + len);
  return (start > 0 ? "…" : "") + out + (start + len < s.length ? "…" : "");
}

export default function SearchPage({ creations, setPage, setDetailId, setCreatorUser, openPost, openPromptModel }) {
  const [q, setQ] = useState("");
  const [creators, setCreators] = useState([]);
  const [discovered, setDiscovered] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: cs } = await fetchCreators();
      if (!cancelled) setCreators(cs ?? []);
      const { data: df } = await supabase
        .from("discovered_films")
        .select("id, title, director_name, genre, note, youtube_id")
        .order("sort_order", { ascending: true });
      if (!cancelled) setDiscovered(df ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => {
    const term = q.trim();
    if (term.length < 2) return null;
    const t = norm(term);
    const hit = (...fields) => fields.some((f) => norm(f).includes(t));

    const films = (creations ?? []).filter(
      (c) =>
        c.premium_status !== "Pending" &&
        hit(c.title, c.category, (c.tools_used ?? []).join(" "), c.creator?.display_name, c.creator?.username, c.prompt_full)
    );

    const people = creators.filter((c) => hit(c.display_name, c.username, c.bio));

    const disc = discovered.filter((f) => hit(f.title, f.director_name, f.genre, f.note));

    const prompts = [];
    for (const m of MODELS) {
      for (const p of m.prompts) {
        if (hit(p.title, p.genre, p.text, m.name)) prompts.push({ ...p, modelName: m.name, modelSlug: m.slug });
      }
    }

    const posts = (POSTS ?? []).filter((p) => hit(p.title, p.description, p.seoTitle));

    return { films, people, disc, prompts, posts };
  }, [q, creations, creators, discovered]);

  const total = results
    ? results.films.length + results.people.length + results.disc.length + results.prompts.length + results.posts.length
    : 0;

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Search</div>
        <div className="page-hdr-title">Find anything</div>
        <div className="page-hdr-sub">Films, creators, Discovered, prompts and the Journal.</div>
      </div>
      <section className="section">
        <input
          className="sr-input"
          type="search"
          autoFocus
          placeholder="Search RevaultAI…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search RevaultAI"
        />

        {!results ? (
          <div className="sr-hint">Type at least two characters. You can search by title, creator, genre, tool, or anything in a prompt.</div>
        ) : total === 0 ? (
          <div className="sr-empty">No results for “{q.trim()}”.</div>
        ) : (
          <>
            <div className="sr-count">{total} result{total === 1 ? "" : "s"}</div>

            {results.films.length > 0 && (
              <div className="sr-group">
                <div className="sr-group-label">Films ({results.films.length})</div>
                {results.films.map((c) => (
                  <div key={c.id} className="sr-row" onClick={() => { setDetailId(c.id); setPage("detail"); }}>
                    <div className="sr-title">{c.title}</div>
                    <div className="sr-meta">{c.creator?.display_name ?? "Unknown"} · {c.category}{c.is_premium ? " · Premium" : ""}</div>
                  </div>
                ))}
              </div>
            )}

            {results.people.length > 0 && (
              <div className="sr-group">
                <div className="sr-group-label">Creators ({results.people.length})</div>
                {results.people.map((c) => (
                  <div key={c.id} className="sr-row" onClick={() => { setCreatorUser(c.username); setPage("profile"); }}>
                    <div className="sr-title">{c.display_name || c.username}</div>
                    <div className="sr-meta">@{c.username}</div>
                    {c.bio && <div className="sr-snip">{snippet(c.bio, q)}</div>}
                  </div>
                ))}
              </div>
            )}

            {results.disc.length > 0 && (
              <div className="sr-group">
                <div className="sr-group-label">Discovered ({results.disc.length})</div>
                {results.disc.map((f) => (
                  <div key={f.id} className="sr-row" onClick={() => setPage("discovered")}>
                    <div className="sr-title">{f.title}</div>
                    <div className="sr-meta">Directed by {f.director_name}{f.genre ? " · " + f.genre : ""}</div>
                    {f.note && <div className="sr-snip">{snippet(f.note, q)}</div>}
                  </div>
                ))}
              </div>
            )}

            {results.prompts.length > 0 && (
              <div className="sr-group">
                <div className="sr-group-label">Prompts ({results.prompts.length})</div>
                {results.prompts.map((p) => (
                  <div key={p.modelSlug + p.title} className="sr-row" onClick={() => openPromptModel(p.modelSlug)}>
                    <div className="sr-title">{p.title}</div>
                    <div className="sr-meta">{p.modelName} · {p.genre}</div>
                    <div className="sr-snip">{snippet(p.text, q)}</div>
                  </div>
                ))}
              </div>
            )}

            {results.posts.length > 0 && (
              <div className="sr-group">
                <div className="sr-group-label">Journal ({results.posts.length})</div>
                {results.posts.map((p) => (
                  <div key={p.slug} className="sr-row" onClick={() => openPost(p.slug)}>
                    <div className="sr-title">{p.title}</div>
                    {p.description && <div className="sr-snip">{snippet(p.description, q)}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}