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
const { HOME_BACKLOT, ABOUT_BACKLOT } = await import(path.join(ROOT, "src/lib/backlotCopy.js"));
const { LEGAL_CONTENT } = await import(path.join(ROOT, "src/lib/legalContent.js"));
const { FAQS } = await import(path.join(ROOT, "src/lib/faqContent.js"));
const { GEN_MODELS, GEN_TOOLS } = await import(path.join(ROOT, "src/lib/generatorCatalog.js"));
const { JOBS, ACCESS_LABEL } = await import(path.join(ROOT, "src/lib/toolCatalog.js"));
const { PAGE_SUMMARIES } = await import(path.join(ROOT, "src/lib/pageSummaries.js"));
const { CREDIT_PACKS, bestValuePack, perCreditLabel, priceLabel, savingVsStarter } =
  await import(path.join(ROOT, "src/lib/creditPacks.js"));
const { GEN_MODELS: PRICED_MODELS, costOf, snapDuration } =
  await import(path.join(ROOT, "src/lib/genModels.js"));
const { sectionsHtml } = await import(path.join(ROOT, "src/lib/rehearsalSections.js"));

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Escapes, then turns **bold** into <strong> — the only markdown a banner uses.
// The $1 here is a deliberate capture reference, unlike every other
// replacement in this file; see lit() below.
function escBold(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/*
  Everything this file injects goes through lit().

  In a replacement STRING, "$1", "$&", "$`", "$'" and "$$" are instructions to
  String.replace rather than text. That is what broke the pricing page: the
  body was injected with `$1${html}$3`, so the "$15" inside our own copy was
  read as "capture group 1, then a 5" and shipped as <div id="root">5. "$32"
  became </div>2 for the same reason, and "$5" survived only because the
  pattern had no fifth group.

  A replacement FUNCTION is never scanned for those sequences, so passing one
  makes the inserted text literal no matter what is in it. Any new injection
  below must use lit() or its own replacer, never a template string.
*/
const lit = (text) => () => text;

// Replace a meta tag if present, otherwise insert it before </head>.
function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
  return re.test(html)
    ? html.replace(re, lit(tag))
    : html.replace("</head>", lit(`    ${tag}\n  </head>`));
}

function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, lit(`<title>${esc(title)}</title>`));
}

