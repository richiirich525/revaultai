// src/lib/backlotCopy.js — the backlot copy, word for word from backlot-copy.md.
// Plain JS (no JSX) so scripts/prerender.js can import it and bake the same
// text into the static HTML that BacklotSection and AboutPage render.
// **double asterisks** mark bold spans.

export const HOME_BACKLOT = {
  heading: "Every AI video tool is a camera. This is the lot.",
  intro: [
    "For a hundred years, a film studio was a place you could walk through. Stages where scenes were blocked before anyone rolled. A prop house and a wardrobe department that kept a character looking like themselves across six months of shooting. A camera cage. A script supervisor with a notebook. A cutting room at the end of it all.",
    "AI video gave filmmakers a camera that costs pennies and no lot to put it on. So we built the lot.",
  ],
  stations: [
    { lead: "The soundstage.", body: "Block the scene before you spend anything. Move your performers and cameras through a shot on a timeline, watch it from each angle, and see the shot size, lens, eyelines and the 180° line update as you work. When an angle is right, it becomes the shot you generate. Free, and it costs no credits to change your mind." },
    { lead: "Casting and the prop house.", body: "Your characters, locations and props, written down once with reference photos. Their descriptions are reproduced word for word in every shot they appear in, and their photos go to the model itself — so a character arrives looking like themselves rather than like a sentence about themselves." },
    { lead: "The camera cage.", body: "Four model families on one balance, and an honest answer about which one suits the shot: what it will cost, how long it can hold, and what's most likely to break." },
    { lead: "The script supervisor.", body: "Someone reading every shot against every other shot: a jacket that changes colour, a prop that swaps hands, a reverse angle that crosses the line, a character who knows something they haven't learned yet." },
    { lead: "The cutting room.", body: "Your takes, including the failures, assembled into a cut you can watch — then exported as an edit that opens already cut in DaVinci Resolve or Premiere Pro." },
    { lead: "The theatre.", body: "Where the finished film plays. Curated, not algorithmic: no infinite scroll, no ranking, nothing auto-playing over the top of something else. Work is shown because it's good." },
  ],
  cta: {
    heading: "Bring your story. The lot is open.",
    line: "Nothing asks for an account until you generate or save.",
    primary: { label: "Block a scene", page: "rehearsal" },
    secondary: { label: "Browse the films", page: "explore" },
  },
};

export const ABOUT_BACKLOT = {
  heading: "A studio lot, rebuilt in software",
  intro: [
    "Most AI video platforms are a prompt box and a wish. You describe a shot, you pay, and you find out. If it comes back wrong you describe it again, and pay again, and the thing you're making never accumulates into anything — no record of what worked, no memory of what your characters look like, no path from a folder of clips to a finished scene.",
    "That isn't how films get made. It never was.",
    "A film studio was never one building. It was a lot: stages, a prop house, wardrobe, a camera department, a script supervisor's notebook, a cutting room. Each part existed because a film needs something that the camera alone can't provide — continuity, coverage, blocking, an edit. The camera was always the cheapest problem to solve.",
    "AI solved the camera. Everything else on the lot went missing.",
    "RevaultAI is that lot, rebuilt.",
  ],
  stations: [
    { lead: "The soundstage.", body: "Before you generate anything, block the scene: performers and cameras moving through a shot on a timeline, seen through the lens the geometry chooses. Compare two angles on the same performance. Watch where the eyelines land, and whether you've crossed the line. It costs nothing, because in a real studio rehearsal doesn't cost film." },
    { lead: "Casting and the prop house.", body: "A production bible your tools actually read. Write a character down once, with photographs, and every shot they appear in reproduces that description exactly and sends those photographs to the model. Record what happens to them as the story goes — a cracked phone, a soaked coat — and later shots carry it." },
    { lead: "The camera cage.", body: "Several generation models behind one credit balance, with no subscription and no keys to manage. Describe a shot and get a straight answer about which model suits it, what it will really cost, and what tends to go wrong. Test at draft quality for half the credits, check the result, and only then pay full price for a prompt that works." },
    { lead: "The script supervisor's notebook.", body: "Your takes, grouped into shots, with the reason each rejection failed — and a read across the whole project when something contradicts something else. Over time it tells you what a usable shot actually costs you, and which models earn your approvals rather than which market best." },
    { lead: "The cutting room.", body: "Hand over every take, including the ones you threw away — a failed clip often hides a usable second. Get back a cut you can watch in the browser, a list of the shots still missing, and an edit that opens already assembled in DaVinci Resolve or Premiere Pro." },
    { lead: "The theatre.", body: "A gallery, not a feed. Films are chosen, not ranked. Nothing autoplays over the last thing you watched, and there's no algorithm deciding who deserves attention this week." },
  ],
  sections: [
    {
      title: "What we don't do",
      paragraphs: [
        "We don't pretend the model is a director. Every tool here advises; you decide. Nothing regenerates your work without being asked, nothing rewrites your dialogue, and nothing overwrites what you've established because a model produced something different.",
        "We don't hide the craft either. When a shot fails, you're told which words caused it. When a model can't do something, you're told before you pay, not after.",
      ],
    },
    {
      title: "How creators are paid",
      paragraphs: [
        "Every film streams free. When a creator sells a download, they keep **80% of the net**. Tips, commissions and licensing arrangements go directly between the viewer and the creator, and we take **nothing** from those.",
      ],
    },
    {
      title: "Who it's for",
      paragraphs: [
        "Filmmakers who want control rather than surprises. People who know what an over-the-shoulder is for, or want to. Anyone who has a story and not a crew.",
      ],
    },
  ],
  closing: "Bring your story. The lot is open.",
};

// Splits "a **b** c" into ["a ", "b", " c"]; odd indexes are the bold spans.
export function splitBold(text) {
  return String(text).split(/\*\*(.+?)\*\*/g);
}
