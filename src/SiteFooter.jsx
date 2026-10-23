import PageLink from "./PageLink.jsx";
import { FOOTER_GROUPS, FOOTER_NOTE } from "./lib/footerLinks.js";

/*
  SiteFooter — RevaultAI

  A footer, which the site did not have. Three things it is for:

    1. Somewhere to find pricing, contact and the legal pages from any page,
       rather than only from wherever they happen to be linked.
    2. Real crawlable links to them. A tool page with no outbound links is a
       dead end to a crawler, and these are the pages a search engine most
       expects a site to have.
    3. Saying plainly what costs money, because the Rehearsal Studio is free
       and the generator is not, and a visitor should not have to guess which
       is which.

  Every target below is checked against App.jsx's routed pages by
  scripts/check-links.mjs, so a renamed page cannot leave a dead footer link.
*/



const css = `
  .ft { border-top: 1px solid var(--border); margin-top: 72px; padding: 44px 0 56px; }
  .ft-wrap { max-width: 1040px; margin: 0 auto; padding: 0 48px; }
  .ft-note { font-family: var(--font-body); font-size: 13px; color: var(--muted); line-height: 1.85; max-width: 62ch; }
  .ft-note b { color: var(--text); font-weight: 500; }
  .ft-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 28px; margin-top: 34px; }
  .ft-h { font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--accent-text); margin-bottom: 12px; }
  .ft-list { display: flex; flex-direction: column; gap: 2px; }
  /* 44px of height on a phone, where these are the links most likely to be
     tapped by mistake if they are packed tight. */
  .ft-link { font-family: var(--font-body); font-size: 13.5px; color: var(--muted); text-decoration: none;
    display: flex; align-items: center; min-height: 32px; }
  .ft-link:hover { color: var(--accent-text); text-decoration: underline; }
  .ft-base { margin-top: 36px; padding-top: 22px; border-top: 1px solid var(--border);
    font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.9; }
  @media (max-width: 860px) {
    .ft-wrap { padding: 0 22px; }
    .ft-link { min-height: 44px; font-size: 14px; }
  }
`;

export default function SiteFooter({ setPage }) {
  return (
    <footer className="ft">
      <style>{css}</style>
      <div className="ft-wrap">
        <div className="ft-note">{FOOTER_NOTE}</div>
        <div className="ft-cols">
          {FOOTER_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="ft-h">{g.title}</div>
              <div className="ft-list">
                {g.links.map(([page, label]) => (
                  <PageLink key={page} page={page} setPage={setPage} className="ft-link">
                    {label}
                  </PageLink>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="ft-base">
          RevaultAI — a curated gallery for AI film, and the studio lot behind it.
          {" "}Creators keep 80% of net revenue on every sale.
        </div>
      </div>
    </footer>
  );
}
