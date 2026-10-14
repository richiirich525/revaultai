import { useState } from "react";
import CreationCard from "./CreationCard.jsx";
import SpotlightSection from "./SpotlightSection.jsx";
import { track } from "./lib/analytics.js";

/*
  ExplorePage — RevaultAI
  Extracted from App.jsx.
*/

export default function ExplorePage({ creations, setPage, setDetailId, dbLoaded }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(12);

  const filtered = creations
    .filter((c) => c.premium_status !== "Pending" && c.premium_status !== "Rejected")
    .filter((c) => {
      if (filter === "Premium") return c.is_premium;
      if (filter === "Open") return !c.is_premium;
      return true;
    })
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.creator?.display_name?.toLowerCase().includes(q) ||
        c.creator?.username?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.tools_used?.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);
      if (sort === "premium") return (b.is_premium ? 1 : 0) - (a.is_premium ? 1 : 0);
      if (sort === "spotlight") return (b.spotlight ? 1 : 0) - (a.spotlight ? 1 : 0);
      return 0;
    });

  function goDetail(id) { setDetailId(id); setPage("detail"); }

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Browse</div>
        <div className="page-hdr-title">Explore</div>
        <div className="page-hdr-sub">All creations published by the RevaultAI community.</div>
      </div>
      <SpotlightSection creations={creations} onView={goDetail} />
      <section className="section">

        {/* Search bar */}
        <div style={{ marginBottom: 24 }}>
          <input
            className="form-input"
            type="text"
            placeholder="Search by title, creator, category, or tool..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisible(12); if (e.target.value.length === 3) track("search_used", { query: e.target.value }); }}
            style={{ maxWidth: 520 }}
          />
        </div>

        {/* Filters + Sort */}
        <div style={{ display: "flex", gap: 12, marginBottom: 40, flexWrap: "wrap", alignItems: "center" }}>
          <div className="filter-bar" style={{ marginBottom: 0, flex: 1, minWidth: 240 }}>
            {["All", "Premium", "Open"].map((f) => (
              <button key={f} className={"filter-btn" + (filter === f ? " active" : "")}
                onClick={() => { setFilter(f); setVisible(12); }}>{f}</button>
            ))}
          </div>
          <select
            className="form-select"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setVisible(12); }}
            style={{ width: "auto", padding: "10px 16px", fontSize: 11, letterSpacing: "0.1em" }}
          >
            <option value="newest">Newest</option>
            <option value="premium">Premium First</option>
            <option value="spotlight">Spotlight First</option>
          </select>
        </div>

        {/* Results */}
        {!dbLoaded ? (
  <div className="empty-state" style={{ padding: "60px 0" }}>
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em" }}>Loading creations...</div>
  </div>
) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "60px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>&#9673;</div>
            <div className="empty-text" style={{ fontSize: 15, marginBottom: 8 }}>
              {search ? `No results for "${search}"` : "No creations in this category yet."}
            </div>
            {search && (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                Try searching by creator name, tool, or category.
              </div>
            )}
            {search && (
              <button className="btn-ghost" style={{ marginTop: 20, padding: "10px 24px", fontSize: 11 }}
                onClick={() => setSearch("")}>Clear search</button>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 20 }}>
              {filtered.length} creation{filtered.length !== 1 ? "s" : ""}
              {search ? ` matching "${search}"` : ""}
            </div>
            <div className="creation-grid">
              {filtered.slice(0, visible).map((c) => <CreationCard key={c.id} creation={c} onClick={goDetail} />)}
            </div>
               {visible < filtered.length && (
              <div className="load-more">
                <button className="btn-load" onClick={() => setVisible((v) => v + 12)}>
                  Load more ({filtered.length - visible} remaining)
                </button>
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 1.9, maxWidth: 520, margin: "0 auto 20px" }}>
            Looking for more? <strong style={{ color: "var(--text)" }}>Discovered</strong> is our hand-picked exhibition of exceptional AI films from around the web, streaming from their directors' own channels.
          </div>
          <button className="btn-ghost" onClick={() => setPage("discovered")}>Visit Discovered</button>
        </div>
      </section>               
    </div>
  );
}
