import { POSTS, getPost } from "./blog/posts.js";

/*
  Blog — RevaultAI
  Two components: BlogPage (index) and BlogPostPage (single post).
  Styled with the site's tokens (Syne / DM Mono / Cormorant Garamond,
  purple accent). Posts live in src/blog/posts.js.
*/

const BLOG_CSS = `
  .blog-wrap { max-width: 720px; margin: 0 auto; padding: 80px 48px; }
  .blog-back { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; cursor: pointer; display: inline-block; }
  .blog-hdr-title { font-family: 'Cormorant Garamond', serif; font-size: 48px; font-weight: 300; color: var(--text); margin-bottom: 8px; line-height: 1.1; }
  .blog-hdr-sub { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 0.08em; margin-bottom: 56px; }
  .blog-card { border-top: 1px solid var(--border); padding: 32px 0; cursor: pointer; }
  .blog-card:hover .blog-card-title { color: var(--accent); }
  .blog-card-meta { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase; margin-bottom: 10px; }
  .blog-card-title { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 400; color: var(--text); line-height: 1.2; margin-bottom: 10px; transition: color 0.2s; }
  .blog-card-desc { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.8; }
  .blog-post-meta { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase; margin-bottom: 16px; }
  .blog-post-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(34px, 5vw, 52px); font-weight: 300; color: var(--text); line-height: 1.12; margin-bottom: 14px; }
  .blog-post-byline { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.1em; margin-bottom: 48px; }
  .blog-content { border-top: 1px solid var(--border); padding-top: 40px; }
  .blog-content p { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 2; margin-bottom: 20px; }
  .blog-content h2 { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.1em; margin: 40px 0 16px; }
  .blog-content h3 { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; color: var(--text); margin: 28px 0 10px; }
  .blog-content ul { padding-left: 22px; margin: 0 0 20px; }
  .blog-content li { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.9; margin-bottom: 12px; }
  .blog-content strong { color: var(--text); font-weight: 500; }
  .blog-content em { color: var(--text); }
  .blog-content a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(123,63,228,0.35); }
  .blog-content a:hover { border-bottom-color: var(--accent); }
  .blog-cta { margin-top: 48px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg2); padding: 32px; }
  .blog-cta-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 10px; }
  .blog-cta-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: var(--text); margin-bottom: 10px; line-height: 1.25; }
  .blog-cta-sub { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; margin-bottom: 20px; }
  @media (max-width: 760px) {
    .blog-wrap { padding: 56px 24px; }
    .blog-hdr-title { font-size: 36px; }
    .blog-card-title { font-size: 24px; }
  }
`;

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function BlogPage({ setPage, openPost }) {
  return (
    <div className="page">
      <style>{BLOG_CSS}</style>
      <div className="blog-wrap">
        <span className="blog-back" onClick={() => setPage("home")}>&larr; RevaultAI</span>
        <h1 className="blog-hdr-title">The Vault Journal</h1>
        <div className="blog-hdr-sub">Craft, tools, and the state of AI filmmaking. From the founder's desk.</div>
        {POSTS.map((p) => (
          <article key={p.slug} className="blog-card" onClick={() => openPost(p.slug)}>
            <div className="blog-card-meta">{p.category} &middot; {fmtDate(p.date)} &middot; {p.readingTime}</div>
            <div className="blog-card-title">{p.title}</div>
            <div className="blog-card-desc">{p.description}</div>
          </article>
        ))}
        <div style={{ borderTop: "1px solid var(--border)" }} />
      </div>
    </div>
  );
}

export function BlogPostPage({ slug, setPage }) {
  const post = getPost(slug);
  if (!post) {
    return (
      <div className="page">
        <div className="empty-state"><div className="empty-text">Post not found.</div></div>
      </div>
    );
  }

  // Intercept internal links inside post HTML so they use SPA navigation
  function handleContentClick(e) {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("/")) {
      e.preventDefault();
      const slugPart = href.slice(1).replace(/\/$/, "");
      setPage(slugPart || "home");
    }
  }

  return (
    <div className="page">
      <style>{BLOG_CSS}</style>
      <div className="blog-wrap">
        <span className="blog-back" onClick={() => setPage("blog")}>&larr; The Vault Journal</span>
        <div className="blog-post-meta">{post.category} &middot; {fmtDate(post.date)} &middot; {post.readingTime}</div>
        <h1 className="blog-post-title">{post.title}</h1>
        <div className="blog-post-byline">By {post.author}</div>
        <div className="blog-content" onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: post.content }} />
        <div className="blog-cta">
          <div className="blog-cta-label">Founding Cohort</div>
          <div className="blog-cta-title">Making AI films worth watching?</div>
          <div className="blog-cta-sub">RevaultAI is a curated gallery for AI-generated film — creators keep 80% of net revenue. We're selecting founding creators now.</div>
          <button className="btn-primary" onClick={() => setPage("founding-creators")}>Apply as a Founding Creator</button>
        </div>
      </div>
    </div>
  );
}