function setCanonical(html, url) {
  const re = /<link\s+rel=["']canonical["'][^>]*>/i;
  const tag = `<link rel="canonical" href="${esc(url)}">`;
  return re.test(html)
    ? html.replace(re, lit(tag))
    : html.replace("</head>", lit(`    ${tag}\n  </head>`));
}

function setRobots(html, index) {
  return setMeta(html, "name", "robots", index ? "index, follow" : "noindex, nofollow");
}

function injectJsonLd(html, obj) {
  if (!obj) return html;
  const tag = `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
  return html.replace("</head>", lit(`    ${tag}\n  </head>`));
}

/*
  The There's An AI For That badge, exactly as TAAFT supplied it.

  Three constraints, and they pull against each other on a single-page app:

    1. It has to be in the homepage's static HTML, so their crawler sees it
       without running JavaScript.
    2. It must NOT be shared across every page. Our source index.html is the
       shell for all 148 routes, so putting it there would do precisely what
       they asked us not to.
    3. React clears #root on mount, so anything injected in there vanishes the
       moment the app hydrates and no visitor ever sees it.

  So it goes into the home route's own prerendered file only, placed after
  #root where hydration cannot reach it. App.jsx hides it on client-side
  navigation away from home, because a node outside the React tree is never
  unmounted and would otherwise ride along to every page the visitor opens.

  Left verbatim on purpose — not escaped, not reformatted, not given the
  loading or alt attributes it arguably wants. TAAFT asked for this exact
  markup and a directory listing is not the place to be clever.
*/
const TAAFT_BADGE =
  '<a href="https://theresanaiforthat.com/ai/revaultai/?ref=featured&v=12605891" target="_blank" rel="nofollow"><img width="300" src="https://media.theresanaiforthat.com/featured-on-taaft.png?width=600"></a>';

function injectTaaftBadge(html) {
  const block =
    '<div id="taaft-badge" style="background:#0E0F14;padding:34px 16px 44px;text-align:center">' +
    TAAFT_BADGE +
    '</div>';
  return html.replace("</body>", lit("  " + block + "\n</body>"));
}

// Static body content. React clears #root on mount, so this is a crawler-facing
// and no-JS fallback that matches the rendered page.
function injectBody(html, inner) {
  const styled = `<div style="max-width:760px;margin:0 auto;padding:64px 24px;font-family:system-ui,sans-serif;background:#0E0F14;color:#E8E6F0;min-height:100vh">${inner}</div>`;
  return html.replace(
    /(<div id="root">)([\s\S]*?)(<\/div>)/,
    (_match, open, _old, close) => open + styled + close,
  );
}

function writeRoute(routePath, html) {
  const outDir = routePath === "/" ? DIST : path.join(DIST, routePath.replace(/^\//, ""));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

// The backlot copy, as rendered by BacklotSection (home) and AboutPage.
function stationsHtml(stations) {
  return stations.map((s) => `<p><strong>${esc(s.lead)}</strong> ${esc(s.body)}</p>`).join("");
}

function homeBacklotHtml() {
  const b = HOME_BACKLOT;
  return `<section><h2>${esc(b.heading)}</h2>${b.intro.map((p) => `<p>${esc(p)}</p>`).join("")}${stationsHtml(b.stations)}` +
    `<h3>${esc(b.cta.heading)}</h3><p>${esc(b.cta.line)}</p>` +
    `<p><a href="/${esc(b.cta.primary.page)}">${esc(b.cta.primary.label)}</a> · <a href="/${esc(b.cta.secondary.page)}">${esc(b.cta.secondary.label)}</a></p></section>`;
}

function aboutHtml() {
  const a = ABOUT_BACKLOT;
  return `<h1>${esc(a.heading)}</h1>${a.intro.map((p) => `<p>${esc(p)}</p>`).join("")}${stationsHtml(a.stations)}` +
    a.sections.map((s) => `<h2>${esc(s.title)}</h2>${s.paragraphs.map((p) => `<p>${escBold(p)}</p>`).join("")}`).join("") +
    `<p><strong>${esc(a.closing)}</strong></p>`;
}

// Production notes are written in markdown. A raw slice of one puts "# TITLE
// ## Making Of ### The Original Idea" into the meta description, so strip the
// syntax, drop heading-only lines, and cut on a word boundary.
function plainTextFromNote(note) {
  const lines = String(note ?? "").split(/\r?\n/);
  const prose = [];
  for (let line of lines) {
    line = line.trim();
    if (line === "") continue;
    if (/^#{1,6}\s/.test(line)) continue;            // heading
    if (/^(?:[-*_]\s*){3,}$/.test(line)) continue;    // horizontal rule
    line = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")        // images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")      // links -> text
      .replace(/<[^>]+>/g, " ")                       // stray html
      .replace(/^>\s*/, "")                           // blockquote
      .replace(/^(?:[-*+]|\d+\.)\s+/, "")            // list bullet
      .replace(/`+/g, "")                             // code ticks
      .replace(/\*\*([^*]+)\*\*/g, "$1")            // bold
      .replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$)/g, "$1$2") // italic
      .trim();
    if (line === "") continue;
    if (/^[A-Za-z0-9 &'"()\-]{1,40}:$/.test(line)) continue; // bare label line
    prose.push(line);
  }
  return prose.join(" ").replace(/\s+/g, " ").trim();
}

// Cut to a limit without breaking a word. Prefers a sentence end once past
// 60% of the budget, so most descriptions read as finished sentences.
function clipWords(text, limit) {
  const t = String(text ?? "").trim();
  if (t.length <= limit) return t;
  const window = t.slice(0, limit + 1);
  const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (sentence >= Math.floor(limit * 0.6)) return window.slice(0, sentence + 1).trim();
  const space = window.lastIndexOf(" ");
  const cut = space > 0 ? window.slice(0, space) : t.slice(0, limit);
  return cut.replace(/[\s,;:.\-–—]+$/, "") + "\u2026";
}

// Google shows roughly 60 characters. Keep the creator's own title intact and
// drop our suffix rather than truncating their words, falling back in tiers.
function filmTitle(rawTitle, limit) {
  const t = String(rawTitle ?? "").replace(/\s+/g, " ").trim() || "Untitled";
  const suffixes = [" — AI Film | RevaultAI", " | RevaultAI", ""];
  for (const suffix of suffixes) {
    if ((t + suffix).length <= limit) return t + suffix;
  }
  // Too long even bare. Shorten the creator's title, then re-offer the
  // suffixes — clipping often frees enough room to keep the brand on.
  const short = clipWords(t, limit - 1).replace(/\.$/, "");
  for (const suffix of suffixes) {
    if ((short + suffix).length <= limit) return short + suffix;
  }
  return short;
}

