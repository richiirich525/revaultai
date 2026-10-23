/*
  footerLinks — RevaultAI

  The footer's links, as data, because two things render them and they must not
  drift:

    1. SiteFooter.jsx, for somebody reading the page.
    2. scripts/prerender.js, which writes the static HTML a crawler reads.

  That second one is the reason this file exists. The footer shipped as a React
  component, which meant it did not exist until the page hydrated — so the
  crawlable links it was added to provide were invisible to exactly the
  audience they were for. A fetch of the live page with JavaScript off showed
  no footer at all.

  Every target here is checked against the app's routed pages by
  scripts/check-links.mjs.
*/

export const FOOTER_GROUPS = [
  {
    title: "Make something",
    links: [
      ["rehearsal", "Rehearsal Studio"],
      ["tools", "All the tools"],
      ["generate", "Generate"],
      ["recording-studio", "Recording Studio"],
      ["lot", "The Lot"],
    ],
  },
  {
    title: "Watch",
    links: [
      ["explore", "Explore"],
      ["premium-films", "Premium films"],
      ["creators", "Creators"],
      ["discovered", "Discovered"],
    ],
  },
  {
    title: "About",
    links: [
      ["pricing", "Pricing & credits"],
      ["about", "About RevaultAI"],
      ["blog", "Journal"],
      ["contact", "Contact"],
    ],
  },
  {
    title: "The small print",
    links: [
      ["terms", "Terms"],
      ["privacy", "Privacy"],
      ["refunds", "Refunds"],
      ["guidelines", "Guidelines"],
      ["ai-disclaimer", "AI disclaimer"],
      ["dmca", "DMCA"],
    ],
  },
];

export const FOOTER_NOTE =
  "Blocking a scene is free and needs no account. Credits are only spent when you generate actual video, and the price is shown before you confirm it. There is no subscription.";

/* The static footer a crawler reads. Headings and links only. */
export function footerHtml(esc) {
  const groups = FOOTER_GROUPS.map(
    (g) =>
      `<h2>${esc(g.title)}</h2><ul>` +
      g.links.map(([page, label]) => `<li><a href="/${esc(page)}">${esc(label)}</a></li>`).join("") +
      `</ul>`,
  ).join("");
  return `<hr><p>${esc(FOOTER_NOTE)}</p>${groups}`;
}
