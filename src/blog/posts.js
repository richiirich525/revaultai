// src/blog/posts.js — blog content lives here as plain data.
// To publish a new post: add an object to POSTS (newest first), push. The
// blog index, post pages, SEO tags, and sitemap all pick it up automatically.

export const POSTS = [
  {
    slug: "which-ai-video-model-to-use-seedance-veo-kling-wan",
    title: "Which AI Video Model Should You Use? Seedance, Veo, Kling and Wan, Shot by Shot",
    description:
      "A working breakdown of Seedance 2.0, Veo 3.1, Kling 3.0 and Wan 2.6 — which model to use for which shot, plus the finishing tools that actually get a film done.",
    date: "2026-08-13",
    author: "Richard Garland",
    category: "Craft",
    readingTime: "9 min",
    content: `
<p>The question I get asked most is which AI video model is best. It's the wrong question, and answering it honestly took me a few hundred generations to figure out.</p>

<p>There is no best model. There are models that are very good at specific things and mediocre at others, and the filmmakers producing work worth watching in 2026 aren't loyal to one — they route each shot to whichever handles it. That sounds obvious written down. It's expensive in practice, because it usually means four subscriptions, four accounts, four billing pages, and an API key you regenerate every time you switch machines.</p>

<p>This is a breakdown of what each of the four models I run is actually for, and then the part nobody writes about: the finishing tools that decide whether a good clip becomes a finished film.</p>

<h2>Seedance 2.0 — when the camera is the performance</h2>

<p>ByteDance's flagship sits at or near the top of the public leaderboards, and the reason is control. Dolly zooms, rack focus, tracking shots, POV switches — describe the move and it executes rather than approximating. Physics hold up under pressure too: collisions have weight, fabric tears believably, and fight choreography doesn't dissolve into smear at the moment of contact.</p>

<p>It also generates synchronized audio natively, at no extra cost, and it will cut between multiple shots inside a single generation. A 15-second Seedance output can genuinely feel edited rather than continuous.</p>

<p>The catch is price. It's the most expensive model I run by a wide margin, which is why I offer it at two resolutions. The 480p tier costs half as much and exists for one reason: to let you find the shot before you pay for the shot.</p>

<p><strong>Reach for it when:</strong> the camera move is the idea, the scene has real physical action, or you want multiple cuts out of one generation.</p>

<h2>Veo 3.1 — when it has to look expensive</h2>

<p>Google's model has the strongest out-of-the-box image of the four. Prompt-following is precise, lighting reads as intentional rather than lucky, and subtle motion — breathing, wind, water, fabric at rest — lands better than anything else on this list.</p>

<p>Its real separator is dialogue. Veo generates lip-synced spoken lines in the same pass as the picture. Put your dialogue in quotes in the prompt and it comes back spoken, in sync, with ambience underneath. For a single character delivering a line, nothing else gets you there in one step.</p>

<p><strong>Reach for it when:</strong> it's a hero shot, a beauty shot, or someone has to talk.</p>

<h2>Kling 3.0 — when things move fast</h2>

<p>Kling is the motion specialist. Running, dancing, sport, crowds, anything where multiple bodies move quickly through frame — this is where it separates from models that look better in a still. The failure mode of AI video is movement that doesn't obey the world, and Kling breaks that trust less often than its price suggests it should.</p>

<p>It gives you less granular camera control than Seedance and less polish than Veo. It's not trying to be either. It's trying to make motion that holds together, and it does.</p>

<p><strong>Reach for it when:</strong> the shot is kinetic and the budget isn't unlimited.</p>

<h2>Wan 2.6 — the workhorse you'll use most</h2>

<p>Wan is open-weight, fast, and cheap enough that you stop rationing takes. That matters more than any single-shot quality comparison, because rationed takes show on screen. The films that look considered are the films where somebody generated fifteen versions and kept one.</p>

<p>It won't beat Veo on polish or Seedance on camera control. It doesn't need to. It's what you block a film in, test a prompt structure with, and previz an idea on before spending real money on the take you keep.</p>

<p><strong>Reach for it when:</strong> you're figuring out what the shot even is.</p>

<h2>The part nobody writes about: finishing</h2>

<p>Every comparison article stops at generation. That's not where AI films die. They die at the point where you have a good ten-second clip and no way to turn it into a film.</p>

<p><strong>Start from an image.</strong> Every one of these models will animate from a still you provide instead of a description it has to interpret. If you've already made an image you love — in Midjourney, Flux, a camera — that frame is a far more reliable starting point than any paragraph of prompt.</p>

<p><strong>Extend past the ceiling.</strong> Every model on this list caps somewhere between 8 and 15 seconds. Extension continues an existing clip with consistent motion, style, and audio, and you can chain extensions. That's how a 10-second generation becomes a minute of film.</p>

<p><strong>Upscale the keeper.</strong> Temporally consistent upscaling takes a clip to 1080p or 4K without the frame-to-frame shimmer that gives cheap upscalers away. Paired with a cheap draft tier this changes your whole economy: iterate at 480p, upscale only the take that survives.</p>

<p><strong>Re-sync the dialogue.</strong> Lip sync takes a finished clip and an audio track and re-times the mouth to match, carrying emotion and delivery from the recording. It's how you fix a line without regenerating the shot, and how you dub a film into another language without reshooting it.</p>

<h2>The workflow that actually works</h2>

<p>Put together, the pipeline looks like this. Block the film cheap — Wan, or Seedance at 480p — until you know what each shot is. Generate hero shots on whichever model suits them: Seedance where the camera moves, Veo where it has to be beautiful or someone speaks, Kling where bodies move fast. Extend the shots that end too early. Upscale the ones you keep. Fix dialogue with lip sync rather than regenerating. Then take the whole thing into a real edit with a real sound pass, because sound design is still where AI films most often feel cheap.</p>

<p>The model is a lens. You still have to own the cut.</p>

<h2>Why I put them all in one place</h2>

<p>I built the generator on RevaultAI because I was doing all of the above across four accounts and hating it. Now it's four models and four finishing tools behind a single credit balance — pay per second of output, no subscription, no API keys, and credits come back automatically if a generation fails. Cheap models cost less, flagship models cost more, and you choose per shot instead of per month.</p>

<p>You can <a href="/ai-video-generator">see how it works here</a>.</p>

<p>The other half of why it exists: when the film is done, it should have somewhere to go that isn't a feed. RevaultAI is a curated gallery for AI film — every submission reviewed, nothing buried, and creators keep 80% of net revenue on anything they sell. We're selecting a founding cohort of filmmakers right now, and if you're making work you're proud of, <a href="/founding-creators">apply as a founding creator</a>. Every application gets a personal reply either way.</p>
`,
  },
  {
    slug: "kling-vs-runway-vs-veo-best-ai-video-model-filmmakers-2026",
    title: "Kling 3.0 vs Runway Gen-4.5 vs Veo 3.1: Which Model Should Filmmakers Use in 2026?",
    description:
      "A working filmmaker's comparison of Kling 3.0, Runway Gen-4.5, and Google Veo 3.1 — motion, camera control, audio, cost, and what to use now that Sora is gone.",
    date: "2026-08-12",
    author: "Richard Garland",
    category: "Comparisons",
    readingTime: "8 min",
    content: `
<p>If you make AI short films, 2026 has been the year the tool question got real. The novelty phase is over: every serious model can make a pretty ten-second clip. The question that matters now is which one holds up across a whole film — consistent characters, deliberate camera work, motion that obeys physics, and a cost per finished minute that doesn't kill the project.</p>

<p>This is a filmmaker's comparison, not a spec sheet. I run an AI film platform and generate with these models daily, so the opinions below come from finished work, not demo reels.</p>

<h2>First, the elephant: Sora is gone</h2>
<p>If your pipeline was built on Sora, you already know. OpenAI discontinued the Sora web and app experiences in April 2026, and the API shuts down on September 24, 2026. Whatever you thought of the model — and its physics were genuinely impressive — it is no longer a tool you can build a filmmaking practice on. Every Sora filmmaker is now choosing between the three models below, which is exactly why this comparison exists.</p>

<h2>The short answer</h2>
<p>There is no single best model — there's a best model per job:</p>
<ul>
<li><strong>Kling 3.0</strong> if your film lives or dies on motion: action, dance, physical performance, anything where bodies and objects need to move believably. It's also the cheapest of the three per second, which matters enormously across a full short.</li>
<li><strong>Runway Gen-4.5</strong> if you think like a director. Its keyframes, camera controls, and video-to-video tools give you the most say over <em>how</em> a shot unfolds, and its editing environment means fewer round trips to other software.</li>
<li><strong>Veo 3.1</strong> if you want the strongest all-around image out of the box — cinematic prompt-following, native synchronized audio, and the polish that makes single shots look expensive.</li>
</ul>

<h2>What actually matters in a short film</h2>
<p>Most comparisons test one prompt and rank the outputs. Films fail differently. Across dozens of finished shorts, these are the five criteria that decide whether a model works for narrative filmmaking:</p>

<h3>1. Motion and physics</h3>
<p>The fastest way for an AI film to break the audience's trust is movement that doesn't obey the world — floaty walks, hands that smear, fabric that ignores gravity. Kling 3.0 is the strongest of the three here, particularly on fast, complex motion; it's the model I reach for when a shot involves running, fighting, sport, or crowds. Veo 3.1 is close behind and often more polished on subtle motion like breathing, wind, and water. Runway is capable but occasionally softens under aggressive camera moves.</p>

<h3>2. Camera control</h3>
<p>Direction is the difference between generating clips and making films. Runway Gen-4.5 wins this category and it isn't close: keyframes, explicit camera direction, and video-to-video restyling let you decide the shot rather than gamble on it. Veo follows written camera language well ("slow dolly in," "handheld tracking shot") but gives you less to grab when it guesses wrong. Kling sits in between — good sustained camera moves, less granular control.</p>

<h3>3. Character consistency</h3>
<p>The hardest problem in AI filmmaking is the same face in shot two. All three have improved with reference-image workflows; Runway's reference controls are the most production-ready, and Veo's image-to-video path is a strong second. Whatever model you choose, plan your film around this limitation: fewer characters, distinctive wardrobe, and cutaways are still your friends.</p>

<h3>4. Native audio</h3>
<p>Veo 3.1 generates synchronized audio — ambience, effects, even dialogue — which can genuinely accelerate rough cuts. Kling's newest tier adds native audio and multilingual lip-sync as well. Runway remains video-first. My honest take for filmmakers: treat native audio as a sketching tool. Finished films still deserve a real sound pass, and sound design is where AI films most often feel cheap.</p>

<h3>5. Cost per finished minute</h3>
<p>The number nobody advertises. You will generate five to fifteen takes per usable shot, so per-second pricing compounds fast. Kling 3.0 is the value leader at roughly a third to half the cost of comparable tiers elsewhere; Veo's fast mode is mid-priced; Runway's credit subscriptions are predictable but can pinch on heavy iteration. For a three-minute short, the difference between models can be the difference between iterating freely and rationing takes — and rationed takes show on screen.</p>

<h2>Worth watching: Seedance, Wan, and the open-weight wave</h2>
<p>Two names belong on your radar even though they aren't the headline three. ByteDance's Seedance 2.0 sits at or near the top of the public leaderboards, but access remains limited — a leaderboard score you can't buy is a research result, not a tool. And Alibaba's Wan line has quietly become the workhorse of cost-conscious AI filmmaking: open-weight, fast, and cheap enough to iterate without fear. It won't beat Veo on single-shot polish, but for drafts, previz, and high-volume projects it's the best value in the field.</p>

<h2>The workflow that actually works</h2>
<p>The filmmakers producing the strongest work in 2026 aren't loyal to one model — they route shots. A typical pipeline: block the film in a cheap fast model (Wan), generate hero shots in whichever model suits each shot (Kling for motion, Veo for beauty shots, Runway where the camera move is the point), then finish with a real edit, grade, and sound pass. The model is a lens, not a religion. Own the cut.</p>

<h2>Verdict</h2>
<p><strong>Choose Kling 3.0</strong> for motion-heavy films and the best cost-to-quality ratio. <strong>Choose Runway Gen-4.5</strong> if directorial control and an integrated workflow matter more than raw output. <strong>Choose Veo 3.1</strong> for maximum single-shot polish and native audio. And if you're migrating off Sora with a deadline: Veo is the closest like-for-like replacement, Kling is the budget-safe one.</p>

<h2>Where the finished films go</h2>
<p>Whichever model you shoot on, the harder problem is what happens after: great AI films get three seconds in a feed and disappear. That's the problem RevaultAI exists to fix — a curated gallery for AI-generated films where the work is shown with intention and creators keep 80% of net revenue. We're selecting a small founding cohort of filmmakers right now. If you're making work you're proud of, <a href="/founding-creators">apply as a founding creator</a> — every submission gets a personal review and a reply either way.</p>
`,
  },
];

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug) || null;
}