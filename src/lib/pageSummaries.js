/*
  pageSummaries.js — crawler-facing body copy for pages whose real content is
  rendered client-side (a film grid, a creator list, a form).

  scripts/prerender.js writes these into the static HTML so a crawler, or a
  visitor with JavaScript off, gets a real page instead of a title and one line.
  Edit the copy here; it is not rendered in the app.
*/

export const PAGE_SUMMARIES = {
  explore: {
    sections: [
      ["What's in the gallery", "Every AI film, short film, animation and image published to RevaultAI, in one browsable gallery. Films stream free and in full — no paywall, no locked preview, no clip that cuts off before the end. Each one is published alongside a production note explaining how it was made, in the creator's own words."],
      ["How films get here", "Nothing is auto-published. Every submission is reviewed by a person before it appears, which is the whole reason this is a gallery rather than a feed. Work that is derivative, incomplete or infringing is rejected with a reason."],
      ["Watching and owning", "All films are free to watch. Where a creator has marked one as premium, you also have the option to buy a full-quality download — the film stays free to stream either way, and the creator keeps 80% of net revenue on every sale."],
    ],
    links: [["/creators", "Browse the filmmakers"], ["/premium-films", "How premium films work"], ["/guidelines", "Submission guidelines"]],
  },

  creators: {
    sections: [
      ["The filmmakers", "Every creator publishing on RevaultAI, each with a profile page collecting their films, their production notes and the tools they work with. Follow a creator to see new work as it is published."],
      ["What a creator profile holds", "A biography, links to their own channels, and every film they have published here with its production note open. Because notes stay public, a creator page doubles as a record of how the work was actually made — model choices, workflow, and the decisions behind each film."],
      ["Publishing here", "Creator accounts are open by application. Selling is optional, every film streams free, and creators keep 80% of net revenue on anything they do sell."],
    ],
    links: [["/become-creator", "Become a creator"], ["/founding-creators", "Founding creator program"], ["/explore", "Browse the gallery"]],
  },

  "become-creator": {
    sections: [
      ["Publishing on RevaultAI", "Create an account, submit a film, and a person reviews it before it goes live. There is no automatic publishing and no algorithmic burial — if your work is accepted it has a permanent page in the gallery, and it is shown rather than scrolled past."],
      ["What a submission needs", "The film itself, uploaded or linked from your own YouTube channel, plus a production note describing how it was made. The note does not have to be a prompt: for a multi-shot film, your workflow, model choices or the creative decisions behind the work are exactly what we are after. Share what you are comfortable sharing."],
      ["Earning", "Selling is entirely optional and most films here are free. If you mark a film as premium it still streams free in full, and viewers gain the option to buy a full-quality download. You set the price and keep 80% of net revenue on every sale. You retain ownership and copyright of your work throughout."],
      ["The tools come with it", "A creator account includes the planning and generation tools: shot lists, coverage, blocking, a rehearsal stage, five generation models on one credit balance, and the finishing tools to upscale, extend and lip-sync what you make."],
    ],
    links: [["/guidelines", "Submission guidelines"], ["/tools", "The filmmaking tools"], ["/premium-films", "How premium films work"], ["/founding-creators", "Founding creator program"]],
  },

  "premium-films": {
    sections: [
      ["Every film streams free", "There is no paywall on RevaultAI. Every film in the gallery plays in full for anyone, and every production note stays open to everyone — including the notes on premium work. Premium does not lock anything away."],
      ["What buying gets you", "A full-quality download of the finished film, permanently available to re-download from your account. Buying is how you own a copy and how you pay the person who made it directly."],
      ["What creators earn", "Creators set their own price and keep 80% of net revenue on every sale. Selling is optional — a creator can showcase work here indefinitely without ever offering a purchase."],
      ["Ownership and licensing", "A purchase grants a personal-use copy. Creators retain full ownership and copyright, and reselling or redistributing a purchased film is not permitted. For commercial licensing, the License This link on a film's page arranges it with the creator directly."],
    ],
    links: [["/explore", "Find a film worth owning"], ["/refunds", "Refund policy"], ["/become-creator", "Sell your own work"]],
  },

  guidelines: {
    sections: [
      ["What we accept", "Original AI-generated film, short film, animation and images, published with a production note describing how the work was made. Strong visual presentation and cinematic storytelling are what get work featured. Experimental work is welcome — polish is not the only standard."],
      ["What we reject", "Spam and duplicate submissions. Work that is stolen, plagiarized, or reproduces someone else's footage, score, screenplay, characters or likeness. Content that depicts real people without consent. Hate content and discrimination. Anything illegal."],
      ["The review", "A person reviews every submission. Rejections come with a reason, so a near miss can be resubmitted rather than guessed at."],
      ["Copyright", "You must own or hold the rights to everything you submit. Every film here is AI-generated, which does not place it outside copyright law. If you are not certain you hold the rights to what you made, do not publish it here."],
    ],
    links: [["/become-creator", "Become a creator"], ["/dmca", "DMCA policy"], ["/ai-disclaimer", "AI content disclaimer"]],
  },

  contact: {
    sections: [
      ["Getting in touch", "General support, account questions and purchase issues go to rich@revaultai.com. For a purchase problem, include the order email and the film title so it can be found quickly."],
      ["Creators and partnerships", "Creator applications, founding cohort inquiries and partnership proposals reach the same address. Every creator application gets a personal reply either way."],
      ["Copyright notices", "Notices of claimed copyright infringement must go to our registered copyright agent, not to general support. The full requirements for a takedown notice and for a counter-notice are set out in the DMCA policy."],
    ],
    links: [["/faq", "Check the FAQ first"], ["/dmca", "DMCA policy and agent address"], ["/guidelines", "Submission guidelines"]],
  },

  "founding-creators": {
    sections: [
      ["The founding cohort", "RevaultAI is selecting a small group of filmmakers to help shape the platform before it opens more widely. Founding creators get their work in front of a curated audience from the start, and direct input into what gets built next."],
      ["Who it suits", "Anyone making AI-native film they are proud of — short films, animation, music video, experimental work. A finished body of work matters more than an audience; this is not a follower count exercise."],
      ["How to apply", "Submit your work through the creator application. Every application is reviewed by a person and gets a personal reply, accepted or not."],
    ],
    links: [["/become-creator", "Apply as a creator"], ["/guidelines", "What we accept"], ["/explore", "See what's already here"]],
  },
};
