// src/lib/seo.js — per-page titles, descriptions, canonical, and social tags.
// Called once from App.jsx whenever the page changes.

const SITE = "https://www.revaultai.com";
const SITE_NAME = "RevaultAI";
const DEFAULT_IMAGE = SITE + "/og-image.png";

const DEFAULT = {
  title: "RevaultAI — The AI-Native Creative Vault",
  description:
    "A curated archive of exceptional AI-generated films, animations, and premium prompts. Signal over noise.",
};

// Static pages. Titles stay under ~60 characters, descriptions under ~155,
// so Google shows them in full instead of truncating with an ellipsis.
export const PAGES = {
  home: {
    title: "RevaultAI — Curated AI Films and Premium Prompts",
    description:
      "A curated archive of exceptional AI-generated films, short films, and premium prompts. A vault, not a feed — creators keep 80% of net revenue.",
  },
  explore: {
    title: "Explore AI Films and Creations — RevaultAI",
    description:
      "Browse every AI-generated film, animation, and prompt collection published to the RevaultAI archive. Curated, reviewed, and free to watch.",
  },
  creators: {
    title: "AI Filmmakers and Creators — RevaultAI",
    description:
      "Meet the AI filmmakers shaping the medium. Browse creator profiles, portfolios, and the tools behind their work on RevaultAI.",
  },
  feed: { title: "Following — RevaultAI", description: "The latest work from the AI filmmakers you follow on RevaultAI." },
  generate: {
    title: "Generate AI Video — RevaultAI",
    description:
      "Turn a prompt into a cinematic film clip with Wan and Kling, then submit it straight to the RevaultAI archive.",
  },
  submit: {
    title: "Submit Your AI Film — RevaultAI",
    description: "Share your AI-native film, animation, or prompt collection with the RevaultAI archive.",
  },
  about: {
    title: "About RevaultAI — Curation Over Content",
    description:
      "The AI era does not need more content. It needs curation. Why RevaultAI exists, how we review every submission, and what we are building.",
  },
  faq: {
    title: "FAQ — How RevaultAI Works",
    description:
      "How premium films work, what creators earn, who owns uploaded work, and everything else about the RevaultAI platform.",
  },
  guidelines: {
    title: "Submission Guidelines — RevaultAI",
    description:
      "What we accept, what we reject, and how to get featured. Quality standards for submitting AI films to the RevaultAI archive.",
  },
  "premium-prompts": {
    title: "Premium Films — Own the Work, Back the Creator",
    description:
      "Every film on RevaultAI streams free. Buying a premium film gets you a full-quality download and pays the creator directly.",
  },
  "become-creator": {
    title: "Become a Creator on RevaultAI",
    description:
      "Showcase your AI films, build a creator profile, sell premium work, and keep 80% of net revenue. Join the RevaultAI creator community.",
  },
    discovered: {
    title: "Discovered — Exceptional AI Films From Around the Web | RevaultAI",
    description:
      "A hand-picked exhibition of remarkable AI-generated films from across the web, credited to their directors and streaming from their own channels.",
  },
  "ai-video-generator": {
    title: "AI Video Generator — Seedance, Veo, Kling & Wan | RevaultAI",
    description:
      "Generate AI video with Seedance 2.0, Veo 3.1, Kling 3.0, and Wan 2.6, then upscale to 4K, extend, and lip-sync — one credit balance, no subscription.",
  },
  "founding-creators": {
    title: "Founding Creators Wanted — RevaultAI",
    description:
      "We are selecting a small founding cohort of AI filmmakers. Top placement, 80% of net revenue, and a permanent founding-creator badge.",
  },
  "prompt-builder": {
    title: "Video Prompt Builder — Free AI Video Prompt Generator | RevaultAI",
    description: "Turn a rough idea into a structured video prompt for Veo, Sora, Kling, Runway, Wan, Hailuo and Seedance. Free, no account needed.",
  },
  prompts: {
    title: "AI Video Prompts — Free Copy-and-Paste Prompt Directory",
    description:
      "Free director-grade video prompts for Seedance 2.5, Veo 3.1, and Kling 3.0. Copy, paste, and generate. No account needed.",
  },
  contact: { title: "Contact — RevaultAI", description: "Support, creator inquiries, DMCA, and partnership contacts for RevaultAI." },
  terms: { title: "Terms of Service — RevaultAI", description: "The terms governing use of the RevaultAI platform." },
  privacy: { title: "Privacy Policy — RevaultAI", description: "How RevaultAI collects, uses, and protects your data." },
  refunds: { title: "Refund Policy — RevaultAI", description: "How refunds work for digital purchases on RevaultAI." },
  dmca: { title: "DMCA Policy — RevaultAI", description: "How to report copyright infringement on RevaultAI." },
  "ai-disclaimer": {
    title: "AI Content Disclaimer — RevaultAI",
    description: "All content on RevaultAI is AI-generated. What that means for accuracy, ownership, and responsible use.",
  },
};

