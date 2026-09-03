// /api/sitemap.js — generates sitemap.xml live from Supabase
// Served at https://www.revaultai.com/sitemap.xml via the vercel.json rewrite.

import { POSTS } from "../src/blog/posts.js";
import { MODELS, GENRE_PAGES } from "../src/prompts/models.js";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://www.revaultai.com";

// Static pages, with rough priority. Home highest, legal pages lowest.
const STATIC_PAGES = [
  ["/", "1.0", "daily"],
  ["/explore", "0.9", "daily"],
  ["/creators", "0.8", "daily"],
  ["/about", "0.7", "monthly"],
  ["/premium-prompts", "0.7", "monthly"],
  ["/become-creator", "0.7", "monthly"],
  ["/founding-creators", "0.7", "monthly"],
  ["/blog", "0.8", "weekly"],
  ["/ai-video-generator", "0.9", "monthly"],
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

  const entries = STATIC_PAGES.map(([path, priority, changefreq])  => 
    urlEntry({ loc: SITE + path, priority, changefreq })
  );

    for (const p of POSTS) {
    entries.push(urlEntry({ loc: SITE + "/blog/" + p.slug, lastmod: p.date, changefreq: "monthly", priority: "0.7" }));
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
        .select("id, created_at, premium_status")
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
        .select("username")
        .not("username", "is", null)
        .limit(5000);

      for (const p of profiles ?? []) {
        entries.push(urlEntry({
          loc: `${SITE}/creator/${encodeURIComponent(p.username)}`,
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