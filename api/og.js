import React from "react";
import { ImageResponse } from "@vercel/og";
import { PAGES } from "../src/lib/seo.js";

/*
  og — RevaultAI
  The social preview card for a page, drawn on request.

  Titles and descriptions come from src/lib/seo.js, the same source the
  prerenderer uses, so a share card can never disagree with the page it
  points at.

  Only Noto Sans is available here — @vercel/og bundles it and nothing else.
  The site's own faces (Syne, Cormorant Garamond) would each need their font
  file fetched and passed in, which is a later refinement, not a blocker.

  Usage:  /api/og?page=tools
*/

const h = React.createElement;

const BG = "#0E0F14";
const TEXT = "#E8E6F0";
const MUTED = "#6B6878";
const ACCENT = "#7B3FE4";

// Titles in seo.js carry the brand suffix, which the card states separately.
const stripBrand = (t) => String(t || "").replace(/\s*\|\s*RevaultAI\s*$/i, "").trim();

const clamp = (s, n) => {
  const t = String(s || "").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
};

export default async function handler(req, res) {
  try {
    // Vercel's Node runtime parses the query for us; fall back to the raw
    // URL so the route also works when called directly.
    const fromQuery = req.query && typeof req.query.page === "string" ? req.query.page : null;
    const slug = (fromQuery
      ?? new URL(req.url, "https://www.revaultai.com").searchParams.get("page")
      ?? "home").toLowerCase();
    const meta = PAGES[slug];

    const title = meta ? stripBrand(meta.title) : "RevaultAI";
    const blurb = meta
      ? clamp(meta.description, 150)
      : "A curated gallery for AI-generated film.";

    const image = new ImageResponse(
      h("div", {
        style: {
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", background: BG,
          padding: "72px 80px", fontFamily: "Noto Sans",
        },
      }, [
        // A single accent rule, standing in for the site's purple
        h("div", { key: "rule", style: { display: "flex", width: 96, height: 4, background: ACCENT } }),

        h("div", { key: "body", style: { display: "flex", flexDirection: "column" } }, [
          h("div", {
            key: "eyebrow",
            style: {
              display: "flex", fontSize: 22, letterSpacing: 6, color: ACCENT,
              textTransform: "uppercase", marginBottom: 26,
            },
          }, "RevaultAI"),
          h("div", {
            key: "title",
            style: {
              display: "flex", fontSize: title.length > 46 ? 62 : 74, fontWeight: 700,
              color: TEXT, lineHeight: 1.12, letterSpacing: -1,
            },
          }, clamp(title, 84)),
          h("div", {
            key: "blurb",
            style: {
              display: "flex", fontSize: 28, color: MUTED, lineHeight: 1.45,
              marginTop: 28, maxWidth: 900,
            },
          }, blurb),
        ]),

        h("div", {
          key: "foot",
          style: {
            display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            fontSize: 22, color: MUTED,
          },
        }, [
          h("div", { key: "dom", style: { display: "flex" } }, "revaultai.com"),
          h("div", { key: "tag", style: { display: "flex", color: MUTED } }, "A gallery, not a feed"),
        ]),
      ]),
      { width: 1200, height: 630 }
    );

    const png = Buffer.from(await image.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    // Deterministic per slug, so let the crawlers and the CDN keep it.
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).send(png);
  } catch (err) {
    console.error("og render failed:", err);
    return res.status(500).send("Could not draw that card.");
  }
}
