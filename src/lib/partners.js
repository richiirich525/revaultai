/*
  partners — RevaultAI

  Outbound links to tools we recommend and earn a commission on. One place,
  because an affiliate URL that appears in several files is an affiliate URL
  that will eventually be wrong in one of them.

  Two rules these have to follow, and both are written into the markup rather
  than left to whoever adds the next one:

    rel="nofollow sponsored"   Google asks for sponsored specifically on paid
                               links. Without it a commercial link can be read
                               as link-scheme manipulation, which costs more
                               than the commission is worth.

    the note, always visible   Not a tooltip, not a footnote on another page.
                               If a reader cannot see that a link pays us
                               while they are deciding whether to click it,
                               the disclosure is decorative.

  Deliberately NOT included: the 1x1 impression pixel the network supplies
  alongside the link. It loads on page view rather than on click, from a
  third-party domain, which is cross-site tracking by any fair reading, and
  the privacy policy says we do not do that. The text link earns the
  commission on its own.
*/

export const PARTNERS = {
  "epidemic-sound": {
    name: "Epidemic Sound",
    href: "https://www.dpbolvw.net/click-101884703-15381627",
    what: "Licensed music and sound effects, cleared for use in films you publish.",
  },
};

export const AFFILIATE_NOTE =
  "Affiliate link: if you subscribe, RevaultAI may earn a commission. It costs you nothing extra.";

export const partnerHref = (key) => PARTNERS[key]?.href ?? null;

/* The attributes every partner link must carry. Spread rather than retyped. */
export const PARTNER_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer nofollow sponsored",
};