import { MODELS } from "../prompts/models.js";

// Prompt-directory model pages, built from the MODELS data so adding a model
// automatically adds its route, title, and description.
export const PROMPT_MODEL_PAGES = MODELS.map((m) => ({
  path: "/prompts/" + m.slug,
  title: m.title,
  description: m.description,
}));

// Pages that should never appear in search results. 
export const NOINDEX = new Set(["settings", "admin", "set-password", "email-confirmed", "purchase-success", "feed", "generate"]);

import { POSTS } from "../blog/posts.js";

function clip(text, max) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/[\s,.;:—-]+$/, "") + "…";
}

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setRobots(shouldIndex) {
  setMeta("name", "robots", shouldIndex ? "index, follow" : "noindex, nofollow");
}

// Article + FAQ structured data for Journal posts.
function setPostSchema(post) {
  const existing = document.getElementById("fc-post-schema");
  if (existing) existing.remove();
  if (!post) return;
  const url = SITE + "/blog/" + post.slug;
  const graph = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      author: { "@type": "Person", name: post.author },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      image: DEFAULT_IMAGE,
      url: url,
    },
  ];
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
  const script = document.createElement("script");
  script.id = "fc-post-schema";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(graph);
  document.head.appendChild(script);
}

// Structured data so Google can show film pages as video results.
function setVideoSchema(creation) {
  const existing = document.getElementById("fc-video-schema");
  if (existing) existing.remove();
  if (!creation) return;
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: creation.title,
    description: clip(creation.prompt_full || creation.title, 300),
    thumbnailUrl: creation.thumbnail_image || creation.hero_image || DEFAULT_IMAGE,
    uploadDate: creation.created_at ? new Date(creation.created_at).toISOString() : undefined,
    creator: { "@type": "Person", name: creation.creator?.display_name || creation.creator?.username },
    genre: creation.category,
    isAccessibleForFree: !creation.is_premium,
  };
  const script = document.createElement("script");
  script.id = "fc-video-schema";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function applySEO({ page, detailId, creatorUser, creations }) {
  let meta = PAGES[page] || DEFAULT;
  let image = DEFAULT_IMAGE;
  let path = window.location.pathname;
  let creation = null;

  if (page === "detail" && detailId) {
    creation = (creations || []).find((c) => c.id === detailId) || null;
    if (creation) {
      const who = creation.creator?.display_name || creation.creator?.username || "a RevaultAI creator";
      meta = {
        title: clip(`${creation.title} — AI Film by ${who} | RevaultAI`, 65),
        description: clip(
          creation.prompt_full
            ? `${creation.title}: an AI-generated ${String(creation.category || "film").toLowerCase()} by ${who}. ${creation.prompt_full}`
            : `${creation.title}, an AI-generated film by ${who} on RevaultAI.`,
          155
        ),
      };
      image = creation.thumbnail_image || creation.hero_image || DEFAULT_IMAGE;
    } else {
      meta = { title: "Film — RevaultAI", description: DEFAULT.description };
    }
  }

if (page === "blog") {
    meta = { title: "The Vault Journal — AI Filmmaking Craft & Tools | RevaultAI", description: "Essays and comparisons on AI filmmaking: models, prompts, workflows, and the craft of AI-native film. From the RevaultAI founder's desk." };
  }
  if (page === "blog-post") {
    const post = POSTS.find((p) => "/blog/" + p.slug === path);
    if (post) meta = { title: clip(post.seoTitle || post.title, 70), description: clip(post.description, 160) };
  }

  if (page === "profile" && creatorUser) {
    meta = {
      title: clip(`${creatorUser} — AI Filmmaker on RevaultAI`, 65),
      description: clip(
        `Films, prompts, and workflows by ${creatorUser} on RevaultAI — a curated archive of AI-native creative work.`,
        155
      ),
    };
  }

  const title = meta.title;
  const description = meta.description;
  const canonical = SITE + (path === "/" ? "/" : path.replace(/\/$/, ""));

  document.title = title;
  setMeta("name", "title", title);
  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", canonical);
  setMeta("property", "og:image", image);
  setMeta("property", "og:type", page === "detail" ? "video.other" : "website");
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", image);
  setMeta("name", "twitter:url", canonical);
  setLink("canonical", canonical);
  setRobots(!NOINDEX.has(page));
  setVideoSchema(page === "detail" ? creation : null);
  setPostSchema(page === "blog-post" ? POSTS.find((p) => "/blog/" + p.slug === path) : null);
}