// A generic stock photo stands in when a real frame isn't available. It is a
// worse social preview than the site image, so it never becomes og:image.
// A bad timestamp would throw out of toISOString() and fail the whole build.
function isoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const PLACEHOLDER_IMAGE = "photo-1462331940025-496dfbfc7564";

function filmThumb(c) {
  if (c.youtube_id) return `https://i.ytimg.com/vi/${c.youtube_id}/maxresdefault.jpg`;
  for (const candidate of [c.thumbnail_image, c.hero_image]) {
    const v = String(candidate ?? "");
    if (/^https?:\/\//.test(v) && v.includes(PLACEHOLDER_IMAGE) === false) return v;
  }
  if (c.mux_playback_id) return `https://image.mux.com/${c.mux_playback_id}/thumbnail.jpg?time=0&width=1200`;
  return null;
}

// Production note as readable HTML for the crawler-facing body, instead of a
// paragraph full of literal hash marks and asterisks.
function noteHtml(note) {
  const out = [];
  for (let line of String(note ?? "").split(/\r?\n/)) {
    line = line.trim();
    if (line === "") continue;
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push(`<h3>${escBold(h[2])}</h3>`); continue; }
    if (/^(?:[-*_]\s*){3,}$/.test(line)) continue;
    const li = line.match(/^(?:[-*+]|\d+\.)\s+(.*)$/);
    if (li) { out.push(`<p>&bull; ${escBold(li[1])}</p>`); continue; }
    out.push(`<p>${escBold(line)}</p>`);
  }
  return out.join("");
}

let count = 0;

// ---- Page bodies and structured data ------------------------------------

const ORG = { "@type": "Organization", name: "RevaultAI", url: SITE };

const ORG_FULL = {
  ...ORG,
  logo: { "@type": "ImageObject", url: SITE + "/og-image.png" },
  sameAs: ["https://www.instagram.com/revaultai", "https://x.com/airevault"],
};

// The twelve public tool routes. `tools` is the index of them, not a tool.
const TOOL_INDEX = "tools";
const TOOL_PAGES = new Set([
  "ai-video-generator", "prompt-builder", "scene-breakdown", "which-model",
  "continuity-check", "shot-director", "coverage", "frame-planner",
  "blocking", "rehearsal", "autopsy",
]);

// An H1 is a heading, not a search-result title — drop the brand suffix the
// <title> needs and the page keeps a readable headline.
function pageH1(slug, meta) {
  if (slug === "home") return "The AI era doesn't need more content. It needs curation.";
  return String(meta.title ?? "")
    .replace(/\s*[|\u2014\u2013]\s*RevaultAI\s*$/i, "")
    .replace(/^RevaultAI\s*[|\u2014\u2013]\s*/i, "")
    .trim() || "RevaultAI";
}

function catalogEntries(page) {
  const out = [];
  for (const job of JOBS) for (const t of job.tools) if (t.page === page) out.push({ job, tool: t });
  return out;
}

function toolBody(page, extra = "") {
  const mine = catalogEntries(page);
  if (mine.length === 0) return "";
  const named = new Set();
  let html = "";
  for (const { job, tool } of mine) {
    if (named.has(tool.name)) continue;
    named.add(tool.name);
    html += `<h2>${esc(tool.name)}</h2>`
      + `<p><strong>You give it:</strong> ${esc(tool.give)}</p>`
      + `<p><strong>You get back:</strong> ${esc(tool.get)}</p>`
      + `<p>${esc(tool.blurb)}</p>`
      + `<p>${esc(ACCESS_LABEL[tool.access] ?? tool.access)}. Part of ${esc(String(job.name).toLowerCase())} \u2014 ${esc(String(job.when).toLowerCase())}.</p>`;
  }
  const jobIds = new Set(mine.map((x) => x.job.id));
  const seen = new Set([page]);
  const siblings = [];
  for (const job of JOBS) {
    if (jobIds.has(job.id) === false) continue;
    for (const t of job.tools) {
      if (seen.has(t.page) || NOINDEX.has(t.page)) continue;
      seen.add(t.page);
      siblings.push(t);
    }
  }
  // A page may slot its own sections in here, before the sibling links,
  // so the static document reads in the order the page does.
  html += extra;
  if (siblings.length) {
    html += `<h2>Use it with</h2><ul>`
      + siblings.map((t) => `<li><a href="/${esc(t.page)}">${esc(t.name)}</a> \u2014 ${esc(t.get)}</li>`).join("")
      + `</ul>`;
  }
  return html;
}

