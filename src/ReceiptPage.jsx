import { useEffect, useState } from "react";
import FilmReceipt from "./FilmReceipt.jsx";
import { fetchCreationById } from "./lib/db.js";
import { applyReceiptSEO } from "./lib/seo.js";
import { supabase } from "./lib/supabase.js";

/*
  ReceiptPage — RevaultAI

  A production receipt with an address of its own.

  The receipt has rendered inside the film page since it shipped, which means
  it could be scrolled to and never linked to. A filmmaker who wants to show
  another filmmaker how a shot was planned has had nothing to send but the
  film itself, and a film link is read as "look at my video" rather than
  "look at what I directed" — the opposite of what a receipt is for.

  This page renders the same component in the same public mode, so there is
  one rendering path and no second copy of the rules about what is shown.
  What it adds is a URL, a heading that names the film and its creator, and
  an honest empty state: a receipt nobody published should say so plainly
  rather than render a blank page, because the link will be shared before
  anyone checks whether it works.
*/

export default function ReceiptPage({ id, setPage, setDetailId, setCreatorUser }) {
  const [creation, setCreation] = useState(null);
  const [published, setPublished] = useState(null); // null = still looking
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) { setLoading(false); return; }
      const [{ data: c }, { data: r }] = await Promise.all([
        fetchCreationById(id),
        /*
          Only the published flag, and only to choose between the receipt and
          the empty state. Row-level security is what actually decides who
          reads a receipt; asking here for less than the component needs
          keeps that decision in one place rather than two.
        */
        supabase.from("film_receipts").select("published, facts, visibility, commentary").eq("creation_id", id).maybeSingle(),
      ]);
      if (!alive) return;
      setCreation(c ?? null);
      setPublished(!!r?.published);
      setLoading(false);
      // After the await, so this lands after App's own applySEO pass.
      if (c && r?.published) applyReceiptSEO(c, r);
    })();
    return () => { alive = false; };
  }, [id]);

  function openFilm() {
    if (!creation) return;
    setDetailId?.(creation.id);
    setPage("detail");
  }

  if (loading) {
    return (
      <div className="page">
        <section className="section"><div className="empty-state">
          <div className="empty-text">Loading the receipt&hellip;</div>
        </div></section>
      </div>
    );
  }

  if (!creation) {
    return (
      <div className="page">
        <section className="section"><div className="empty-state">
          <div className="empty-text">There is no film at this address.</div>
          <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setPage("explore")}>Browse the gallery</button>
        </div></section>
      </div>
    );
  }

  const who = creation.creator?.display_name || creation.creator?.username;

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Production receipt</div>
        <div className="page-hdr-title">{creation.title}</div>
        <div className="page-hdr-sub">
          {who ? <>Directed by{" "}
            <span
              style={{ cursor: creation.creator?.username ? "pointer" : "default", textDecoration: creation.creator?.username ? "underline" : "none" }}
              onClick={() => { if (creation.creator?.username) { setCreatorUser?.(creation.creator.username); setPage("profile"); } }}
            >{who}</span>. </> : null}
          What it took to make, as recorded on RevaultAI.
        </div>
      </div>

      <section className="section">
        {published ? (
          <FilmReceipt creationId={creation.id} projectId={creation.project_id ?? null} isOwner={false} />
        ) : (
          <div className="empty-state">
            <div className="empty-text">
              The creator of this film has not published a production receipt.
            </div>
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <button className="btn-primary" onClick={openFilm}>Watch {creation.title}</button>
        </div>
      </section>
    </div>
  );
}
