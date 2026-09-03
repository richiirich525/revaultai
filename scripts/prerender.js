/*
  scripts/prerender.js — runs after `vite build`.

  Generates a real static HTML file for every route so search crawlers get a
  complete page (correct <title>, description, canonical, and readable body
  content) without executing any JavaScript. React replaces the static content
  on mount, so users see the normal app.

  The static content mirrors what the page actually renders — for blog posts it
  is literally the same HTML from posts.js.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SITE = "https://www.revaultai.com";

const { PAGES, NOINDEX } = await import(path.join(ROOT, "src/lib/seo.js"));
const { POSTS } = await import(path.join(ROOT, "src/blog/posts.js"));
const { MODELS, GENRE_PAGES, promptsByGenre } = await import(path.join(ROOT, "src/prompts/models.js"));

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Replace a meta tag if present, otherwise insert it before </head>.
function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
}

function setCanonical(html, url) {
  const re = /<link\s+rel=["']canonical["'][^>]*>/i;
  const tag = `<link rel="canonical" href="${esc(url)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function setRobots(html, index) {
  return setMeta(html, "name", "robots", index ? "index, follow" : "noindex, nofollow");
}

function injectJsonLd(html, obj) {
  if (!obj) return html;
  const tag = `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

// Static body content. React clears #root on mount, so this is a crawler-facing
// and no-JS fallback that matches the rendered page.
function injectBody(html, inner) {
  const styled = `<div style="max-width:760px;margin:0 auto;padding:64px 24px;font-family:system-ui,sans-serif;background:#0E0F14;color:#E8E6F0;min-height:100vh">${inner}</div>`;
  return html.replace(/(<div id="root">)([\s\S]*?)(<\/div>)/, `$1${styled}$3`);
}

function writeRoute(routePath, html) {
  const outDir = routePath === "/" ? DIST : path.join(DIST, routePath.replace(/^\//, ""));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

let count = 0;

// ---- Static pages -------------------------------------------------------
for (const [slug, meta] of Object.entries(PAGES)) {
  const routePath = slug === "home" ? "/" : "/" + slug;
  const url = SITE + (routePath === "/" ? "/" : routePath);
  let html = template;
  html = setTitle(html, meta.title);
  html = setMeta(html, "name", "description", meta.description);
  html = setMeta(html, "property", "og:title", meta.title);
  html = setMeta(html, "property", "og:description", meta.description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "twitter:title", meta.title);
  html = setMeta(html, "name", "twitter:description", meta.description);
  html = setMeta(html, "name", "title", meta.title);
  html = setMeta(html, "name", "twitter:url", url);
  html = setCanonical(html, url);
  html = setRobots(html, !NOINDEX.has(slug));
  html = injectBody(html, `<h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p><p><a href="/">RevaultAI</a> — a curated gallery for AI-generated film.</p>`);
  writeRoute(routePath, html);
  count++;
}

// ---- Blog index ---------------------------------------------------------
{
  const url = SITE + "/blog";
  const items = POSTS.map((p) =>
    `<li><a href="/blog/${esc(p.slug)}"><strong>${esc(p.title)}</strong></a><br>${esc(p.description)}</li>`
  ).join("");
  let html = template;
  const title = "The Vault Journal — AI Filmmaking Craft & Tools | RevaultAI";
  const desc = "Essays and comparisons on AI filmmaking: models, prompts, workflows, and the craft of AI-native film. From the RevaultAI founder's desk.";
  html = setTitle(html, title);
  html = setMeta(html, "name", "description", desc);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", desc);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "title", title);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", desc);
  html = setMeta(html, "name", "twitter:url", url);
  html = setCanonical(html, url);
  html = setRobots(html, true);
  html = injectBody(html, `<h1>The Vault Journal</h1><p>${esc(desc)}</p><ul>${items}</ul>`);
  writeRoute("/blog", html);
  count++;
}

// ---- Blog posts ---------------------------------------------------------
for (const post of POSTS) {
  const url = SITE + "/blog/" + post.slug;
  const title = post.seoTitle || post.title;
  let html = template;
  html = setTitle(html, title);
  html = setMeta(html, "name", "description", post.description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", post.description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "property", "og:type", "article");
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", post.description);
  html = setMeta(html, "name", "title", title);
  html = setMeta(html, "name", "twitter:url", url);
  html = setCanonical(html, url);
  html = setRobots(html, true);

  const graph = [{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "RevaultAI", url: SITE },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  }];
  if (Array.isArray(post.faq) && post.faq.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    });
  }
  html = injectJsonLd(html, graph);

  // The article HTML is the same content React renders.
  html = injectBody(html, `<article><h1>${esc(post.title)}</h1><p>By ${esc(post.author)} · ${esc(post.date)}</p>${post.content}</article>`);
  writeRoute("/blog/" + post.slug, html);
  count++;
}

// ---- Prompt directory index ---------------------------------------------
{
  const meta = PAGES.prompts;
  const url = SITE + "/prompts";
  let html = template;
  html = setTitle(html, meta.title);
  html = setMeta(html, "name", "title", meta.title);
  html = setMeta(html, "name", "description", meta.description);
  html = setMeta(html, "property", "og:title", meta.title);
  html = setMeta(html, "property", "og:description", meta.description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "twitter:title", meta.title);
  html = setMeta(html, "name", "twitter:description", meta.description);
  html = setMeta(html, "name", "twitter:url", url);
  html = setCanonical(html, url);
  html = setRobots(html, true);
  html = injectJsonLd(html, {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI Video Prompt Directory",
    itemListElement: MODELS.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.name + " prompts",
      url: SITE + "/prompts/" + m.slug,
    })),
  });
  const items = MODELS.map((m) =>
    `<li><a href="/prompts/${esc(m.slug)}"><strong>${esc(m.name)}</strong></a> (${esc(m.maker)}) — ${m.prompts.length} prompts built for ${esc(m.strength)}.</li>`
  ).join("");
  html = injectBody(html, `<h1>AI Video Prompts</h1><p>${esc(meta.description)}</p><ul>${items}</ul>`);
  writeRoute("/prompts", html);
  count++;
}

// ---- Prompt directory: one page per model -------------------------------
for (const m of MODELS) {
  const url = SITE + "/prompts/" + m.slug;
  let html = template;
  html = setTitle(html, m.title);
  html = setMeta(html, "name", "title", m.title);
  html = setMeta(html, "name", "description", m.description);
  html = setMeta(html, "property", "og:title", m.title);
  html = setMeta(html, "property", "og:description", m.description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "property", "og:type", "article");
  html = setMeta(html, "name", "twitter:title", m.title);
  html = setMeta(html, "name", "twitter:description", m.description);
  html = setMeta(html, "name", "twitter:url", url);
  html = setCanonical(html, url);
  html = setRobots(html, true);

  html = injectJsonLd(html, [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: m.name + " prompts",
      description: m.description,
      url,
      itemListElement: m.prompts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.title,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `How do I use these ${m.name} prompts?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Copy any prompt on this page and paste it into ${m.name}, or generate it directly on RevaultAI. Each prompt is written for ${m.strength} and can be edited freely to suit your own scene.`,
          },
        },
        {
          "@type": "Question",
          name: `Are these ${m.name} prompts free to use?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Every prompt in the RevaultAI prompt directory is free to copy and use, with no account required.",
          },
        },
      ],
    },
  ]);

  const body = m.prompts
    .map((p, i) => `<section><h2>${i + 1}. ${esc(p.title)}</h2><p>${esc(p.text)}</p></section>`)
    .join("");
  const also = MODELS.filter((x) => x.slug !== m.slug)
    .map((x) => `<li><a href="/prompts/${esc(x.slug)}">${esc(x.name)} prompts</a></li>`)
    .join("");
  html = injectBody(
    html,
    `<h1>${esc(m.h1)}</h1><p>${esc(m.intro)}</p>${body}<h2>Also see</h2><ul>${also}</ul><p><a href="/prompt-builder">Build your own prompt free</a> — no account needed.</p>`
  );
  writeRoute("/prompts/" + m.slug, html);
  count++;
}

// ---- Prompt directory: one page per genre, across all models ------------
for (const g of GENRE_PAGES) {
  const url = SITE + "/prompts/genre/" + g.slug;
  const prompts = promptsByGenre(g.genre);
  if (!prompts.length) continue;
  let html = template;
  html = setTitle(html, g.title);
  html = setMeta(html, "name", "title", g.title);
  html = setMeta(html, "name", "description", g.description);
  html = setMeta(html, "property", "og:title", g.title);
  html = setMeta(html, "property", "og:description", g.description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "property", "og:type", "article");
  html = setMeta(html, "name", "twitter:title", g.title);
  html = setMeta(html, "name", "twitter:description", g.description);
  html = setMeta(html, "name", "twitter:url", url);
  html = setCanonical(html, url);
  html = setRobots(html, true);
  html = injectJsonLd(html, {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: g.h1,
    description: g.description,
    url,
    itemListElement: prompts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${p.title} (${p.modelName})`,
    })),
  });
  const body = prompts
    .map((p) => `<section><h2>${esc(p.title)} — for ${esc(p.modelName)}</h2><p>${esc(p.text)}</p></section>`)
    .join("");
  const also = GENRE_PAGES.filter((x) => x.slug !== g.slug)
    .map((x) => `<li><a href="/prompts/genre/${esc(x.slug)}">${esc(x.genre)} prompts</a></li>`)
    .join("");
  html = injectBody(
    html,
    `<h1>${esc(g.h1)}</h1><p>${esc(g.intro)}</p>${body}<h2>Other genres</h2><ul>${also}</ul><p><a href="/prompt-builder">Build your own prompt free</a> — no account needed.</p>`
  );
  writeRoute("/prompts/genre/" + g.slug, html);
  count++;
}

// ---- Films and creator profiles (optional, needs Supabase env) -----------
try {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key);

    const { data: profileRows, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio")
      .not("username", "is", null)
      .limit(2000);
    if (pErr) console.warn("[prerender] profiles query error:", pErr.message);
    const nameById = {};
    for (const p of profileRows ?? []) nameById[p.id] = p.display_name || p.username;

    const { data: creations, error: cErr } = await supabase
      .from("creations")
      .select("id, title, prompt_full, category, user_id, premium_status, youtube_id")
      .not("premium_status", "in", '("Pending","Rejected")')
      .limit(2000);
    if (cErr) console.warn("[prerender] creations query error:", cErr.message);

    for (const c of creations ?? []) {
      const who = nameById[c.user_id] || "a RevaultAI creator";
      const title = `${c.title} — AI Film by ${who} | RevaultAI`;
      const desc = String(c.prompt_full || c.title).replace(/\s+/g, " ").slice(0, 155);
      const pageUrl = `${SITE}/film/${c.id}`;
      let html = template;
      html = setTitle(html, title);
      html = setMeta(html, "name", "title", title);
      html = setMeta(html, "name", "description", desc);
      html = setMeta(html, "property", "og:title", title);
      html = setMeta(html, "property", "og:description", desc);
      html = setMeta(html, "property", "og:url", pageUrl);
      html = setMeta(html, "name", "twitter:url", pageUrl);
      if (c.youtube_id) {
        const thumb = `https://i.ytimg.com/vi/${c.youtube_id}/maxresdefault.jpg`;
        html = setMeta(html, "property", "og:image", thumb);
        html = setMeta(html, "name", "twitter:image", thumb);
      }
      html = setCanonical(html, pageUrl);
      html = setRobots(html, true);
      html = injectBody(html, `<h1>${esc(c.title)}</h1><p>An AI-generated ${esc(String(c.category || "film").toLowerCase())} by ${esc(who)} on RevaultAI.</p><h2>Production note</h2><p>${esc(c.prompt_full || "")}</p>`);
      writeRoute("/film/" + c.id, html);
      count++;
    }

    for (const p of profileRows ?? []) {
      const name = p.display_name || p.username;
      const title = `${name} — AI Filmmaker on RevaultAI`;
      const desc = String(p.bio || `Films, prompts, and workflows by ${name} on RevaultAI, a curated archive of AI-native creative work.`).replace(/\s+/g, " ").slice(0, 155);
      const pageUrl = `${SITE}/creator/${p.username}`;
      let html = template;
      html = setTitle(html, title);
      html = setMeta(html, "name", "description", desc);
      html = setMeta(html, "property", "og:title", title);
      html = setMeta(html, "property", "og:description", desc);
      html = setMeta(html, "property", "og:url", pageUrl);
      html = setCanonical(html, pageUrl);
      html = setRobots(html, true);
      html = injectBody(html, `<h1>${esc(name)}</h1><p>@${esc(p.username)}</p><p>${esc(desc)}</p>`);
      writeRoute("/creator/" + p.username, html);
      count++;
    }
        // ---- Discovered: bake the curated films into the static page ----
    const { data: discovered, error: dErr } = await supabase
      .from("discovered_films")
      .select("title, youtube_id, director_name, director_url, award, note")
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (dErr) console.warn("[prerender] discovered query error:", dErr.message);

    if (discovered?.length) {
      const meta = PAGES.discovered;
      const pageUrl = SITE + "/discovered";
      let html = template;
      html = setTitle(html, meta.title);
      html = setMeta(html, "name", "title", meta.title);
      html = setMeta(html, "name", "description", meta.description);
      html = setMeta(html, "property", "og:title", meta.title);
      html = setMeta(html, "property", "og:description", meta.description);
      html = setMeta(html, "property", "og:url", pageUrl);
      html = setMeta(html, "name", "twitter:title", meta.title);
      html = setMeta(html, "name", "twitter:description", meta.description);
      html = setMeta(html, "name", "twitter:url", pageUrl);
      html = setCanonical(html, pageUrl);
      html = setRobots(html, true);

      html = injectJsonLd(html, {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Discovered — Exceptional AI Films",
        itemListElement: discovered.map((f, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "VideoObject",
            name: f.title,
            description: f.note || `An AI-generated film by ${f.director_name}.`,
            thumbnailUrl: `https://i.ytimg.com/vi/${f.youtube_id}/hqdefault.jpg`,
            embedUrl: `https://www.youtube-nocookie.com/embed/${f.youtube_id}`,
            creator: { "@type": "Person", name: f.director_name },
          },
        })),
      });

      const items = discovered.map((f) =>
        `<li><strong>${esc(f.title)}</strong> — directed by ${f.director_url ? `<a href="${esc(f.director_url)}">${esc(f.director_name)}</a>` : esc(f.director_name)}${f.award ? ` (${esc(f.award)})` : ""}${f.note ? `<br>${esc(f.note)}` : ""}</li>`
      ).join("");
      html = injectBody(html, `<h1>Discovered — Exceptional AI Films From Around the Web</h1><p>${esc(meta.description)}</p><ul>${items}</ul>`);
      writeRoute("/discovered", html);
    }
  } else {
    console.warn("[prerender] Supabase env not found — skipping film and creator pages.");
  }
} catch (err) {
  console.warn("[prerender] Could not prerender films/creators:", err.message);
}

console.log(`[prerender] Wrote ${count} static pages.`);