function publicTools() {
  const seen = new Set();
  const out = [];
  for (const job of JOBS) for (const t of job.tools) {
    if (seen.has(t.page) || NOINDEX.has(t.page)) continue;
    seen.add(t.page);
    out.push({ job, tool: t });
  }
  return out;
}

function toolsIndexBody() {
  return JOBS.map((job) => {
    const seen = new Set();
    const items = job.tools
      .filter((t) => ((seen.has(t.page) || NOINDEX.has(t.page)) ? false : seen.add(t.page)))
      .map((t) => `<li><a href="/${esc(t.page)}">${esc(t.name)}</a> \u2014 ${esc(t.get)}. ${esc(t.blurb)}</li>`)
      .join("");
    return items ? `<h2>${esc(job.name)}</h2><p>${esc(job.when)}</p><ul>${items}</ul>` : "";
  }).join("");
}

function generatorBody() {
  return `<h2>The models</h2>`
    + GEN_MODELS.map((m) => `<h3>${esc(m.name)}, by ${esc(m.by)}</h3><p>${esc(m.note)}</p>`).join("")
    + `<h2>Finishing tools</h2>`
    + GEN_TOOLS.map(([t, n]) => `<h3>${esc(t)}</h3><p>${esc(n)}</p>`).join("")
    + `<p>Pay per second of output with credits \u2014 no subscription, no API keys, and credits are returned automatically if a generation fails.</p>`;
}

function legalBody(slug) {
  const c = LEGAL_CONTENT[slug];
  return c ? `<p>Last updated: ${esc(c.updated)}</p>` + c.body : "";
}

function faqBody() {
  return FAQS.map((f) => `<h2>${esc(f.q)}</h2><p>${esc(f.a)}</p>`).join("");
}

function summaryBody(slug) {
  const s = PAGE_SUMMARIES[slug];
  if (!s) return "";
  const sections = s.sections.map(([h, p]) => `<h2>${esc(h)}</h2><p>${esc(p)}</p>`).join("");
  const links = (s.links ?? []).length
    ? `<h2>Next</h2><ul>${s.links.map(([href, label]) => `<li><a href="${esc(href)}">${esc(label)}</a></li>`).join("")}</ul>`
    : "";
  return sections + links;
}

const TAGLINE = `<p><a href="/">RevaultAI</a> \u2014 a curated gallery for AI-generated film.</p>`;

function bodyFor(slug, meta) {
  if (slug === "about") return aboutHtml() + TAGLINE;

  const h1 = `<h1>${esc(pageH1(slug, meta))}</h1>`;
  const lede = `<p>${esc(meta.description)}</p>`;

  if (slug === "home") return h1 + lede + homeBacklotHtml() + toolsIndexBody() + TAGLINE;
  if (slug === "faq") return h1 + lede + faqBody() + TAGLINE;
  if (slug === "pricing") return h1 + lede + pricingBody() + TAGLINE;
  if (slug === "ai-video-generator") return h1 + lede + generatorBody() + TAGLINE;
  if (slug === TOOL_INDEX) return h1 + lede + toolsIndexBody() + TAGLINE;
  if (slug in LEGAL_CONTENT) return h1 + legalBody(slug) + TAGLINE;
  if (slug in PAGE_SUMMARIES) return h1 + lede + summaryBody(slug) + TAGLINE;

  /*
    The Rehearsal Studio carries its own sections, written from the same
    module the page renders them from. A heading that exists only once
    React has mounted is a heading no crawler reads, which would have made
    the whole exercise decorative.
  */
  const extra = slug === "rehearsal" ? sectionsHtml(esc) : "";
  const tool = toolBody(slug, extra);
  if (tool) return h1 + lede + tool + TAGLINE;
  return h1 + lede + extra + TAGLINE;
}

