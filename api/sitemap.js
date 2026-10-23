// /api/sitemap.js — generates sitemap.xml live from Supabase
// Served at https://www.revaultai.com/sitemap.xml via the vercel.json rewrite.

import { POSTS } from "../src/blog/posts.js";
import { MODELS, GENRE_PAGES } from "../src/prompts/models.js";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://www.revaultai.com";

/*
  Static pages, with rough priority. Home highest, legal pages lowest.

  The fourth slot, where present, is the date that page's copy last changed in
  a way worth recrawling: a new section, a rewritten headline, a corrected
  price. Bump it by hand when you make such a change, and leave it off when
  you have not.

  It is deliberately NOT the deploy date. Google discounts lastmod from sites
  that stamp every page with "now" on every push, so a date that moves when
  the copy did not is worse than no date at all. Pages below with no date are
  making no claim, which is the honest default.
*/
const STATIC_PAGES = [
  ["/", "1.0", "daily"],
  ["/explore", "0.9", "daily"],
  ["/creators", "0.8", "daily"],
  ["/about", "0.7", "monthly"],
  ["/premium-films", "0.7", "monthly"],
  ["/become-creator", "0.7", "monthly"],
  ["/founding-creators", "0.7", "monthly"],
  ["/blog", "0.8", "weekly"],
  ["/ai-video-generator", "0.9", "monthly"],
  ["/prompt-builder", "0.9", "monthly"],
  ["/scene-breakdown", "0.9", "monthly"],
  ["/which-model", "0.9", "monthly"],
  ["/continuity-check", "0.9", "monthly"],
  ["/shot-director", "0.9", "monthly"],
  ["/coverage", "0.9", "monthly"],
  ["/frame-planner", "0.9", "monthly"],
  ["/tools", "0.9", "weekly"],
  ["/lot", "0.9", "weekly"],
  ["/pricing", "0.8", "monthly", "2026-10-21"],       // prices render correctly again
  ["/blocking", "0.9", "monthly"],
  ["/rehearsal", "0.9", "monthly", "2026-10-21"],     // six new sections, live hero
  ["/recording-studio", "0.9", "monthly", "2026-10-22"],   // new room on the lot
  ["/autopsy", "0.9", "monthly"],
  ["/discovered", "0.8", "weekly"],
  ["/faq", "0.6", "monthly"],
  ["/guidelines", "0.6", "monthly"],
  ["/contact", "0.5", "yearly"],
  ["/terms", "0.3", "yearly"],
  ["/privacy", "0.3", "yearly"],
  ["/refunds", "0.3", "yearly"],
  ["/dmca", "0.3", "yearly"],
  ["/ai-disclaimer", "0.3", "yearly"],
];

// A handle that collides with a route, or looks like a leftover test account,
// shouldn't be offered to search engines.
const RESERVED_HANDLES = new Set([
  "home", "explore", "creators", "creator", "feed", "generate", "settings", "admin",
  "submit", "set-password", "email-confirmed", "purchase-success", "terms", "privacy",
  "faq", "contact", "guidelines", "refunds", "dmca", "ai-disclaimer", "about", "blog",
  "premium-prompts", "premium-films", "become-creator", "founding-creators", "discovered", "search",
  "tools", "prompts", "prompt-builder", "ai-video-generator", "scene-breakdown",
  "which-model", "vault", "continuity-check", "shot-director", "coverage",
  "frame-planner", "blocking", "autopsy", "takes", "projects", "specs", "rehearsal",
  "api", "billing", "film", "test", "testing", "demo", "null", "undefined",
]);

function listableHandle(username) {
  const h = String(username || "").trim();
  if (h.length < 3) return false;              // too short to be a real profile
  if (/^\d+$/.test(h)) return false;           // numeric-only: auto-generated
  return !RESERVED_HANDLES.has(h.toLowerCase());
}

/*
  A lastmod is only worth sending if it is a real, past date. A malformed or
  future one is a reason for a crawler to distrust the whole file, so anything
  that fails this is dropped rather than published.
*/
function safeDate(d) {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = Date.parse(d + "T00:00:00Z");
  if (Number.isNaN(t)) return null;
  // Tomorrow, not today, so a page edited in any time zone still counts.
  if (t > Date.now() + 86400000) return null;
  return d;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${esc(loc)}</loc>`,
    lastmod ? `    <lastmod>${esc(lastmod)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ].filter(Boolean).join("\n");
}

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const entries = STATIC_PAGES.map(([path, priority, changefreq, lastmod]) =>
    urlEntry({ loc: SITE + path, priority, changefreq, lastmod: safeDate(lastmod) })
  );

    for (const p of POSTS) {
    entries.push(urlEntry({ loc: SITE + "/blog/" + p.slug, lastmod: safeDate(p.date), changefreq: "monthly", priority: "0.7" }));
  }

  // Prompt directory — index plus one page per model.
  entries.push(urlEntry({ loc: SITE + "/prompts", changefreq: "weekly", priority: "0.9" }));
  for (const m of MODELS) {
    entries.push(urlEntry({ loc: SITE + "/prompts/" + m.slug, changefreq: "monthly", priority: "0.8" }));
  }
  for (const g of GENRE_PAGES) {
    entries.push(urlEntry({ loc: SITE + "/prompts/genre/" + g.slug, changefreq: "monthly", priority: "0.8" }));
  }

  try {
    if (url && key) {
      const supabase = createClient(url, key);

      // Published films only — never expose pending or rejected work to search engines.
      const { data: creations } = await supabase
        .from("creations")
        .select("id, user_id, created_at, premium_status")
        .not("premium_status", "in", '("Pending","Rejected")')
        .order("created_at", { ascending: false })
        .limit(5000);

      for (const c of creations ?? []) {
        entries.push(urlEntry({
          loc: `${SITE}/film/${encodeURIComponent(c.id)}`,
          lastmod: c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : null,
          changefreq: "weekly",
          priority: "0.8",
        }));
      }

      // Creator profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, created_at")
        .not("username", "is", null)
        .limit(5000);

      // A creator page changes when they publish, not when they signed up —
      // so date it by their most recent published film, falling back to the
      // join date for a creator who has not published yet.
      const latestByUser = {};
      for (const c of creations ?? []) {
        if (!c.user_id || !c.created_at) continue;
        if (!latestByUser[c.user_id] || c.created_at > latestByUser[c.user_id]) {
          latestByUser[c.user_id] = c.created_at;
        }
      }

      for (const p of profiles ?? []) {
        if (!listableHandle(p.username)) continue;
        const when = latestByUser[p.id] ?? p.created_at ?? null;
        entries.push(urlEntry({
          loc: `${SITE}/creator/${encodeURIComponent(p.username)}`,
          lastmod: when ? new Date(when).toISOString().slice(0, 10) : null,
          changefreq: "weekly",
          priority: "0.6",
        }));
      }
    }
  } catch (err) {
    // Never fail the whole sitemap over a DB hiccup — static pages still ship.
    console.warn("[RevaultAI] Sitemap DB query failed:", err.message);
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join("\n") +
    "\n</urlset>";

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}