/*
  The pricing page, as static HTML.

  Read from lib/creditPacks.js and lib/genModels.js rather than written out,
  because a hardcoded price in the prerenderer is exactly the drift this whole
  change exists to remove — and it would be the copy Google indexes.
*/
function pricingBody() {
  const best = bestValuePack();

  const packs = CREDIT_PACKS.map((p) => {
    const saving = savingVsStarter(p);
    return `<li><strong>${esc(p.label)} — ${p.credits} credits, ${esc(priceLabel(p))}</strong>` +
      ` (${esc(perCreditLabel(p))}${saving > 0 ? `, ${saving}% cheaper per credit than Starter` : ""})` +
      `${p.key === best.key ? " — best value" : ""}</li>`;
  }).join("");

  const models = PRICED_MODELS.map((m) => {
    const secs = snapDuration(m.key, 5);
    return `<li>${esc(m.label)} — ${m.costPerSecond} ${m.costPerSecond === 1 ? "credit" : "credits"}` +
      ` per second, ${costOf(m.key, secs)} credits for ${secs} seconds</li>`;
  }).join("");

  return `<section><h2>Credit packs</h2><ul>${packs}</ul>` +
    `<p>One-time purchase, charged through Stripe. There is no subscription. Credits are` +
    ` deducted per second of output, and if a generation fails the credits come straight back.</p></section>` +
    `<section><h2>What it costs to generate</h2>` +
    `<p>Faster models cost less per second; flagship models cost more.</p><ul>${models}</ul></section>` +
    `<section><h2>Free</h2><p>Credits buy generation. The planning does not cost anything:` +
    ` scene breakdowns, shot direction, coverage planning, continuity checks, and the` +
    ` <a href="/lot">Lot Supervisor</a> staging board, which needs no account at all.` +
    ` Watching films in the gallery is free.</p>` +
    `<p><a href="/tools">See the tools</a> · <a href="/lot">Open the Lot</a></p></section>` +
    `<section><h2>If you sell</h2><p>Every film streams free and selling a full-quality` +
    ` download is optional. You set the price and keep 80% of net revenue — what is left after` +
    ` Stripe's processing fee. Tips and commissions arranged through your profile links go` +
    ` directly to you. See the <a href="/terms">Terms of Service</a> and the` +
    ` <a href="/refunds">Refund Policy</a>.</p></section>`;
}

function schemasFor(slug, meta, url) {
  if (NOINDEX.has(slug)) return [];

  if (slug === "home") {
    return [
      { "@context": "https://schema.org", ...ORG_FULL, description: meta.description },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "RevaultAI",
        url: SITE,
        description: meta.description,
        publisher: ORG,
      },
    ];
  }

  if (slug === "faq") {
    return [{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    }];
  }

  if (slug === TOOL_INDEX) {
    const tools = publicTools();
    return [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "RevaultAI filmmaking tools",
      itemListElement: tools.map(({ tool }, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: tool.name,
        description: tool.get,
        url: `${SITE}/${tool.page}`,
      })),
    }];
  }

  if (TOOL_PAGES.has(slug)) {
    const entry = catalogEntries(slug)[0];
    const app = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: entry ? entry.tool.name : pageH1(slug, meta),
      description: meta.description,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web browser",
      url,
      publisher: ORG,
    };
    // Only genuinely free tools claim a zero price. The generator runs on
    // credits, so it states no price rather than a misleading one.
    if (entry && entry.tool.access === "free") {
      app.offers = { "@type": "Offer", price: "0", priceCurrency: "USD" };
    }
    return [app];
  }

  return [];
}

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
  for (const schema of schemasFor(slug, meta, url)) html = injectJsonLd(html, schema);
  html = injectBody(html, bodyFor(slug, meta));
  // The homepage, and only the homepage.
  if (slug === "home") html = injectTaaftBadge(html);
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

  const banner = m.banner ? `<p>${escBold(m.banner)}</p>` : "";
  const body = m.prompts
    .map((p, i) => `<section><h2>${i + 1}. ${esc(p.title)}</h2>${p.spec ? `<p><em>Set frame and length: ${esc(p.spec)}</em></p>` : ""}<p>${esc(p.text)}</p>${p.note ? `<p><strong>Continuity note:</strong> ${esc(p.note)}</p>` : ""}</section>`)
    .join("");
  const also = MODELS.filter((x) => x.slug !== m.slug)
    .map((x) => `<li><a href="/prompts/${esc(x.slug)}">${esc(x.name)} prompts</a></li>`)
    .join("");
  html = injectBody(
    html,
    `<h1>${esc(m.h1)}</h1><p>${esc(m.intro)}</p>${banner}${body}<h2>Also see</h2><ul>${also}</ul><p><a href="/prompt-builder">Build your own prompt free</a> — no account needed.</p>`
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
    .map((p) => `<section><h2>${esc(p.title)} — for ${esc(p.modelName)}</h2><p>${esc(p.text)}</p>${p.note ? `<p><strong>Continuity note:</strong> ${esc(p.note)}</p>` : ""}</section>`)
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
      .select("id, title, prompt_full, category, user_id, premium_status, youtube_id, created_at, mux_playback_id, thumbnail_image, hero_image")
      .not("premium_status", "in", '("Pending","Rejected")')
      .limit(2000);
    if (cErr) console.warn("[prerender] creations query error:", cErr.message);

    for (const c of creations ?? []) {
      const who = nameById[c.user_id] || "a RevaultAI creator";
      const kind = String(c.category || "film").toLowerCase();
      const title = filmTitle(c.title, 60);

      // The note is markdown; clean it before it becomes a search snippet. A
      // note that is only headings leaves nothing usable, so fall back.
      const note = plainTextFromNote(c.prompt_full);
      let desc;
      if (note.length >= 60) {
        // Lead with the note — repeating the title wastes snippet width — and
        // add attribution only when it fits inside the budget.
        const tail = ` An AI ${kind} by ${who} on RevaultAI.`;
        const withTail = clipWords(note, 155 - tail.length) + tail;
        desc = withTail.length <= 155 ? withTail : clipWords(note, 155);
      } else {
        desc = clipWords(`${c.title} — an AI ${kind} by ${who}, streaming free on RevaultAI.`, 155);
      }

      const pageUrl = `${SITE}/film/${c.id}`;
      const thumb = filmThumb(c);

      let html = template;
      html = setTitle(html, title);
      html = setMeta(html, "name", "title", title);
      html = setMeta(html, "name", "description", desc);
      html = setMeta(html, "property", "og:title", title);
      html = setMeta(html, "property", "og:description", desc);
      html = setMeta(html, "property", "og:url", pageUrl);
      html = setMeta(html, "property", "og:type", "video.other");
      html = setMeta(html, "name", "twitter:url", pageUrl);
      if (thumb) {
        html = setMeta(html, "property", "og:image", thumb);
        html = setMeta(html, "name", "twitter:image", thumb);
      }
      html = setCanonical(html, pageUrl);
      html = setRobots(html, true);

      // VideoObject needs a real thumbnail and an upload date to be eligible
      // for a video rich result. Without them, emit nothing rather than
      // something Search Console will flag.
      const uploadDate = isoDate(c.created_at);
      if (thumb && uploadDate) {
        const video = {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: String(c.title ?? "Untitled"),
          description: desc,
          thumbnailUrl: [thumb],
          uploadDate,
          url: pageUrl,
          genre: kind,
          creator: { "@type": "Person", name: who },
          publisher: {
            "@type": "Organization",
            name: "RevaultAI",
            url: SITE,
            logo: { "@type": "ImageObject", url: SITE + "/og-image.png" },
          },
        };
        if (c.youtube_id) video.embedUrl = `https://www.youtube.com/embed/${c.youtube_id}`;
        else if (c.mux_playback_id) video.contentUrl = `https://stream.mux.com/${c.mux_playback_id}.m3u8`;
        html = injectJsonLd(html, video);
      }

      const body = `<h1>${esc(c.title)}</h1><p>An AI-generated ${esc(kind)} by ${esc(who)} on RevaultAI.</p>`
        + `<h2>Production note</h2>${noteHtml(c.prompt_full)}`;
      html = injectBody(html, body);
      writeRoute("/film/" + c.id, html);
      count++;
    }

    for (const p of profileRows ?? []) {
      const name = p.display_name || p.username;
      const title = `${name} — AI Filmmaker on RevaultAI`;
      const bio = String(p.bio || "").replace(/\s+/g, " ").trim();
      // A one-word bio makes a useless description — fall back rather than ship it.
      const desc = (bio.length >= 40 ? bio : `Films by ${name} on RevaultAI, streaming free in a curated gallery of AI-native work.`).slice(0, 155);
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