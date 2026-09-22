// src/blog/posts.js — blog content lives here as plain data.
// To publish a new post: add an object to POSTS (newest first), push. The
// blog index, post pages, SEO tags, and sitemap all pick it up automatically.

export const POSTS = [
  {
    slug: "edit-ai-video-clips-premiere-resolve",
    title: "How to Turn AI Video Clips Into an Edit in Premiere Pro or DaVinci Resolve",
    seoTitle: "How to Edit AI Video Clips in Premiere Pro or DaVinci Resolve (2026)",
    description:
      "How to edit AI video clips together: rename takes, match frame rates, build a rough cut, then import an EDL into Premiere Pro or DaVinci Resolve.",
    date: "2026-09-21",
    author: "Richard Garland",
    category: "Guides",
    readingTime: "9 min",
    faq: [
      ["Can I edit AI video clips in DaVinci Resolve for free?", "Yes. Resolve's free edition opens EDLs and cuts a timeline together at no cost — you only pay if you need Studio-only features like certain codecs or extra noise reduction. Import your clips into the Media Pool, then use File > Import > Timeline to bring in the EDL."],
      ["What is a CMX 3600 EDL?", "A CMX 3600 EDL is a plain-text file that lists cut decisions — which clip, which in and out points, and where each piece lands on a timeline — without containing any video itself. It's an old broadcast format, but it's still the one nearly every editor, including Resolve and Premiere Pro, can read, which makes it a reliable way to move a cut between AI generation tools and a real editing app."],
      ["Why are my shots offline after importing an EDL?", "An EDL names each clip by filename but doesn't carry the media itself, so if the editor can't find a file with a matching name in the location it expects, that shot shows up offline. In Premiere Pro, right-click the offline clip, choose Link Media, and point it at the folder holding your clips. In Resolve, importing the clips into the Media Pool before importing the EDL usually links them automatically, since Resolve matches by filename."],
      ["Can I import an EDL into CapCut?", "No. CapCut and most mobile and consumer editors don't support EDL import, so an EDL built for Resolve or Premiere Pro won't open there. Work from a plain-text cut list instead — which clip, which in and out points, and which order — and rebuild the sequence by hand using that as a guide."],
    ],
    content: `
<p>AI generation doesn't hand you a scene. It hands you a folder: twenty-three files with names like <code>gen_8841_v3.mp4</code>, running anywhere from four to fifteen seconds, some at 24fps and some at 30, half of them rejects you almost deleted. Somewhere in that folder is your scene — but nothing about the folder tells you where.</p>

<p>Turning that pile into a cut you can watch is a real step, with its own tools and its own failure points, and it's the step most AI filmmaking guides skip. This one doesn't. It covers the manual workflow in full — good to know even if you never touch RevaultAI — and then the shortcut we built once we got tired of doing it by hand.</p>

<h2>Why AI Video Clips Are Hard to Edit</h2>

<p>A few things make a folder of AI generations a worse starting point than raw footage from a shoot, not just a smaller one.</p>

<p><strong>The filenames carry no information.</strong> A camera or phone at least names files in the order it shot them. A generation tool usually names files by job ID, so <code>gen_8841_v3.mp4</code> tells you nothing about which shot it belongs to or where it falls in the scene. You're reconstructing shot order from memory, not reading it off the file list.</p>

<p><strong>Lengths are arbitrary and rarely match what the scene needs.</strong> You asked for eight seconds; the model gave you eight seconds of an action that resolves in three. The rest is dead air, a held frame, or the shot quietly falling apart. Every clip needs to be trimmed before it's usable, not just placed.</p>

<p><strong>Frame rates aren't guaranteed to match.</strong> Different models, or the same model on different runs, can hand back clips at different frame rates — 24fps next to 30fps next to something in between. Nothing in the filename or thumbnail tells you this. It only shows up once you're cutting and something lands a few frames off from where you placed it.</p>

<p><strong>The best moment is often hidden inside a take you rejected.</strong> This is the one that costs people the most footage. A take fails because a hand drifts at the six-second mark — but the first two seconds, before it drifts, are clean. Most people watch a failed take, see the failure, and throw the whole eight seconds away. The usable fragment goes with it. See <a href="/blog/why-ai-video-generations-fail">why AI video generations fail</a> for more on how and where that drift tends to start — it's rarely the whole clip, and knowing where it starts is exactly what tells you where to cut.</p>

<h2>The Manual Workflow, Done Properly</h2>

<p>None of this requires special software. It's the same discipline an editor applies to any footage — it just matters more here, because AI clips give you fewer cues for free.</p>

<h3>1. Collect every take, including rejects, and rename them in shot order</h3>

<p>Pull every generation for the scene into one folder — keepers and rejects both, for the reason above. Then rename them to reflect shot order and take number: <code>01_wide_take1.mp4</code>, <code>01_wide_take2.mp4</code>, <code>02_closeup_take1.mp4</code>, and so on. This is tedious and worth doing anyway. A consistent naming scheme is the difference between an edit you can navigate and a folder you have to re-watch from scratch every time you lose your place.</p>

<h3>2. Check each clip's frame rate before you build a timeline</h3>

<p>Before you touch an edit, check what frame rate each clip actually is. Most editors show this in a media browser or clip properties panel. Count how many clips share each rate, and set your project or sequence to whichever rate most of your clips are already at — don't default to 24 or 30 out of habit if your footage doesn't match.</p>

<p>The reason this matters: a timeline runs at one rate, and every clip on it gets mapped onto that rate's frames. A clip generated at a different rate than the timeline has to be stretched or resampled to fit, and that resampling is what makes a cut land a few frames early or late — a flinch that lands just after the punch instead of on it, a door that closes a beat after the sound of it closing. It's rarely dramatic, but it's exactly the kind of thing that makes a cut feel slightly wrong without an obvious cause. Setting the timeline to match your majority frame rate first, and flagging the odd clips out, avoids chasing that problem after the fact.</p>

<h3>3. Watch each clip for usable stretches and mark in and out points</h3>

<p>Watch every clip start to finish, including rejects, and mark where it's actually usable — not just where it starts and ends. The best moment in a clip is often in the middle, a second or two before whatever caused you to reject it: before a face starts to drift, before a hand loses its shape, before the camera move overshoots. Marking a tight in and out point around that stretch, rather than using the clip's full length, is usually what turns a failed take into a usable shot.</p>

<h3>4. Assemble a rough cut in order, then note what's missing</h3>

<p>Lay your marked selects onto the timeline in story order. Don't worry about transitions or polish — the goal here is a rough cut, a sequence of the right shots in the right order at roughly the right length, so you can see the scene as a whole for the first time. Once it's assembled, the gaps are obvious: a reaction shot you never generated, an insert that would smooth a jump cut, a line of dialogue with no coverage. Write those down. That list is your next generation batch, not a vague sense that "something's missing."</p>

<h2>What an EDL Actually Is</h2>

<p>Once you've got a cut worth keeping — whether you built it by hand or with something else — you'll usually want it in a real editor rather than stuck wherever you assembled it. That's what an EDL is for.</p>

<p>An <strong>EDL</strong> (Edit Decision List) is a plain-text file that records cut decisions: which clip, which in and out points within that clip, and where the resulting piece lands on a timeline. It doesn't contain any video — it's a list of instructions, not footage. That means the clips it refers to have to sit in a folder the editor can find, with filenames that match what the EDL expects; the EDL and the media are two halves of the same delivery.</p>

<p>The format almost every editor reads is <strong>CMX 3600</strong>, a decades-old broadcast standard that's outlived several generations of editing software because it's simple and nearly universal. If you want your cut to open in someone else's editor — or your own, on a different machine — a CMX 3600 EDL alongside your clips is the most portable way to hand it over.</p>

<h2>Opening an EDL in Resolve, Premiere Pro, and Elsewhere</h2>

<p>Exact menu names shift a little between versions, but the shape of the process is stable.</p>

<p><strong>DaVinci Resolve:</strong> Import your clips into the Media Pool first, before you touch the EDL — Resolve links each shot in the EDL to a clip by matching filenames, so the clips need to already exist in your project. Then go to File > Import > Timeline and choose the EDL. If everything's named consistently, the timeline builds itself with every shot already placed and trimmed.</p>

<p><strong>Premiere Pro:</strong> File > Import and select the EDL file. Premiere will ask you to confirm a sequence frame rate as it builds the timeline — set it to match your clips' actual rate, not a default. If any shots come in offline (a red slate instead of the clip), right-click the offline clip and choose Link Media, then point it at the folder holding your footage.</p>

<p><strong>CapCut and most mobile editors:</strong> these don't import EDLs at all. If you're cutting on a phone or in a consumer app without EDL support, work from a written cut list instead — clip name, in and out points, and order — and rebuild the sequence by hand using that as your guide.</p>

<h2>The Shortcut: RevaultAI Finish</h2>

<p>We built <a href="/tools">Finish</a> because we were doing the workflow above by hand, on our own films, and got tired of it. It doesn't replace an editor — it does the part before the editor, the part this article has walked through manually.</p>

<p>Finish works on clips generated on RevaultAI within a project — keepers and rejects alike. It doesn't take uploaded footage yet, so it's a fit for a scene you generated here, not a folder from somewhere else.</p>

<p>Point it at a project and it reads every clip, roughly once a second, for usable stretches, for defects with their timings, and for the single best moment in each take — including the rejects, which is where a lot of the value in a failed generation usually sits. From that reading it assembles an ordered rough cut with in and out points already marked, a reason for each shot it chose, and a list of the shots still missing from the scene, each with a ready-to-use generation prompt. You can watch the assembled cut in the browser before you export anything.</p>

<p>When it's ready, "Download the edit" gives you one zip: the clips under clean, ordered names, a CMX 3600 EDL, a plain-text cut sheet for CapCut and other editors that don't read EDLs, and import instructions. It reads each clip's real frame rate from the file itself and names any clips whose rates differ from the rest, rather than silently letting them land a few frames off the way an unchecked mismatch would. It's free while it's new.</p>

<div class="cta-inline">
<strong>Try Finish on a Project</strong>
<p>Turn a project's takes — keepers and rejects — into a rough cut and an edit that opens already trimmed in Resolve or Premiere Pro. Free while it's new. Sign-in required.</p>
<a class="cta-btn" href="/tools">See Finish on the Tools Page</a>
</div>

<h2>Honest Limits</h2>

<p>Whether you build the cut by hand or with Finish, be clear-eyed about what you end up with. It's a rough cut — an ordered, trimmed sequence you refine from here, not a finished film. It's cuts only: no transitions, no color, no sound mix. And an EDL holds a single frame rate; if your scene mixes rates, check the affected shots after import, or conform your clips to one rate before you rely on the timeline's timing.</p>

<p>Keeping characters, wardrobe and props consistent from shot to shot matters as much once you're editing as it did while you were generating — a cut can't paper over a continuity break the way a single shot sometimes can. If drift is showing up across your takes, <a href="/blog/ai-video-character-consistency">how to keep characters consistent in AI video</a> covers the causes and the fixes in more depth.</p>

<h2>Frequently Asked Questions</h2>

<h3>Can I edit AI video clips in DaVinci Resolve for free?</h3>
<p>Yes. Resolve's free edition opens EDLs and cuts a timeline together at no cost — you only pay if you need Studio-only features like certain codecs or extra noise reduction. Import your clips into the Media Pool, then use File > Import > Timeline to bring in the EDL.</p>

<h3>What is a CMX 3600 EDL?</h3>
<p>A CMX 3600 EDL is a plain-text file that lists cut decisions — which clip, which in and out points, and where each piece lands on a timeline — without containing any video itself. It's an old broadcast format, but it's still the one nearly every editor, including Resolve and Premiere Pro, can read, which makes it a reliable way to move a cut between AI generation tools and a real editing app.</p>

<h3>Why are my shots offline after importing an EDL?</h3>
<p>An EDL names each clip by filename but doesn't carry the media itself, so if the editor can't find a file with a matching name in the location it expects, that shot shows up offline. In Premiere Pro, right-click the offline clip, choose Link Media, and point it at the folder holding your clips. In Resolve, importing the clips into the Media Pool before importing the EDL usually links them automatically, since Resolve matches by filename.</p>

<h3>Can I import an EDL into CapCut?</h3>
<p>No. CapCut and most mobile and consumer editors don't support EDL import, so an EDL built for Resolve or Premiere Pro won't open there. Work from a plain-text cut list instead — which clip, which in and out points, and which order — and rebuild the sequence by hand using that as a guide.</p>
`,
  },
  {
    slug: "how-to-choose-ai-video-model-for-shot",
    title: "How to Choose the Best AI Video Model for Your Shot",
    seoTitle: "How to Choose the Best AI Video Model for a Shot (2026)",
    description:
      "Choose the best AI video model for a shot by matching dialogue, duration, motion, difficulty and cost — not a ranking. A shot-first checklist for AI filmmakers.",
    date: "2026-09-20",
    author: "Richard Garland",
    category: "Guides",
    readingTime: "12 min",
    faq: [
      ["What is the best AI video model?", "There isn't one best model — there's a best model for each shot. Among the models you can generate with on RevaultAI, Veo 3.1 is the pick for close-ups and spoken lines, Kling 3.0 for fast action and dense crowds, Seedance for camera control, physics and (Seedance 2.5) takes up to 30 seconds, and Wan 2.6 for cheap iteration on simple single-subject shots. Describe the shot you actually need to make and choose from there."],
      ["Should I use the same AI model for every shot?", "Not necessarily. Shots in the same film often make very different demands — a dialogue close-up, a chase and a long unbroken camera move don't ask for the same things — so many filmmakers route each shot to the model that fits it and use a cheaper model to block the film first. The trade-off is that different models can render with a slightly different look, so test how your chosen models cut together before committing to a mixed-model scene."],
      ["Which model is best for dialogue?", "Dialogue needs a model with native audio. On RevaultAI that means Veo 3.1 and Seedance 2.0 or 2.5; Wan 2.6 and Kling 3.0 don't generate audio. Veo 3.1 is the strongest fit for a close-up with a spoken line but tops out at 8 seconds, so longer spoken exchanges are a job for Seedance, which supports up to 15 seconds on 2.0 and up to 30 on 2.5. Put the spoken line in quotes in your prompt."],
      ["Which model is best for cinematic camera movement?", "For complex, deliberate camera moves, Seedance is the strongest fit — director-level camera language works on it, and Seedance 2.5 can hold a developing move for up to 30 seconds without a cut. Veo 3.1 responds well to detailed cinematography for shorter shots. If the subject is moving fast, Kling 3.0 works best with a simple camera, because a complex move competes with the subject motion."],
      ["Does AI video generation cost depend on the model?", "Yes. On RevaultAI credits are charged per second of output, and the rate depends on the model: Wan 2.6 is 1 credit per second, Kling 3.0 is 2, Seedance 2.0 is 3 at draft and 6 at flagship, Veo 3.1 is 4, and Seedance 2.5 is 6 at draft and 12 at flagship. The cost of a take is the rate multiplied by its duration, so an 8-second Veo 3.1 take costs 32 credits and a 30-second Seedance 2.5 flagship take costs 360."],
    ],
    content: `
<p>The best AI video model for a shot is rarely the model at the top of a ranking. A close-up of someone speaking, a courier sprinting through a crowded market and a thirty-second unbroken camera move each ask for something different, and today's AI video generation models are strong at different things. Pick by the shot, and most of the decision makes itself.</p>

<p>This guide is a decision process, not an AI video model comparison. It covers the questions that decide which model fits a shot — dialogue, duration, motion, difficulty and cost — using the five models you can generate with on RevaultAI: Wan 2.6, Kling 3.0, Seedance 2.0, Seedance 2.5 and Veo 3.1. If you want the named-model comparison instead, start with <a href="/blog/kling-vs-runway-vs-veo-best-ai-video-model-filmmakers-2026">Kling 3.0 vs Runway Gen-4.5 vs Veo 3.1</a> (which also covers Runway, one of the models we don't generate with) or the <a href="/blog/which-ai-video-model-to-use-seedance-veo-kling-wan">Seedance, Veo, Kling and Wan overview</a>. This article picks up where those stop: you have a specific shot, and you need to know what to generate it with.</p>

<h2>Stop Asking “Which Model Is Best?”</h2>

<p>“Which AI video model should I use?” is the most common question in AI filmmaking, and it can't be answered as asked, because a model isn't a quality level. It's a set of trade-offs. The ranking you'll find at the top of a leaderboard averages across many kinds of shots; your shot is one kind.</p>

<p>Look at how the models available on RevaultAI actually differ:</p>

<ul>
<li><strong>Veo 3.1</strong> generates native audio and lip-synced dialogue alongside the picture, and it's the right choice for close-ups, spoken lines and hero shots that need to look expensive. It also caps at 8 seconds and isn't the best pick for fast action or large crowds.</li>
<li><strong>Kling 3.0</strong> is the motion specialist — fast action, chases, physical performance and dense crowds hold together where other models smear. It doesn't generate audio and caps at 10 seconds.</li>
<li><strong>Seedance 2.0</strong> brings director-level camera control, real-world physics and native audio, at either draft (480p) or flagship (720p) resolution.</li>
<li><strong>Seedance 2.5</strong> adds the longest single takes available — up to 30 seconds of continuous footage — and is by far the most expensive per second at flagship.</li>
<li><strong>Wan 2.6</strong> is the fastest and cheapest, and works best with one clear subject doing one clear action. It's where you block a film, not where you finish a crowd scene.</li>
</ul>

<p>Every one of those is the right answer for some shot and the wrong answer for another. The “Veo vs Kling vs Seedance” argument is really an argument about which shot each person happened to be making that week. So change the question. Not “which model is best?” but “what does this shot need, and which model gives me that at a cost I can afford to iterate on?”</p>

<h2>Start With the Shot Requirements</h2>

<p>Before you look at a single model, write down what the shot demands. Nine requirements do most of the work when you choose an AI video model:</p>

<ul>
<li><strong>Dialogue and audio.</strong> Does anyone speak, or does the shot need synchronized sound? Only Veo 3.1 and the Seedance models generate native audio on RevaultAI. Wan 2.6 and Kling 3.0 don't, which rules them out for spoken lines before anything else is considered.</li>
<li><strong>Character count.</strong> One subject is the easy case, and Wan 2.6 handles it cheaply. Several characters in the same frame raise the difficulty for every model, and Wan in particular is weakest with multiple simultaneous events.</li>
<li><strong>Camera movement.</strong> A locked-off shot has almost no constraint. A complex, deliberate move — a crane, an orbit, a developing push — favors Seedance, where director-level camera language works. On Kling 3.0 keep the camera simple, because a complicated move competes with the subject motion.</li>
<li><strong>Duration.</strong> Every model has a ceiling, and the ceilings are very different. This often decides the shot on its own — see the next sections.</li>
<li><strong>Physical interaction.</strong> Fights, collisions, fabric, liquids and props being handled. Kling 3.0 holds physical performance together, and Seedance is built around real-world physics.</li>
<li><strong>Reference image.</strong> If you already have the frame the shot should start from, Generate accepts an optional starting frame, which removes a lot of guesswork about composition, wardrobe and set. One detail: with Kling 3.0 the aspect ratio is taken from the starting image rather than chosen separately.</li>
<li><strong>Aspect ratio.</strong> Veo 3.1 supports 16:9 and 9:16 only. Wan 2.6 and Kling 3.0 add 1:1, and the Seedance models add 21:9.</li>
<li><strong>Motion complexity.</strong> Fast, dense, many-bodies motion points to Kling 3.0. Quiet, close, held moments — a face, a small gesture — point to Veo 3.1 or, when budget matters more, Wan 2.6.</li>
<li><strong>Realism and stylization.</strong> Veo 3.1 is described as the best all-round image quality, and Seedance is strongest where real-world physics has to look right. Nothing in the model data singles out any model as the stylized one, so treat a stylized look as something to test on a cheap tier rather than assume.</li>
</ul>

<p>Five minutes on this list before you generate usually saves more credits than any prompt trick. If you're working from a script rather than a single idea, break the scene into a shot list first — <a href="/blog/how-to-break-script-into-shots-ai-video">how to break a script into shots</a> covers that — and run each shot through the list on its own.</p>

<h2>Difficulty Matters</h2>

<p>Two shots can both be “a person, eight seconds, cinematic” and be completely different levels of work for a model. The requirements above tell you what a shot needs; difficulty tells you how likely it is to go wrong, and therefore how many takes you should expect to spend. Some things reliably raise it:</p>

<ul>
<li><strong>Hands.</strong> Hands have many small joints in constant relative motion, which is the combination current models handle least reliably. A hand in the background is one thing; a hand that's the subject of the frame is another.</li>
<li><strong>Small objects.</strong> A hand handling a pen, a key or a card asks the model to resolve two shapes making convincing contact. Small props also have to stay the same object from the first frame to the last.</li>
<li><strong>Crowds.</strong> Background figures need consistent, plausible behavior for the whole take. A crowd multiplies the number of things that can drift.</li>
<li><strong>Multiple characters.</strong> More than one character raises difficulty, especially when they touch, cross paths or block each other. Each one is another identity the model has to hold.</li>
<li><strong>Reflective surfaces.</strong> Mirrors, glass, water and polished metal have to stay coherent with everything they reflect, which the model has to invent frame by frame.</li>
<li><strong>Dialogue.</strong> Speech adds lip sync on top of everything else in the frame, so a talking shot is harder than the same shot in silence.</li>
<li><strong>Long takes.</strong> The longer a shot runs relative to the model's limit, the more frames can drift. Ten seconds is a moderate ask on a model that goes to fifteen and a demanding one on a model that stops at ten.</li>
</ul>

<p>These stack. A single character with a locked camera in a quiet room is easy. The same character holding a glass of wine, in front of a mirror, delivering a line, is three difficulty factors in one frame. Notice how many your shot has before you generate, and you can respond in advance: pick a stronger model, budget for more takes, or change the shot (more on that below). Difficulty is also relative to the model — a 15-second take is at the ceiling for Seedance 2.0 and only halfway for Seedance 2.5.</p>

<p>If a shot has already failed and you're not sure why, paste the prompt into <a href="/autopsy">Generation Autopsy</a> for a diagnosis, and see <a href="/blog/why-ai-video-generations-fail">why AI video generations fail</a> for the common causes.</p>

<h2>Duration Can Eliminate Models Immediately</h2>

<p>Duration is the fastest filter, because it's a hard limit rather than a preference. These are the durations each model supports in RevaultAI's generator today:</p>

<ul>
<li><strong>Wan 2.6</strong> — 5, 10 or 15 seconds</li>
<li><strong>Kling 3.0</strong> — 5 or 10 seconds</li>
<li><strong>Seedance 2.0</strong> (draft and flagship) — 5, 10 or 15 seconds</li>
<li><strong>Seedance 2.5</strong> (draft and flagship) — 5, 10, 15 or 30 seconds</li>
<li><strong>Veo 3.1</strong> — 4, 6 or 8 seconds</li>
</ul>

<p>They're fixed options, not a slider, and a few things follow from that:</p>

<ul>
<li>A shot that has to run longer than 8 seconds eliminates Veo 3.1.</li>
<li>Longer than 10 seconds eliminates Kling 3.0 as well.</li>
<li>Longer than 15 seconds leaves exactly one option: Seedance 2.5, at draft or flagship. Nothing else generates a 30-second take here.</li>
<li>4 and 6 seconds exist only on Veo 3.1. Every other model starts at 5.</li>
</ul>

<p>Duration also cuts the other way. Choose the shortest supported duration that serves the shot, not the longest the model allows — you pay per second, and a shorter take is a shorter time for something to go wrong.</p>

<p>Aspect ratio is a second hard filter. A 21:9 frame leaves only the Seedance models, and a 1:1 frame rules out Veo 3.1. A shot that must be vertical or square is worth checking against the model's ratios before you write the prompt, not after.</p>

<p>The models that survive both filters are your shortlist. Whether a shot has to stay unbroken matters here: a long take that can't cut has very few options, while a shot you're free to cut can be split into shorter pieces that open up more of them.</p>

<h2>Consider Cost Per Shot</h2>

<p>On RevaultAI, credits are charged per second of output and priced by model, so the cost of any take is the per-second rate multiplied by its duration. The current rates:</p>

<ul>
<li><strong>Wan 2.6</strong> — 1 credit per second (a 5-second take is 5 credits)</li>
<li><strong>Kling 3.0</strong> — 2 credits per second (10 seconds is 20)</li>
<li><strong>Seedance 2.0 Draft (480p)</strong> — 3 credits per second (5 seconds is 15)</li>
<li><strong>Veo 3.1</strong> — 4 credits per second (8 seconds is 32)</li>
<li><strong>Seedance 2.0 Flagship (720p)</strong> — 6 credits per second (5 seconds is 30)</li>
<li><strong>Seedance 2.5 Draft (480p)</strong> — 6 credits per second (10 seconds is 60)</li>
<li><strong>Seedance 2.5 Flagship (720p)</strong> — 12 credits per second (10 seconds is 120)</li>
</ul>

<p>The cheapest model and the best value are often different models. The cheapest option is the lowest cost per take; the best value is the lowest cost per <em>usable</em> take. Say a fast chase through a crowd takes six attempts on a model that struggles with crowds, and two on one built for them. Those numbers are illustrative, not measured, but the arithmetic is the point: six takes at 5 credits is 30 credits, and two takes at 10 is 20. The cheap model was more expensive.</p>

<p>The same logic runs the other way. If a shot is simple — one subject, one clear action, a static camera — paying flagship rates is waste, and Wan 2.6 at 1 credit per second is a good place to spend most of your takes. A useful habit is to keep track of credits per keeper, not credits per take.</p>

<p>The draft tiers exist for exactly this. Both Seedance versions have a 480p draft at half the per-second rate of the 720p flagship. Draft output is for testing a shot, not for final delivery: prove that a 30-second take holds together at 180 credits, and only then commit 360 to the flagship version. A generation that fails outright is refunded, but one that completes and simply isn't what you wanted still costs what it costs — which is the strongest argument for testing before you spend.</p>

<h2>One Film Can Use Multiple Models</h2>

<p>Nothing says a film has to be made on one model. Shots in the same scene make different demands, and AI filmmaking models are strong in different places, so a common workflow is to route each shot to the model that fits it. A single short scene might go like this:</p>

<ul>
<li><strong>Block it cheap.</strong> Rough out framing, timing and action on Wan 2.6, at 5 credits for a 5-second take, until you know what each shot actually is.</li>
<li><strong>The chase.</strong> Generate the crowded, fast-moving shot on Kling 3.0, which holds fast action and crowds together (10 seconds is 20 credits).</li>
<li><strong>The spoken line.</strong> Generate the close-up on Veo 3.1, which produces the dialogue with the picture (8 seconds is 32 credits).</li>
<li><strong>The unbroken reveal.</strong> Prove the long, developing camera move on Seedance 2.5 Draft first, then re-run it at flagship if it holds.</li>
<li><strong>Everything simple.</strong> Inserts, cutaways and quiet establishing shots stay on the cheapest model that does the job.</li>
</ul>

<p>Routing shots this way means you pay flagship rates only where the shot needs them. The honest trade-off is that different models can render with a slightly different look, so cutting between them takes care. Test a mixed sequence before you commit to it, and lean on cuts — a change of angle, an insert — to carry the switch rather than swapping models mid-action.</p>

<p>A shot list makes this workable: <a href="/scene-breakdown">Scene Breakdown</a> turns a scene into numbered shots with camera, lighting and duration, and each one can then be assigned a model on its own merits.</p>

<h2>When to Simplify the Shot Instead</h2>

<p>Sometimes no model is a good answer, and the right move is to change the shot rather than search harder for a model. Four fixes come up repeatedly:</p>

<ul>
<li><strong>Shorten the take.</strong> If a shot only works as a long take because you assumed it had to be one, shorten it. Fewer seconds means fewer frames to drift, and it often puts more models back in play.</li>
<li><strong>Split the action.</strong> One shot holding a character crossing a room, picking something up <em>and</em> speaking is really three shots. Split it, and each piece gets easier and can go to whichever model suits it.</li>
<li><strong>Use a reference frame.</strong> Generating from a starting frame instead of a description removes guesswork about composition and wardrobe. <a href="/frame-planner">Frame Planner</a> helps you decide where a shot starts and where it lands, with an image prompt for each frame, and the opening frame can go straight into image-to-video from Generate.</li>
<li><strong>Simplify the blocking.</strong> Cut the second character, put the hand out of frame, move the camera less, or stop the subject before they touch the prop. A shot that suggests the action often reads as well as one that shows all of it.</li>
</ul>

<p>These are also the fixes to try before spending more credits on a shot that keeps failing. If the same thing breaks on every take, the shot is usually the problem, not the model.</p>

<h2>A Practical Model-Selection Checklist</h2>

<p>Run any shot through this before you generate. It takes about a minute.</p>

<ul>
<li><strong>Audio:</strong> Does anyone speak, or does it need synchronized sound? If yes, shortlist Veo 3.1 or Seedance only.</li>
<li><strong>Length:</strong> How long must the take be, and can it cut? Over 8 seconds removes Veo, over 10 removes Kling, over 15 leaves only Seedance 2.5.</li>
<li><strong>Frame:</strong> Which aspect ratio does it need? 21:9 means Seedance; 1:1 rules out Veo.</li>
<li><strong>Subjects:</strong> How many characters, and does anyone touch or cross paths? Are there crowds?</li>
<li><strong>Motion:</strong> Is the action fast or physical (Kling 3.0, Seedance) or quiet and close (Veo 3.1, Wan 2.6)?</li>
<li><strong>Camera:</strong> Is the move complex and deliberate (Seedance) or simple (anything, and best for Kling)?</li>
<li><strong>Start:</strong> Do you have a reference frame you can start from?</li>
<li><strong>Difficulty:</strong> Count the hard factors — hands, small objects, crowds, multiple characters, reflective surfaces, dialogue, long takes. Two or more means budget extra takes or simplify.</li>
<li><strong>Cost:</strong> Multiply the per-second rate by the duration. Would a draft tier prove it first?</li>
<li><strong>Fallback:</strong> If nothing fits, can you shorten it, split it, use a reference frame or simplify the blocking?</li>
</ul>

<h2>Use RevaultAI Which Model?</h2>

<p>You can run that checklist by hand, or let <a href="/which-model">Which Model</a> do the first pass. You describe the shot in plain language — a sentence or two, up to 800 characters — and it returns:</p>

<ul>
<li><strong>Two or three ranked recommendations.</strong> Rank one is the best fit, not the most expensive model. If a cheap model genuinely does the job, it ranks first.</li>
<li><strong>The reason for each pick</strong>, written about your shot specifically rather than the model in general, plus <strong>one honest trade-off</strong> — what you give up by choosing it.</li>
<li><strong>A suggested duration</strong> — always one the model actually supports, and the shortest one that serves the shot.</li>
<li><strong>The real credit cost</strong> for that model and duration, calculated from the same rates the generator charges rather than estimated.</li>
<li><strong>A difficulty score out of 10</strong>, with a label, the <strong>factors</strong> most likely to break the shot, what's straightforward about it, and, when it helps, a <strong>practical suggestion</strong> — splitting the shot, shortening the take, using a reference frame or simplifying the action.</li>
</ul>

<p>Only models you can generate with on RevaultAI are ever recommended: Wan 2.6, Kling 3.0, Seedance 2.0 and 2.5 (draft and flagship tiers) and Veo 3.1. If a shot is hard for every one of them, it says so instead of forcing a pick. The reasoning is written by an AI advisor working from the app's model catalog, while durations and credit costs come from that catalog directly, so it can't quote a price or a length the generator doesn't offer. Treat it as an informed starting point, not a verdict.</p>

<p>If you're signed in, it also shows your own record: for models you've generated with at least a few times, how many takes you approved, roughly what each keeper cost in credits, and what you most often rejected them for. That comes from your own approvals, not a global leaderboard, and small samples say less — treat anything under ten attempts as a hint.</p>

<p>When you're ready, each recommendation has a button that takes you to <a href="/generate">Generate</a> with that model already selected. Signed-out visitors are asked to sign in first, since generating uses credits. The handoff sets the model, not the prompt or the duration, so write your prompt and set the suggested duration there. If you don't have a prompt yet, <a href="/scene-breakdown">Scene Breakdown</a> will write one for each shot.</p>

<div class="cta-inline">
<strong>Find the Right Model for Your Shot</strong>
<p>Describe the shot and get ranked model recommendations with a suggested duration, the real credit cost, trade-offs and a difficulty score. Free. No account required.</p>
<a class="cta-btn" href="/which-model">Which Model Should I Use?</a>
</div>

<h2>Frequently Asked Questions</h2>

<h3>What is the best AI video model?</h3>
<p>There isn't one best model — there's a best model for each shot. Among the models you can generate with on RevaultAI, Veo 3.1 is the pick for close-ups and spoken lines, Kling 3.0 for fast action and dense crowds, Seedance for camera control, physics and (Seedance 2.5) takes up to 30 seconds, and Wan 2.6 for cheap iteration on simple single-subject shots. Describe the shot you actually need to make and choose from there.</p>

<h3>Should I use the same AI model for every shot?</h3>
<p>Not necessarily. Shots in the same film often make very different demands — a dialogue close-up, a chase and a long unbroken camera move don't ask for the same things — so many filmmakers route each shot to the model that fits it and use a cheaper model to block the film first. The trade-off is that different models can render with a slightly different look, so test how your chosen models cut together before committing to a mixed-model scene.</p>

<h3>Which model is best for dialogue?</h3>
<p>Dialogue needs a model with native audio. On RevaultAI that means Veo 3.1 and Seedance 2.0 or 2.5; Wan 2.6 and Kling 3.0 don't generate audio. Veo 3.1 is the strongest fit for a close-up with a spoken line but tops out at 8 seconds, so longer spoken exchanges are a job for Seedance, which supports up to 15 seconds on 2.0 and up to 30 on 2.5. Put the spoken line in quotes in your prompt.</p>

<h3>Which model is best for cinematic camera movement?</h3>
<p>For complex, deliberate camera moves, Seedance is the strongest fit — director-level camera language works on it, and Seedance 2.5 can hold a developing move for up to 30 seconds without a cut. Veo 3.1 responds well to detailed cinematography for shorter shots. If the subject is moving fast, Kling 3.0 works best with a simple camera, because a complex move competes with the subject motion. For more on the moves themselves, see <a href="/blog/ai-video-camera-shots-movements">AI video camera shots and movements</a>.</p>

<h3>Does AI video generation cost depend on the model?</h3>
<p>Yes. On RevaultAI credits are charged per second of output, and the rate depends on the model: Wan 2.6 is 1 credit per second, Kling 3.0 is 2, Seedance 2.0 is 3 at draft and 6 at flagship, Veo 3.1 is 4, and Seedance 2.5 is 6 at draft and 12 at flagship. The cost of a take is the rate multiplied by its duration, so an 8-second Veo 3.1 take costs 32 credits and a 30-second Seedance 2.5 flagship take costs 360.</p>
`,
  },
  {
    slug: "how-to-break-script-into-shots-ai-video",
    title: "How to Break a Script Into Shots for AI Video",
    seoTitle: "How to Break a Script Into Shots for AI Video (2026 Guide)",
    description:
      "How to break a script into shots for AI video: find the dramatic beats, choose coverage, plan camera movement and continuity, and match duration to your model.",
    date: "2026-09-17",
    author: "Richard Garland",
    category: "Guides",
    readingTime: "15 min",
    faq: [
      ["How many shots should a scene have?", "There's no fixed number — it depends on how many dramatic beats the scene contains and how much coverage those beats need to cut together. A short two-person confrontation often lands somewhere between five and twelve shots once you include an establishing shot, singles, reactions and any inserts. A simple one-beat scene might need three. Let the beats set the count, not a target number."],
      ["Should every line of dialogue get its own shot?", "No. A shot list isn't a transcript. If two characters trade several lines without anything changing emotionally or physically, a single held shot can cover all of them. Give a line its own shot when something turns on it — a reveal, a reaction, a decision — not simply because a new line started."],
      ["How long should AI video shots be?", "It depends on the model and on how much is happening in the shot. A simple, mostly static shot can often hold for longer than a shot with a lot of action or camera movement, and different models support different maximum durations. Check your target model's limits before writing the shot, and keep the action simple enough to fit comfortably inside whatever duration you choose."],
      ["What is the difference between a shot list and a storyboard?", "A shot list is the written breakdown — shot number, size, action, camera movement and purpose for every shot in a scene. A storyboard is a visual version of that same plan, usually simple drawings or reference frames showing composition. Many productions use both: the shot list to plan and generate, the storyboard to check composition and continuity before committing."],
      ["Can AI create a shot list from a script?", "Yes, within limits. A tool like RevaultAI's Scene Breakdown can turn a scene or logline into a numbered shot list with shot size, camera movement, a lighting note and a generation prompt for each shot. It's a strong starting point, not a finished decision — you'll still want to read it back against the scene and adjust anything that doesn't serve the story."],
    ],
    content: `
<p>It's tempting to type the whole scene into one prompt and hit generate — she walks in, sees the note on the counter, reads it, and her face falls, all in one eight-second clip. Sometimes it half-works. More often, the model has to guess at a dozen decisions you never actually made: where the camera is standing, how long she looks at the note before it registers, whether we're close enough to see her face when it does. Hand a whole scene to a single prompt and you've quietly handed away the director's job along with it — the model is now blocking the scene, choosing the coverage and pacing the reveal, none of which it has any real basis for doing well.</p>

<p>A script isn't a video prompt. It's closer to a floor plan for a scene that hasn't been shot yet, and turning it into something a model can actually generate well means doing the same job a director does on a physical set: breaking the scene into individual shots, each with its own size, angle, movement and reason for existing. That decomposition is what gives you control — over pacing, over what the audience sees and when, and over how cleanly the pieces cut together afterward. This guide walks through how to do it, starting with the story and ending with the prompt, not the other way around.</p>

<h2>What Does It Mean to Break a Scene Into Shots?</h2>

<p>Three words get used loosely in AI filmmaking conversations, and it's worth pinning them down before going further.</p>

<p>A <strong>scene</strong> is a self-contained unit of story — usually one continuous stretch of time in one location, built around a single dramatic question. "Maya confronts her brother about the missing money" is a scene.</p>

<p>A <strong>dramatic beat</strong> is a turn inside that scene: a moment where something changes. Information gets revealed. An emotion shifts. A decision gets made or avoided. Most scenes are built from several beats stacked in sequence, not one flat stretch of action — the confrontation scene above probably has an entrance beat, a discovery beat, and a confrontation beat, at minimum.</p>

<p>A <strong>shot</strong> is the smallest unit you actually generate: one continuous piece of footage from one camera position, covering one beat, or sometimes part of one. A five-beat scene might need eight or ten shots once you account for the coverage that lets you actually cut it together — the reaction shot, the insert, the over-the-shoulder that wasn't a separate "beat" in the story but is very much a separate shot in the edit.</p>

<p>Generating a scene as a single shot skips two levels of decision-making at once. Break the scene into beats first. Then break each beat into the shots it needs.</p>

<h2>Read the Scene Before Thinking About the AI Model</h2>

<p>Before opening a generation tool, read the scene the way an actor or director would — for what it's actually about, not for what it will cost to render. What does each character want in this moment? What changes between the first line and the last? Where's the turn? A shot list built to serve that intent holds together even if you switch models halfway through production. A shot list built around "what's cheap and fast to generate" often serves neither the story nor, in the end, the budget — shots that don't serve the scene tend to get cut anyway, and by then you've already paid for generations you'll never use.</p>

<p>Model choice is a production decision, not a creative one. It affects <em>how</em> you achieve a shot, not whether the shot belongs in the scene. Decide what the story needs first. Decide which model renders each of those shots best second — that's a separate question, worth its own pass once the shot list exists (more on matching shots to models below).</p>

<h2>Identify the Dramatic Beats</h2>

<p>Once you know what the scene is about, break it into the moments where something changes. A useful general set to check any scene against:</p>

<ul>
<li><strong>Entrance</strong> — a character enters the space, or the scene establishes who's already there.</li>
<li><strong>Discovery</strong> — someone notices, finds or realizes something.</li>
<li><strong>Reaction</strong> — the emotional response to that discovery.</li>
<li><strong>Confrontation</strong> — the conflict the scene exists to stage.</li>
<li><strong>Decision</strong> — a choice gets made, spoken or implied.</li>
<li><strong>Exit</strong> — the scene resolves, or someone leaves.</li>
</ul>

<p>Not every scene uses all six, and not every beat needs its own shot — a decision can land entirely in a held expression without a line of dialogue. What matters is naming the beats before naming the shots. If you can't say which beat a shot is serving, that's usually a sign the shot doesn't need to exist, or that it's quietly trying to cover two beats at once and would work better split in two.</p>

<h2>Decide What the Audience Needs to See</h2>

<p>Not every line of dialogue and not every physical action needs a new shot. A shot list isn't a transcript of the scene — it's a plan for what the camera needs to show, and when.</p>

<p>If two characters trade four lines while standing still in a kitchen and nothing changes between the first line and the last, that can be one static two-shot. If the third line is the one where the accusation actually lands, that line probably earns its own close-up. The test isn't "did something happen" — something is always happening. The test is whether the audience needs a new piece of visual information to understand or feel that moment. Cutting on every line is as much a failure of direction as never cutting at all; both bury the moments that actually matter under a flat rhythm.</p>

<h2>Choose Your Establishing Shot</h2>

<p>An establishing shot orients the audience in space before the scene gets closer. It earns its place when the scene opens a new location, shifts scale, or needs the audience to understand geography before action starts — a character crossing a room only reads clearly if we've already seen the room.</p>

<p>It's unnecessary when the scene continues directly from the location the previous scene just established, when the scene is small and character-driven enough that geography isn't the point, or when withholding space is a deliberate choice — a handheld, in-the-room opening that drops the audience in without orientation, because disorientation is the intended feeling. An establishing shot used out of habit rather than need is usually the first shot worth cutting from a list.</p>

<h2>Build the Necessary Coverage</h2>

<p>Coverage is the set of shots that let an edit actually get made — the options a scene needs beyond whatever the "main" shot is, so a cut can move between them without missing anything the audience needed to see. The standard set, adapted for a single beat or a whole scene:</p>

<ul>
<li><strong>Master</strong> — a wide shot holding the full scene or beat, the safety net an editor can always cut back to.</li>
<li><strong>Medium</strong> — waist-up or similar, the default working distance for most dialogue and action.</li>
<li><strong>Close-up</strong> — isolates a face or detail for emotional weight.</li>
<li><strong>Over-the-shoulder</strong> — frames one character from behind another, establishing the relationship between them in the frame.</li>
<li><strong>Reaction</strong> — holds on a character responding to something, often more important than the thing they're reacting to.</li>
<li><strong>Insert</strong> — a tight shot of an object or detail: a hand, a note, a door lock.</li>
</ul>

<p>Not every scene needs all six for every beat, but a scene with none of them beyond a single master shot gives an editor nothing to cut to if a generation doesn't quite work, or if the pacing needs adjusting later. Planning coverage before generating is cheaper than discovering the gap after the fact — RevaultAI's <a href="/coverage">Coverage Planner</a> takes a scene and works out what an editor will actually need to cut it, including what's easy to forget until it's too late.</p>

<h2>Give Every Shot a Purpose</h2>

<p>Before a shot goes on the list, ask one question: <strong>what new information or emotion does this shot deliver?</strong> If the honest answer is "nothing the previous shot didn't already give the audience," that shot is decoration, not direction — and decoration is exactly where a limited generation budget gets wasted.</p>

<p>A wide shot that repeats the same information as the medium shot before it isn't coverage, it's redundancy. A close-up inserted because "close-ups look cinematic" without a reason tied to the beat is filler. Every shot on a working list should be able to answer the purpose question in one sentence — the reveal, the reaction, the detail, the geography — and if it can't, it either needs a clearer job or it needs to come off the list.</p>

<h2>Plan Camera Movement Carefully</h2>

<p>Camera movement should exist because the scene needs it, not because the model is capable of generating it. A push-in works because it mirrors a character's rising attention on something. A pan works because it's revealing something the audience hasn't seen yet. A locked, static camera is a completely valid choice — often the stronger one — when the point of the shot is stillness, tension, or an uninterrupted read on a performance.</p>

<p>Before adding movement to a shot, ask what it's doing that a static frame wouldn't. "The camera slowly pushes in as she notices" has a reason. "The camera moves" does not. If a shot's camera direction can't be tied to something happening in the story at that moment, it's usually safer — and easier for the model to hold together — locked off. Working through a beat's camera options deliberately, rather than defaulting to movement, is exactly what RevaultAI's <a href="/shot-director">Shot Director</a> is built for: describe the beat and get several distinct directorial approaches to it, including when the right answer is no movement at all.</p>

<h2>Think About Continuity Between Shots</h2>

<p>Once a scene exists as multiple shots instead of one, continuity becomes something you have to actively manage rather than something a single generation handled for you by default. The things worth tracking, shot to shot:</p>

<ul>
<li><strong>Character appearance</strong> — the same face, build and identity from one shot to the next.</li>
<li><strong>Wardrobe</strong> — what they're wearing doesn't drift or reset between shots of the same continuous scene.</li>
<li><strong>Props</strong> — an object held, set down or picked up needs to stay where the story left it.</li>
<li><strong>Location</strong> — the room, lighting fixtures and layout stay consistent across angles.</li>
<li><strong>Lighting</strong> — the direction, quality and color of light shouldn't reset between shots unless the scene has actually moved.</li>
<li><strong>Screen direction</strong> — characters and movement stay on the same side of the frame consistent with where they were looking or heading in the previous shot, so cuts don't flip geography the audience already learned.</li>
</ul>

<p>This is the same discipline covered in more depth in <a href="/blog/ai-video-character-consistency">how to keep characters consistent in AI video</a> — reusing stable descriptions, wardrobe notes and reference frames rather than reinventing the character in every shot's prompt. Once a shot list exists, it's worth reviewing it specifically for continuity before generating anything: RevaultAI's <a href="/continuity-check">Continuity Checker</a> reads a set of shot prompts the way a script supervisor would, flagging characters described two different ways, wardrobe that quietly changes, or lighting that isn't motivated by anything in the scene.</p>

<h2>Match Shot Duration to the Model</h2>

<p>Different AI video models support different maximum durations and handle different amounts of motion and complexity within them. A shot written for a model that comfortably holds ten or fifteen seconds of simple action won't necessarily translate to a model capped closer to five or eight seconds — and cramming that same shot's action into a shorter duration usually means the model compresses or drops part of it rather than slowing down gracefully.</p>

<p>Write the shot's duration with its target model's real limits in mind, not as an afterthought once the prompt is done. A shot that needs to run long is usually a shot that should stay visually simple; a shot with more happening in it needs a duration that actually fits the action, which sometimes means splitting it rather than stretching one model past what it does well. RevaultAI's <a href="/which-model">Which Model</a> tool takes a shot description and scores it against the available models — including how long the shot should realistically run and which model is most likely to deliver that duration cleanly. The duration-versus-complexity trade-off itself is covered in more detail in <a href="/blog/why-ai-video-generations-fail">why AI video generations fail</a>, particularly the sections on shots that ask for too much in too little time.</p>

<h2>Example: Turning One Scene Into a Shot List</h2>

<p>Here's a short scene, written the way it might appear in a script:</p>

<div class="example">Maya lets herself into the apartment, keys still in hand, and stops when she sees the desk drawer pulled open. Papers she hid before she left are scattered across the floor. She kneels and finds the safe-deposit box sitting open and empty. Behind her, the front door she was sure she'd locked creaks further open. She turns — her brother Daniel is standing in the doorway, soaked from the rain, saying nothing.</div>

<p>That's one scene, four beats — entrance, discovery, reaction, and the start of a confrontation. Broken into shots that give an editor something to actually cut:</p>

<div class="example"><strong>Shot 1</strong><br>Size: Wide (master)<br>Action: Maya opens the front door and steps into the dim apartment, keys still in hand.<br>Camera: Locked off, doorway to living room in frame.<br>Purpose: Establishes the location before anything in it is disturbed.</div>

<div class="example"><strong>Shot 2</strong><br>Size: Medium<br>Action: Maya stops mid-step, her focus shifting toward something off in the room.<br>Camera: Static, holds on her.<br>Purpose: Registers that something's wrong before the audience sees what it is.</div>

<div class="example"><strong>Shot 3</strong><br>Size: Insert / close-up<br>Action: The desk drawer, pulled open, papers spilling onto the floor.<br>Camera: Static, slight downward angle.<br>Purpose: Delivers the specific discovery without needing Maya in frame.</div>

<div class="example"><strong>Shot 4</strong><br>Size: Medium close-up<br>Action: Maya kneels beside the scattered papers, hands moving through them.<br>Camera: Slow push-in as she kneels.<br>Purpose: Ties the push-in to her rising urgency rather than moving for its own sake.</div>

<div class="example"><strong>Shot 5</strong><br>Size: Insert / close-up<br>Action: The safe-deposit box, open and empty, in her hands.<br>Camera: Static, shallow depth of field.<br>Purpose: The confirmation beat — the audience learns what's missing the same moment she does.</div>

<div class="example"><strong>Shot 6</strong><br>Size: Close-up<br>Action: Maya's face as the empty box registers.<br>Camera: Static, locked on her expression.<br>Purpose: The reaction shot — this is where the emotional weight of the discovery actually lands.</div>

<div class="example"><strong>Shot 7</strong><br>Size: Medium<br>Action: Maya goes still, the front door visible past her shoulder creaking further open behind her.<br>Camera: Static, held on Maya with the door in soft focus behind her.<br>Purpose: Builds tension through her reaction before revealing its cause.</div>

<div class="example"><strong>Shot 8</strong><br>Size: Wide (reveal)<br>Action: Maya turns; Daniel stands in the doorway, soaked, silent.<br>Camera: Camera pans with her turn to reveal him.<br>Purpose: The confrontation beat — the movement itself controls when the audience learns he's there.</div>

<p>Eight shots, four beats, and not one of them is trying to do more than one job. Compare that to a single prompt asking a model to generate the entrance, the discovery, the kneeling search, the reaction and the reveal all in one continuous take — the same scene, but with the director's decisions left for the model to guess at.</p>

<h2>Use AI to Build the Shot List</h2>

<p>Working through beats, coverage, purpose and continuity by hand is the right way to learn how to do it — but once the habit is there, RevaultAI's <a href="/scene-breakdown">Scene Breakdown</a> tool can do the mechanical part of it for you. Paste in a scene or even just a logline, and it returns a numbered shot list: shot size, camera movement, a lighting note, a suggested duration sized to your target model, and a full director-grade generation prompt for every shot.</p>

<p>The part worth knowing before you rely on it: character and location descriptions are written once and then repeated verbatim across every shot in which they appear, rather than rephrased shot to shot — that repetition is the tool's main continuity mechanism, not a guarantee that the model rendering each shot will hold identity perfectly. From there, any shot can be copied out or handed directly to <a href="/generate">Generate</a> with the model and aspect ratio already set. It's a strong first pass at the shot list, not a replacement for reading the scene the way this guide describes — it still helps to check the output against what the beat actually needs.</p>

<div class="cta-inline">
<strong>Break Your Scene Into Shots</strong>
<p>Turn a scene or logline into a structured, director-ready shot list before you start generating. Free. No account required. No credits required.</p>
<a class="cta-btn" href="/scene-breakdown">Break Down a Scene</a>
</div>

<h2>Frequently Asked Questions</h2>

<h3>How many shots should a scene have?</h3>
<p>There's no fixed number — it depends on how many dramatic beats the scene contains and how much coverage those beats need to cut together. A short two-person confrontation often lands somewhere between five and twelve shots once you include an establishing shot, singles, reactions and any inserts. A simple one-beat scene might need three.</p>

<h3>Should every line of dialogue get its own shot?</h3>
<p>No. A shot list isn't a transcript. If two characters trade several lines without anything changing emotionally or physically, a single held shot can cover all of them. Give a line its own shot when something turns on it — a reveal, a reaction, a decision — not simply because a new line started.</p>

<h3>How long should AI video shots be?</h3>
<p>It depends on the model and on how much is happening in the shot. A simple, mostly static shot can often hold for longer than a shot with a lot of action or camera movement, and different models support different maximum durations. Check your target model's limits before writing the shot, and keep the action simple enough to fit comfortably inside whatever duration you choose.</p>

<h3>What is the difference between a shot list and a storyboard?</h3>
<p>A shot list is the written breakdown — shot number, size, action, camera movement and purpose for every shot in a scene. A storyboard is a visual version of that same plan, usually simple drawings or reference frames showing composition. Many productions use both: the shot list to plan and generate, the storyboard to check composition and continuity before committing.</p>

<h3>Can AI create a shot list from a script?</h3>
<p>Yes, within limits. A tool like RevaultAI's Scene Breakdown can turn a scene or logline into a numbered shot list with shot size, camera movement, a lighting note and a generation prompt for each shot. It's a strong starting point, not a finished decision — you'll still want to read it back against the scene and adjust anything that doesn't serve the story.</p>
`,
  },
  {
    slug: "why-ai-video-generations-fail",
    title: "Why AI Video Generations Fail (and How to Fix Them)",
    seoTitle: "Why AI Video Generation Fails (and How to Fix It)",
    description:
      "Why AI video generation fails isn't usually the model. Learn the real causes — overloaded prompts, conflicting camera direction, too many actions, and how to fix each one.",
    date: "2026-09-15",
    author: "Richard Garland",
    category: "Guides",
    readingTime: "11 min",
    faq: [
      ["Why does AI video ignore parts of my prompt?", "Most models weight a prompt rather than executing it as a strict checklist, and when a shot asks for several things at once, some instructions get less weight than others. The subject's action usually wins over camera behavior, and early details usually win over details buried at the end. If something keeps getting dropped, it's often competing with too many other instructions in the same shot rather than being unclear on its own."],
      ["Why do AI video characters change during a shot?", "Identity has to be reconstructed by the model for every frame rather than tracked the way a camera tracks a real actor. The more the shot asks the character to do — more duration, more movement, more interaction with other characters or objects — the more chances there are for the reconstruction to drift from where it started. Shorter shots, simpler action and a strong reference frame all reduce how much drift has room to happen."],
      ["Why are hands difficult in AI video?", "Hands have many small joints in constant relative motion, and that combination of fine detail and dense motion is exactly what current models handle least reliably. It gets worse the moment a hand interacts with an object, because the model has to resolve two shapes making convincing contact rather than one shape moving on its own. Framing hands smaller, keeping them still, or cutting away from the interaction all lower the risk."],
      ["Should I regenerate or rewrite the prompt?", "Regenerate first if the shot is close — one clean take out of five is a sign the shot is achievable and you just need a better roll. Rewrite if every take fails in the same place, because that's a sign the prompt itself is asking for something the model consistently can't deliver, and no amount of regenerating will fix it."],
      ["When should I split one shot into two?", "Split when a single shot description contains more than one distinct action, more than one camera instruction, or an interaction (a hand on an object, two characters meeting) alongside movement. If you can't describe the shot in one sentence without the word \"and\" doing a lot of work, it's usually two shots."],
    ],
    content: `
<p>You had a clear picture in your head. What came back doesn't match it — an arm bends wrong, the camera drifts somewhere you didn't ask it to, a second character's face never quite resolves. The easy conclusion is "the model is bad." Sometimes that's true. Far more often, the generation was set up to fail before it ever rendered.</p>

<p>AI video models don't execute a prompt like a checklist. They resolve a scene under a limited motion and attention budget, and when a shot asks for more than that budget allows, something gets dropped, blended or distorted — usually not the thing you'd choose. Most "bad generations" trace back to a specific, fixable cause: a prompt doing too much, camera instructions that contradict each other, an action too complex for the shot length, or a reference frame quietly fighting the motion you asked for.</p>

<p>This is a troubleshooting guide, not a list of prompting tricks. Each section below is a distinct failure mode, why it happens, and what to change about the shot — not just the wording — to fix it.</p>

<h2>The Prompt Is Trying to Do Too Much</h2>

<p>The single most common cause of a disappointing generation is a prompt that asks for several outcomes at once and expects all of them to land with equal clarity. Every additional instruction — another action, another camera move, another piece of scene description — competes for the same limited attention. The model doesn't fail loudly when this happens; it quietly deprioritizes something.</p>

<div class="example"><strong>Before:</strong> "A woman walks into the kitchen, opens the fridge, pulls out a bottle of wine, pours a glass, then turns and smiles at someone off-screen while the camera slowly circles her."</div>

<p>That's five distinct actions plus a camera move, asked to happen in one continuous shot. The result is usually a blurred or skipped step — the pour never quite happens, or the smile arrives before she's turned. Splitting the intent fixes it:</p>

<div class="example"><strong>After (Shot 1):</strong> "A woman opens a refrigerator and pulls out a bottle of wine. Static camera, waist-up."<br><br><strong>After (Shot 2):</strong> "The same woman pours wine into a glass on the counter, then looks up and smiles off-screen. Slow camera push-in."</div>

<p>Two clean, achievable shots cut together will almost always beat one overloaded shot — and they're cheaper to iterate on, because a failed five-second shot doesn't need a full re-roll of everything else that worked.</p>

<h2>Your Camera Instructions Conflict</h2>

<p>Camera direction fails less often because it's vague and more often because it's contradictory. A prompt can describe two camera behaviors that cannot both be true, and the model has to pick one — or worse, try to satisfy both and produce something unstable.</p>

<div class="example">"Locked camera" + "camera follows the subject"</div>

<p>A locked camera doesn't move. A camera that follows the subject does. Asked for both, the model might start locked and then drift, might follow erratically, or might average the two into a shot that looks subtly wrong without an obvious cause. This kind of contradiction is often accidental — a prompt built up in pieces, with one clause written early and another added later without checking whether they still agree.</p>

<p>Other common conflicts: "wide shot" paired with framing language that describes a close-up; "the camera stays behind her" paired with an action that requires seeing her face; a static tripod shot paired with "handheld energy." Before generating, read the camera instructions in isolation from the rest of the prompt and ask whether they describe one physical camera doing one thing. If it takes two different camera rigs to satisfy the prompt, the prompt needs to be resolved into one before it's sent.</p>

<h2>Too Many Actions Happen at Once</h2>

<p>This is related to an overloaded prompt, but it's specifically about temporal complexity — how much has to happen, in what order, within the shot's duration. A model generating video has to resolve motion across time, not just render a single convincing frame, and that gets exponentially harder as the number of sequential events increases.</p>

<p>A shot with one clear action — a character turns their head, a door opens, a car passes — gives the model a simple motion arc to resolve from start to finish. A shot with three or four sequential actions asks it to resolve three or four motion arcs, in the right order, within the same short window. The most common failure mode is compression: actions that should happen one after another get blended together, or the last action in the sequence gets rushed or dropped entirely because the shot ran out of duration before it ran out of instructions.</p>

<p>The fix isn't to write faster action — it's to reduce the number of discrete events. One clear action per shot is the safest default. If a sequence genuinely needs multiple beats, it usually needs multiple shots, not a longer single one.</p>

<h2>Hands and Small Objects Are High-Risk</h2>

<p>Hands fail more than almost any other part of the human body in AI video, and the reason is structural rather than a model oversight. A hand has many small joints in close proximity, in near-constant relative motion, and the model has to keep all of them coherent frame to frame while the rest of the body is also moving. That's a lot of fine detail packed into a small part of the frame — exactly the combination current models handle least reliably.</p>

<p>It gets substantially harder the moment a hand interacts with an object. Picking up a cup, buttoning a shirt, holding a phone, shuffling papers — each of these requires the model to resolve two separate forms (hand and object) making physically convincing contact, with correct occlusion, grip and object behavior, all while both may be moving. This is a much harder problem than a hand simply existing at rest.</p>

<p>Practical mitigations: frame hands smaller in the shot rather than in tight close-up, keep hand-object interaction to a minimum of one simple action, avoid asking for fast or fine manipulation (typing, dealing cards, tying a knot), and consider cutting away from the interaction itself — show the reach, cut, show the result. A convincing edit around a hard interaction often beats a full attempt to generate it in one continuous take.</p>

<h2>Multiple Characters Increase Complexity</h2>

<p>Every additional character in a shot multiplies the number of things that can go wrong, not just adds to it. With one character, the model manages one identity, one set of proportions, one line of action. With two or more, it also has to manage relative scale, believable blocking, eyelines that actually meet, and — often the most visible failure — keeping each character's identity distinct and consistent rather than letting features blend between them.</p>

<p>Common multi-character failure patterns: faces that drift toward resembling each other over the course of a shot, characters that pass through one another during movement, eyelines that don't land on anything, and one character's wardrobe or features bleeding into the other's. These get worse with camera movement, worse with dialogue-driven action, and worse the longer the shot runs.</p>

<p>If a scene needs multiple characters interacting, it's often more reliable as several single-character shots cut together — a shot on each character's reaction, an over-the-shoulder, an establishing wide — than one shot asking the model to manage everyone's identity and blocking simultaneously. Reserve true multi-character single shots for moments where the interaction itself is the point, and keep the action in them simple.</p>

<h2>The Shot Is Too Long</h2>

<p>Duration isn't free. Every additional second a model has to sustain the same character, environment and camera behavior is another chance for something to drift — a face to soften, a wardrobe detail to shift, a background element to warp. Continuity degrades gradually rather than failing all at once, which is why long single takes often start clean and end unrecognizable.</p>

<p>This is a direct trade-off against the complexity covered above: a long shot with one simple, continuous action (a slow push-in on a still subject) can hold up fine, while a short shot with several actions can already be too much. Duration and action count need to be budgeted together, not considered separately. If a shot needs to run long, strip the action down to almost nothing else — long and simple, not long and busy.</p>

<p>When a shot needs both length and complexity, that's usually a sign it should be several shots. A held long take is a specific, expensive choice in traditional filmmaking too — it should be a deliberate decision, not a default.</p>

<h2>The Model Is Wrong for the Shot</h2>

<p>Not every failure is a prompting problem. Video models have real differences in what they're strong at — some hold motion and physical action better, some are stronger on camera control, some prioritize single-frame polish over consistency across a longer take. A shot that's well-built on paper can still fail simply because it was sent to a model that isn't suited to that kind of shot.</p>

<p>Before spending a generation on a shot with real complexity — fast motion, an unusual camera move, a long duration, an object interaction — it's worth checking how hard that specific shot actually is to generate, and on which model it's most likely to hold up, before any credits are spent. RevaultAI's <a href="/which-model">Which Model</a> tool takes a shot description and scores its difficulty against the available models, naming what's likely to break and recommending the model most likely to deliver it in fewer takes.</p>

<h2>Your Reference Frame Is Working Against You</h2>

<p>When a shot starts from a reference image, the frame you choose isn't just a starting point — it's a set of constraints the motion has to respect. If the composition and the requested movement disagree, the model has to resolve that disagreement, and the result is often an awkward compromise rather than either version.</p>

<p>A frame with a character facing directly into camera doesn't leave obvious room for "the camera circles around her" — there's no established sense of the space behind her for the circle to move through. A tightly cropped frame doesn't leave room for a character to stand up or step back without immediately leaving frame in a way that reads as a cut, not a move. A frame with hard directional light doesn't hold up well against "the camera moves to reveal her from the other side," because the lighting logic breaks the moment the angle changes.</p>

<p>Before using a reference frame, look at it the way a cinematographer would: where's the headroom, where's the negative space, which way does the light suggest the world continues, and does the requested camera or subject movement actually have somewhere to go. If the frame and the motion argue with each other, either change the requested motion or pick a different frame — don't ask the model to referee the disagreement.</p>

<h2>Split Difficult Shots Into Simpler Shots</h2>

<p>Most of the fixes above point at the same underlying move: when a shot is failing, the answer is often not a better prompt for the same shot — it's fewer things asked of any single shot.</p>

<div class="example"><strong>One difficult shot:</strong> "A man sits at a desk, picks up a pen, signs a document, then stands and walks to the window while the camera pulls back and rises to a high angle."</div>

<p>That's a hand-object interaction, a stand from a seated position, a walk, and a compound camera move — three or four of this guide's highest-risk categories stacked into one shot. Split by action and by camera setup instead:</p>

<div class="example"><strong>Shot 1:</strong> "Close on a man's hand signing a document on a desk. Static camera." (isolates the hand interaction, framed to reduce risk)<br><br><strong>Shot 2:</strong> "A man stands from a desk and walks toward a window. Camera holds a medium wide shot, no movement."<br><br><strong>Shot 3:</strong> "Low-angle shot of the man at the window, camera slowly rises." (the compound camera move, now on its own with no competing action)</div>

<p>Three simple, achievable shots cut together tell the same story as the one difficult shot — and each one is far more likely to come back usable on the first or second try.</p>

<h2>Treat Generations Like Takes</h2>

<p>On a traditional set, nobody expects take one to be the take that makes the cut. Actors miss a beat, a camera move overshoots, the light changes — you shoot several takes and select the one that works. AI generation is the same process compressed into seconds instead of hours, and it's worth treating it with the same expectations: a failed generation isn't a verdict on the shot, it's take three of eight.</p>

<p>The part that traditional filmmaking does and most AI workflows skip is keeping the takes organized. RevaultAI's <a href="/takes">Takes</a> groups every generation from the same shot together automatically, so you can compare attempts side by side, mark the one that works, reject the ones that don't, and leave yourself a note on what changed between them — instead of losing track of which prompt tweak actually fixed the problem.</p>

<h2>Use Generation Autopsy</h2>

<p>Sometimes the cause isn't obvious just from reading the prompt back — it's clearer once someone (or something) that knows the common failure patterns looks at what you asked for and what went wrong. That's what RevaultAI's <a href="/autopsy">Generation Autopsy</a> tool is for.</p>

<p>Autopsy currently reads two things: the original prompt you used, and your own description of what went wrong with the result. It does not analyze the video clip itself — it can't watch the footage, and it doesn't claim to. What it diagnoses is the wording, based on the same failure patterns covered in this guide: stacked actions, conflicting camera direction, high-risk hand or object interaction, duration mismatched to complexity, and so on.</p>

<p>From that, it returns the likely causes ranked by confidence, the exact phrases in your prompt involved in each one, a specific fix for each cause, structural advice when the problem is bigger than wording (like a shot that needs to be split), a model suggestion when the issue is model-fit rather than prompt-fit, and a revised prompt built to hold up better on the next attempt.</p>

<div class="cta-inline">
<strong>Find Out Why Your Generation Failed</strong>
<p>Free. No account required.</p>
<a class="cta-btn" href="/autopsy">Run Generation Autopsy</a>
</div>

<p>The more specific your description of the failure, the sharper the diagnosis — "the hand melted into the cup" gives Autopsy far more to work with than "it looked wrong."</p>

<h2>Building the Shot Right the First Time</h2>

<p>Diagnosing a failed generation after the fact is useful, but the cheaper fix is building the shot correctly before you spend the generation. RevaultAI's <a href="/shot-director">Shot Director</a> and <a href="/frame-planner">Frame Planner</a> tools help structure a shot's camera, blocking and starting frame before it's sent to a model, and the <a href="/prompt-builder">Video Prompt Builder</a> scaffolds a complete prompt — subject, action, camera, lighting — so the structural problems this guide covers are less likely to end up in the prompt in the first place. When a shot is ready, <a href="/generate">Generate</a> is where it actually renders.</p>

<p>Most failed generations aren't a verdict on what's possible — they're a shot that asked for too much, in conflicting directions, in too little time. Isolate the cause, simplify the shot, and the same idea usually renders the second or third time.</p>
`,
  },
  {
    slug: "ai-video-character-consistency",
    title: "How to Keep Characters Consistent in AI Video",
    seoTitle: "AI Character Consistency: How to Keep the Same Character Across Video Shots",
    description:
      "Learn how to keep characters consistent across AI-generated video shots using reference images, visual anchors, controlled prompting, shot planning, first frames and practical filmmaking workflows.",
    date: "2026-09-05",
    author: "Richard Garland",
    category: "Guides",
    readingTime: "15 min",
    faq: [
      ["Why do AI video characters change between shots?", "Each generation may need to reconstruct parts of the character from the information you provide. If visual references, descriptions, wardrobe or other identity cues change between shots, the output can drift. Using stable references and repeatable character descriptions can reduce that variation."],
      ["What is the best way to keep the same character in AI video?", "Start with strong reference images, maintain a stable identity description, lock important wardrobe and visual traits, reuse successful frames when possible and track continuity from shot to shot."],
      ["How can I keep character descriptions consistent across multiple AI video prompts?", "Create one stable character description and reuse it rather than rewriting the character for every shot. RevaultAI's Scene Breakdown tool can automate this part of the workflow by locking character and location descriptions and repeating them across each shot in the generated shot list."],
      ["Do reference images help with AI character consistency?", "Yes. Reference-image workflows can give supported video models visual information about the character instead of relying entirely on text. RevaultAI's Video Prompt Builder also accepts a reference still: it reads the subject, wardrobe, setting and lighting from the frame and structures the shot around them."],
      ["Should I use text-to-video or image-to-video for character consistency?", "Both can be useful, but image-to-video or reference-based workflows give you an existing visual identity to build from. Text-to-video can still work well for exploration and establishing initial character designs."],
      ["How many character reference images should I make?", "There is no universal number. A practical starting set is a clear portrait, three-quarter view, profile and full-body image, especially if those angles will appear in your film."],
      ["How do I keep wardrobe consistent in AI video?", "Write down the costume precisely and reuse the same description across relevant shots. Treat wardrobe changes as deliberate continuity events rather than letting each generation reinterpret what the character is wearing."],
      ["What should I do if a character starts changing during a generated clip?", "Use the portion that remains convincing and cut before the drift becomes distracting. Alternate angles, inserts and reaction shots can preserve both continuity and pacing."],
    ],
    content: `
<p>You generate the first shot. The character looks great. The second shot looks great too. There's just one problem: it looks like a different person.</p>

<p>The hairstyle shifted. The jacket changed. The face got narrower. The character aged ten years. By shot four, your protagonist has somehow become their own distant cousin.</p>

<p>Character consistency is one of the most important challenges in AI filmmaking, because a film depends on the audience believing that the person in shot one is the same person in shot two.</p>

<p>The solution is not simply "use the same prompt again." Consistency comes from building a repeatable visual identity and carrying that identity through your entire generation workflow. That means thinking more like a production designer, cinematographer and continuity supervisor — and less like someone generating isolated clips. Here's how.</p>

<h2>What Does Character Consistency Actually Mean?</h2>

<p>Character consistency does not mean every shot should look identical. A real character changes across a film. They turn their head. They change expressions. They walk into different lighting. They get wet in the rain. They remove a jacket. They move from a close-up to a wide shot.</p>

<p>Consistency means that beneath those changes, the character remains recognizably the same person. You're trying to preserve identity while allowing performance. Think of consistency in layers:</p>

<ul>
<li><strong>Identity</strong> — the features that make the character recognizable.</li>
<li><strong>Wardrobe</strong> — what they are wearing.</li>
<li><strong>Hair and makeup</strong> — color, shape, length, styling and distinctive details.</li>
<li><strong>Props</strong> — glasses, jewelry, bags, weapons, tools, accessories.</li>
<li><strong>Body characteristics</strong> — height, build, posture and silhouette.</li>
<li><strong>Visual style</strong> — realistic, animated, painterly, graphic, cinematic and so on.</li>
<li><strong>Continuity state</strong> — what has happened to the character so far.</li>
</ul>

<p>That last point matters: if a shirt became dirty in the previous shot, it shouldn't magically become clean in the next one. That's where AI filmmaking starts becoming actual filmmaking.</p>

<h2>1. Design the Character Before You Generate the Film</h2>

<p>Don't invent your protagonist again in every prompt. Create the character first. Before generating scene one, define the person clearly enough that you can recognize what belongs to them and what doesn't. The same principle that drives good <a href="/blog/how-to-write-ai-video-prompts">AI video prompting</a> applies here — decide what matters before you generate.</p>

<p>For example:</p>

<div class="example">Woman in her early 30s, angular face, deep brown skin, short natural curls, dark brown eyes, small scar through the left eyebrow, athletic build, charcoal field jacket over a faded burgundy shirt, thin silver chain.</div>

<p>Notice that some traits are ordinary and some are distinctive. The distinctive ones matter: short natural curls, a scar through the left eyebrow, the charcoal field jacket, the burgundy shirt, the silver chain. Those become visual anchors.</p>

<p>A generic description like "beautiful woman in a jacket" gives the model enormous freedom. Freedom is useful when exploring. It's less useful when you're trying to cast the same lead actor for twelve shots.</p>

<h2>2. Create a Character Reference Before Production</h2>

<p>One of the strongest ways to preserve a character is to establish visual references before generating your scenes. That might be:</p>

<ul>
<li>A clean portrait</li>
<li>A waist-up image</li>
<li>A full-body image</li>
<li>Front and side views</li>
<li>Several expressions</li>
<li>A simple turnaround sheet</li>
<li>Multiple angles of the same wardrobe</li>
</ul>

<p>The goal is not to make a pretty image. The goal is to create source material your later shots can reference. A good reference image should make the character easy to read. Avoid hiding important identity traits behind:</p>

<ul>
<li>Extreme shadows</li>
<li>Hair covering the face</li>
<li>Heavy motion blur</li>
<li>Tiny framing</li>
<li>Complicated foreground objects</li>
<li>Dramatic distortion</li>
</ul>

<p>You can make the film dramatic later. First, establish the actor.</p>

<h2>3. Separate Fixed Traits From Variable Traits</h2>

<p>Create two mental lists.</p>

<h3>Fixed</h3>

<p>Things that should remain stable: face, hair, eye color, body type, age, core wardrobe, distinctive accessories.</p>

<h3>Variable</h3>

<p>Things allowed to change: expression, pose, camera angle, lighting, environment, action, dirt, weather, temporary props.</p>

<div class="callout"><strong>Fixed:</strong> short natural curls, eyebrow scar, charcoal jacket, burgundy shirt, silver necklace.<br><br><strong>Variable:</strong> running, frightened expression, night lighting, rain, side-profile shot.</div>

<p>Now your prompt isn't redesigning the character. It's putting the same character into a new situation.</p>

<h2>4. Keep Your Character Description Stable</h2>

<p>If one prompt says "short curly black hair, angular face, dark brown skin" and the next says "soft curls, elegant face, warm brown complexion," you may understand those as the same person. The model may not.</p>

<p>When identity matters, don't rewrite for style every time. Use a stable core description — think of it as your character's production ID.</p>

<div class="example">Maya, early 30s, angular face, deep brown skin, short natural black curls, dark brown eyes, small scar through the left eyebrow, athletic build.</div>

<p>Reuse that core wording across relevant shots. The scene changes; the identity block doesn't. The <a href="/prompts">prompt examples</a> in the library show how a block like this sits inside a full shot prompt.</p>

<h2>5. Don't Overload the Character With Tiny Details</h2>

<p>Details matter, but useful details matter more than sheer quantity. A 200-word facial description isn't necessarily more consistent than five strong visual anchors.</p>

<p>Prioritize characteristics that survive different shot sizes. Ask: "What would make this character recognizable from across the room?" Those traits usually make the best anchors.</p>

<h2>6. Use Wardrobe as a Continuity Tool</h2>

<p>Wardrobe is underrated in AI character consistency. Even when facial identity drifts slightly, strong wardrobe continuity can help the viewer perceive the character as the same person.</p>

<p>Instead of "black clothes," use "charcoal canvas field jacket with four front pockets over a faded burgundy crew-neck shirt." For important characters, maintain a costume note:</p>

<div class="example">Maya — Scenes 1–4<br><br>Charcoal field jacket<br>Burgundy shirt<br>Black utility pants<br>Silver necklace<br>Brown boots</div>

<p>If the jacket comes off in scene five, record it. Traditional productions literally employ people to track continuity. AI filmmakers need the same mindset.</p>

<h2>7. Start New Shots From Strong Existing Frames</h2>

<p>When your workflow supports <a href="/generate">image-to-video</a>, a good frame from an existing shot can become extremely valuable. Instead of asking the model to reconstruct the character entirely from text, give it a visual starting point.</p>

<p>Say shot one ends with the character standing beside the elevator. Take a clean frame from that moment and use it as the starting image for shot two, where the character enters the elevator. Now shot two inherits visual information directly from shot one.</p>

<p>This can help carry costume, hair, lighting, environment, prop position and spatial composition. Think of strong frames as continuity assets — don't throw them away after generation.</p>

<p>RevaultAI's <a href="/prompt-builder">Video Prompt Builder</a> can also work directly from a reference still. Attach a frame and the Builder analyzes the subject, wardrobe, setting and lighting already visible in the image. You then add a note describing what should happen next — the character turning toward camera, walking through the scene, reacting to something off-screen — and the Builder structures the motion and camera direction around that starting image. The note can also be left blank. Reference images are downscaled in the browser for analysis and aren't stored.</p>

<p>This is useful when you already have a strong frame and don't want to reconstruct everything from text. For example:</p>

<div class="example">Reference frame: Maya standing beside an elevator in the established charcoal jacket and burgundy shirt.<br><br>Creator note: "She hears the elevator arrive, turns toward the doors and takes one cautious step backward. Slow camera push-in."</div>

<p>The image establishes most of the visual starting point — who she is, what she's wearing, where she is, how it's lit — while the note concentrates on what happens next. The Builder produces the structured prompt; generation itself still happens through your normal generation workflow.</p>

<h2>8. Build a Continuity Chain</h2>

<p>For longer films, don't think "generate 12 independent clips." Think "shot 1 creates material for shot 2, shot 2 creates material for shot 3."</p>

<ul>
<li><strong>Shot 1</strong> — medium shot of Maya entering the warehouse.</li>
<li><strong>Shot 2</strong> — use a frame from shot 1 as visual reference; side tracking shot as she crosses the warehouse.</li>
<li><strong>Shot 3</strong> — use a frame from shot 2; close-up as she sees something off-screen.</li>
<li><strong>Shot 4</strong> — use the established character reference again if the close-up has drifted.</li>
</ul>

<p>You're creating a chain instead of repeatedly returning to zero.</p>

<h2>9. Be Careful When Changing Camera Angle</h2>

<p>Characters often drift when the camera sees them from a dramatically different perspective. If a particular <a href="/blog/ai-video-camera-shots-movements">camera angle</a> matters, build references for it.</p>

<p>Your character sheet might include a front view, three-quarter view, profile, full body and rear silhouette. You're reducing how much visual information the system has to improvise.</p>

<p>This is especially useful for hair, jackets, tattoos, backpacks, hats, prosthetics and asymmetrical details. If your character has a scar over the left eyebrow, don't accidentally let it migrate to the right one every time the camera moves.</p>

<h2>10. Keep Style Consistent Too</h2>

<p>Sometimes the person stays recognizable but the world changes around them. Shot one looks like naturalistic 35mm photography. Shot two looks digitally sharp. Shot three suddenly becomes glossy commercial lighting. That's still a continuity problem.</p>

<p>Reuse important visual language: lens feel, lighting direction, contrast, color palette, texture, film grain, depth of field, aspect ratio and production design. Character consistency and style consistency reinforce each other.</p>

<h2>11. Control Lighting Changes Carefully</h2>

<p>The same face can look dramatically different under different light. That's true in real cinematography, and it's even more important with AI.</p>

<p>If your character starts under soft window light and the next shot puts them under harsh green overhead lighting, some perceived identity change is natural. Ask: "Did the facial structure change, or did the lighting change?" Those aren't the same problem.</p>

<p>When testing consistency, compare shots under reasonably similar lighting first. Then introduce intentional lighting variation once you're confident the identity is stable.</p>

<h2>12. Use Close-Ups Strategically</h2>

<p>Close-ups expose identity errors. That makes them difficult — but also useful. If a character will appear throughout a film, generate a few strong close-ups early. Those frames can become valuable identity references later.</p>

<p>A wide shot might preserve wardrobe while losing facial detail. A close-up does the opposite. Think face reference plus body reference plus wardrobe reference, not just one hero image.</p>

<h2>13. Maintain a Character Bible</h2>

<p>If you're making more than a few shots, create a simple character bible. For each major character, record identity, hair, eyes, distinguishing traits, wardrobe, behavior, visual references and continuity notes:</p>

<div class="example">Name: Maya Torres<br><br>Age / physical identity: early 30s, angular face, deep brown skin, athletic build.<br>Hair: short natural black curls.<br>Eyes: dark brown.<br>Distinguishing traits: small scar through left eyebrow.<br>Wardrobe: charcoal field jacket, burgundy shirt, black utility pants, thin silver chain.<br>Behavior: controlled, observant, rarely makes large gestures.<br>Visual references: front portrait, three-quarter portrait, full body, profile.<br>Continuity notes: Scene 3 onward — jacket wet. Scene 5 — cut on right cheek. Scene 7 onward — no jacket.</div>

<p>You're no longer relying on memory. You're managing production continuity.</p>

<h2>14. Treat Environments the Same Way</h2>

<p>Character consistency gets easier when the environment is also controlled. Maintain reusable environment descriptions too.</p>

<div class="example">Narrow underground parking garage, pale concrete columns, low fluorescent ceiling lights, yellow bay numbers, damp floor reflecting overhead fixtures.</div>

<p>Then reuse it when the character returns there. Consistency is often less about forcing one thing to remain stable and more about reducing unnecessary variation everywhere else.</p>

<h2>15. Generate Coverage, Not Miracles</h2>

<p>Don't expect one perfect generation to solve an entire sequence. Professional filmmaking is built from coverage. Generate options. For an important moment, you may want a wide shot, a medium shot, a close-up, a reaction shot, an insert and an alternate take.</p>

<p>Then edit the strongest consistent material together. If one generation looks perfect for six seconds and falls apart at the end, use the six seconds. You're making a film, not submitting the raw generation for inspection. Editing is part of the consistency workflow.</p>

<h2>16. Cut Before the Character Breaks</h2>

<p>AI-generated shots sometimes begin strong and deteriorate later. The face changes. Hands become strange. Clothing morphs. Background objects drift.</p>

<p>Do not feel obligated to use the entire clip. If the usable portion is 3.7 seconds, use 3.7 seconds. Cut to another angle. Cut to a reaction. Cut to an object. Cut to a wide shot. Filmmakers have been hiding imperfections with editing for more than a century. AI doesn't change that.</p>

<h2>17. Use Inserts to Protect Continuity</h2>

<p>Suppose your protagonist walks toward a safe, enters a combination and opens it. You don't necessarily need their face visible the entire time. Your sequence could be:</p>

<ul>
<li><strong>Shot 1</strong> — medium shot of Maya approaching the safe.</li>
<li><strong>Shot 2</strong> — insert of her hand turning the dial.</li>
<li><strong>Shot 3</strong> — close-up of the lock clicking.</li>
<li><strong>Shot 4</strong> — reaction shot of Maya as the door opens.</li>
</ul>

<p>That gives you more editorial control and reduces how long the model has to preserve full-body identity continuously. The insert also makes the sequence feel more cinematic. Consistency and storytelling can solve each other's problems.</p>

<h2>18. Build Sequences Around What AI Does Well</h2>

<p>Sometimes consistency problems begin at the script stage. If your scene requires twelve characters, constant costume changes, fast physical interactions, complex blocking, continuous dialogue, major lighting changes, multiple locations and no cuts, you've designed a difficult generation problem.</p>

<p>Instead, design the sequence as shots — the same discipline behind any <a href="/blog/how-to-make-ai-short-film">AI filmmaking workflow</a>. That doesn't mean making your story less ambitious. It means directing it. Break one complicated event into manageable visual beats.</p>

<h2>19. Don't Confuse Character Consistency With Character Stiffness</h2>

<p>There is a bad version of consistency: the character looks identical because they never move naturally. Same expression. Same angle. Same lighting. Same pose. That's not filmmaking.</p>

<p>Your goal is stable identity plus changing performance. The character should be able to smile, cry, run, turn away, enter another room, stand in sunlight and appear in shadow while remaining recognizable. Consistency is the foundation. Performance is what you build on top of it.</p>

<h2>Use Scene Breakdown to Lock Continuity Across Shots</h2>

<p>If you're turning a scene into multiple AI-generated shots, one of the easiest ways to create character drift is to rewrite the character and location slightly differently every time.</p>

<p>RevaultAI's free <a href="/scene-breakdown">Scene Breakdown</a> tool is designed around that problem. Paste in a scene or logline and it turns the sequence into a numbered shot list — shot size, camera movement, lighting, a suggested duration sized for your target model, and a full generation prompt for every shot.</p>

<p>The important part for continuity is what it doesn't change. Character and location descriptions are locked and repeated verbatim across the entire shot list. Instead of:</p>

<div class="example">Shot 1: "woman with short curly hair…"<br><br>Shot 2: "woman with soft natural curls…"<br><br>Shot 3: "woman with short dark hair…"</div>

<p>the same identity description carries from shot to shot. That doesn't guarantee perfect character consistency — the video model still has to generate the character — but it removes one unnecessary source of drift: changing the description yourself.</p>

<p>Each shot can then be copied or sent directly into <a href="/generate">RevaultAI Generate</a> with the selected model and aspect ratio already set. Signed-in creators can have their breakdowns saved and reopen the shot list later.</p>

<div class="cta-inline">
<strong>Break Your Scene Into Consistent Shots</strong>
<p>Turn a scene or logline into a structured shot list while keeping character and location descriptions locked across every shot. Free. No account required.</p>
<a class="cta-btn" href="/scene-breakdown">Break Down a Scene</a>
</div>

<h2>A Practical Character Consistency Workflow</h2>

<h3>Step 1: Define the character</h3>
<p>Write a short identity description with four to seven durable visual anchors — the traits that would make the character recognizable from across the room.</p>

<h3>Step 2: Create strong character references</h3>
<p>Generate a clean portrait, three-quarter view, profile and full-body image, plus any angle you know the film will need.</p>

<h3>Step 3: Lock wardrobe and distinguishing traits</h3>
<p>Write down exactly what they are wearing and the details that must not drift — a scar, a chain, a particular jacket — in wording you can reuse.</p>

<h3>Step 4: Establish visual style</h3>
<p>Fix the core cinematography, palette, contrast and texture so the world stays as stable as the character.</p>

<h3>Step 5: Write the scene</h3>
<p>Describe the beat you're shooting in plain prose before you think about individual shots.</p>

<h3>Step 6: Break the scene into shots</h3>
<p>Turn that prose into a shot list — sizes, angles, coverage. Scene Breakdown can do this automatically and, importantly, keeps the character and location wording identical across every shot it generates.</p>

<h3>Step 7: Keep character and location descriptions stable</h3>
<p>However you build the list, reuse the same identity and environment blocks in every shot prompt. The scene changes; the description doesn't.</p>

<h3>Step 8: Use reference frames when helpful</h3>
<p>When you already have a strong frame, start from it rather than from text. The reference-frame Video Prompt Builder can read a still and structure the motion and camera around what's already in the image.</p>

<h3>Step 9: Generate individual shots</h3>
<p>Generate one shot at a time so each gets the model's full attention. Treat a successful frame as a production asset.</p>

<h3>Step 10: Save strong frames as continuity assets</h3>
<p>Keep the best frames from each shot. They become reference material and starting images for everything that follows.</p>

<h3>Step 11: Generate coverage</h3>
<p>Create alternate angles and takes rather than expecting one generation to carry the whole scene.</p>

<h3>Step 12: Track continuity changes</h3>
<p>Record clothing damage, props, injuries, weather and location state as they change, the way a script supervisor would.</p>

<h3>Step 13: Edit aggressively</h3>
<p>Cut before visual identity deteriorates. The usable portion of a clip is the clip.</p>

<p>That workflow won't eliminate every inconsistency. But it changes the problem from "I hope the model remembers my character" to "I am actively controlling continuity." That's a much better filmmaking position.</p>

<h2>The Biggest Mistake: Starting Every Shot From Scratch</h2>

<div class="callout">If you remember only one thing from this guide, make it this: stop recreating your protagonist from zero every time you generate a shot.</div>

<p>Reuse character descriptions, reference images, wardrobe definitions, successful frames, visual style, location descriptions and continuity notes. The more of your film's visual language you carry forward, the less the model has to reinvent.</p>

<p>There are now two complementary ways to carry that information forward:</p>

<ul>
<li><strong>Textual continuity.</strong> Keep the character and location wording identical from shot to shot. <a href="/scene-breakdown">Scene Breakdown</a> does this across a multi-shot sequence by locking those descriptions and repeating them verbatim.</li>
<li><strong>Visual continuity.</strong> Start a shot from an established frame instead of redescribing everything. A reference still gives the <a href="/prompt-builder">Video Prompt Builder</a> visual information — subject, wardrobe, setting, light — to build the next shot around.</li>
</ul>

<p>Neither is a guarantee. The model still generates the character every time. Used together, they just narrow how much it has to invent.</p>

<h2>Final Thought: Consistency Is a Production Discipline</h2>

<p>Character consistency isn't one magic setting. It's a workflow. Traditional filmmakers maintain continuity through casting, wardrobe, hair, makeup, lighting, production design, camera logs, script supervision and editing. AI filmmakers need versions of the same disciplines. Your tools are different; the principle isn't.</p>

<p>Create the character. Define what makes them recognizable. Build references. Track what changes. Carry successful visual information from shot to shot. Then use editing to turn those pieces into a continuous performance.</p>

<p>The goal isn't to generate twelve perfect clips. The goal is to make the audience believe they're watching one character live through twelve shots. That's filmmaking.</p>

<div class="cta-inline">
<strong>Build a More Consistent Shot</strong>
<p>Already know who your character is? Use the RevaultAI Video Prompt Builder to turn your scene idea into a structured prompt with subject, action, environment, camera, lighting, style and motion. Free. No account required.</p>
<a class="cta-btn" href="/prompt-builder">Build a Video Prompt</a>
</div>

<h2>Frequently Asked Questions</h2>

<h3>Why do AI video characters change between shots?</h3>
<p>Each generation may need to reconstruct parts of the character from the information you provide. If visual references, descriptions, wardrobe or other identity cues change between shots, the output can drift. Using stable references and repeatable character descriptions can reduce that variation.</p>

<h3>What is the best way to keep the same character in AI video?</h3>
<p>Start with strong reference images, maintain a stable identity description, lock important wardrobe and visual traits, reuse successful frames when possible and track continuity from shot to shot.</p>

<h3>How can I keep character descriptions consistent across multiple AI video prompts?</h3>
<p>Create one stable character description and reuse it rather than rewriting the character for every shot. RevaultAI's Scene Breakdown tool can automate this part of the workflow by locking character and location descriptions and repeating them across each shot in the generated shot list.</p>

<h3>Do reference images help with AI character consistency?</h3>
<p>Yes. Reference-image workflows can give supported video models visual information about the character instead of relying entirely on text. RevaultAI's Video Prompt Builder also accepts a reference still: it reads the subject, wardrobe, setting and lighting from the frame and structures the shot around them.</p>

<h3>Should I use text-to-video or image-to-video for character consistency?</h3>
<p>Both can be useful, but image-to-video or reference-based workflows give you an existing visual identity to build from. Text-to-video can still work well for exploration and establishing initial character designs.</p>

<h3>How many character reference images should I make?</h3>
<p>There is no universal number. A practical starting set is a clear portrait, three-quarter view, profile and full-body image, especially if those angles will appear in your film.</p>

<h3>How do I keep wardrobe consistent in AI video?</h3>
<p>Write down the costume precisely and reuse the same description across relevant shots. Treat wardrobe changes as deliberate continuity events rather than letting each generation reinterpret what the character is wearing.</p>

<h3>What should I do if a character starts changing during a generated clip?</h3>
<p>Use the portion that remains convincing and cut before the drift becomes distracting. Alternate angles, inserts and reaction shots can preserve both continuity and pacing.</p>

<p class="editorial-note">AI video tools change quickly, and reference-image and character features vary between models and versions. The workflow here is deliberately model-agnostic — check the current capabilities of the tools you use.</p>
`,
  },
  {
    slug: "ai-video-camera-shots-movements",
    title: "15 Camera Shots & Movements Every AI Filmmaker Should Know",
    seoTitle: "15 AI Video Camera Shots & Movements (+ Prompt Examples)",
    description:
      "Learn 15 essential camera shots and movements for AI video, with cinematic prompt examples for dolly shots, tracking shots, crane shots, orbit shots, POV, handheld and more.",
    date: "2026-09-05",
    author: "Richard Garland",
    category: "Guides",
    readingTime: "12 min",
    faq: [
      ["What camera movements work well in AI video prompts?", "Common movements include push-ins and pull-outs, tracking shots, pans, tilts, orbit shots, crane movements, aerial shots and handheld camera movement. The best choice depends on what the shot needs to communicate."],
      ["Should every AI-generated shot have camera movement?", "No. A locked camera can be more effective than movement when you want stillness, tension, symmetry or uninterrupted attention on a performance."],
      ["How do I describe camera movement in an AI video prompt?", "Be direct. Describe where the camera begins, how it moves relative to the subject and, when important, where it ends. For example: \"The camera slowly tracks backward in front of the subject at walking speed.\""],
      ["What's the difference between a pan and a tracking shot?", "A pan rotates the camera horizontally from its position. A tracking shot moves the camera through physical space with or around the subject."],
      ["How should I prompt camera movement for image-to-video?", "Focus primarily on what should change after the starting frame: subject movement, environmental movement and camera behavior. Avoid unnecessarily redescribing visual information already established by the source image."],
      ["Can I combine multiple camera movements?", "Yes, but use compound movements deliberately. A simple, well-defined movement is often easier to control than several competing camera instructions."],
    ],
    content: `
<p>Generating a beautiful image is one thing. Directing a shot is another.</p>

<p>One of the fastest ways to make AI-generated video feel more intentional is to stop treating the camera as an invisible observer. Where is the camera? How close is it to the subject? Is it moving? Why is it moving? What should the audience learn or feel because of that movement?</p>

<p>Modern AI video models increasingly understand the language of cinematography: close-ups, wide shots, tracking shots, push-ins, crane movements, handheld cameras, POV shots and more. But simply stuffing cinematic terminology into a prompt isn't enough. The goal isn't to make the camera move. The goal is to give the camera a reason to move.</p>

<p>Here are 15 shots and camera movements every AI filmmaker should have in their toolkit. If you want the wider framework first, it sits alongside our <a href="/blog/how-to-write-ai-video-prompts">prompting guide</a>.</p>

<h2>First: Shot Size and Camera Movement Aren't the Same Thing</h2>

<p>Before we start, there's an important distinction. A <strong>shot size</strong> describes how the subject is framed:</p>

<ul>
<li>Extreme wide shot</li>
<li>Wide shot</li>
<li>Medium shot</li>
<li>Close-up</li>
<li>Extreme close-up</li>
</ul>

<p>A <strong>camera movement</strong> describes what the camera does during the shot:</p>

<ul>
<li>Pan</li>
<li>Tilt</li>
<li>Dolly</li>
<li>Tracking</li>
<li>Crane</li>
<li>Orbit</li>
</ul>

<p>You can combine the two. For example:</p>

<div class="example">Medium close-up of a detective sitting alone at a diner counter. The camera slowly pushes toward her as she realizes the man reflected in the window has been watching her.</div>

<p>Now we know both how the shot begins and how the camera behaves. That's much more useful than simply writing "cinematic shot of a detective."</p>

<h2>1. Establishing Shot</h2>

<p>An establishing shot introduces the audience to a location and establishes geography before the story moves closer. These are often wide or extreme-wide compositions.</p>

<h3>Best for</h3>

<p>Opening scenes, introducing new locations, establishing scale, transitions between locations and giving the audience spatial context.</p>

<h3>Prompt example</h3>

<div class="example">Extreme wide establishing shot of an isolated research station surrounded by an enormous frozen landscape at blue hour. Tiny figures cross the snow toward the illuminated station. Wind drives loose snow across the foreground. The camera remains still, emphasizing the enormous scale and isolation of the environment.</div>

<h3>Directing tip</h3>

<p>Don't use an establishing shot simply because films have them. Ask what the environment tells us. A tiny character surrounded by a massive landscape can communicate isolation before the character says a word.</p>

<h2>2. Close-Up</h2>

<p>A close-up brings the audience directly into a character's emotional space. Faces are the obvious use, but close-ups can also focus on meaningful objects.</p>

<h3>Best for</h3>

<p>Emotion, reactions, important details, dialogue, suspense and reveals.</p>

<h3>Prompt example</h3>

<div class="example">Close-up of a woman sitting inside a parked car at night. Passing headlights briefly sweep across her face. Her eyes remain fixed on something outside the windshield as her expression slowly changes from confusion to recognition. Shallow depth of field. The camera remains locked.</div>

<p>Notice that the camera doesn't need to move. Sometimes stillness is the direction.</p>

<h2>3. Extreme Close-Up</h2>

<p>An extreme close-up isolates a tiny detail and makes it important. An eye. A trigger finger. A drop of sweat. A key turning inside a lock.</p>

<h3>Prompt example</h3>

<div class="example">Extreme close-up of an astronaut's eye behind a scratched helmet visor. A tiny blue light begins blinking in the reflection of her pupil. Her eye shifts toward it. Very shallow depth of field. Locked camera.</div>

<p>Extreme close-ups are particularly effective as inserts between wider shots.</p>

<h2>4. Low-Angle Shot</h2>

<p>Place the camera below the subject and point upward. The result can make a character or object appear powerful, imposing, heroic or threatening.</p>

<h3>Prompt example</h3>

<div class="example">Low-angle medium shot of a lone swordsman standing beneath towering neon signs in heavy rain. His coat moves in the wind as he slowly draws his sword. The camera remains low near street level, looking upward as glowing advertisements loom behind him.</div>

<p>The angle itself tells part of the story.</p>

<h2>5. High-Angle Shot</h2>

<p>Now reverse the relationship. Place the camera above the subject and look downward. A high angle can emphasize vulnerability, geography, isolation or simply reveal information unavailable from eye level.</p>

<h3>Prompt example</h3>

<div class="example">High-angle wide shot looking down into an abandoned hotel lobby. A single traveler enters through the revolving doors and stops beneath the enormous chandelier. The camera remains stationary as the traveler looks around the empty room.</div>

<p>Camera angle is not merely decoration. It changes the audience's relationship with the subject.</p>

<h2>6. Dolly Push-In</h2>

<p>A push-in physically moves the camera closer to the subject. It's one of the most useful movements in cinematic storytelling.</p>

<h3>Best for</h3>

<p>Realization, tension, emotional emphasis, discovery and drawing attention to an important moment.</p>

<h3>Prompt example</h3>

<div class="example">Medium shot of an elderly man opening an old wooden box in a dark attic. He discovers a photograph inside and freezes. The camera slowly dollies forward into a close-up as recognition appears on his face. Dust floats through a narrow beam of afternoon sunlight.</div>

<p>The important part isn't "camera pushes in." It's why it pushes in at that moment. Here, the camera reacts to the character's realization.</p>

<h2>7. Dolly Pull-Out</h2>

<p>A pull-out does the opposite. The camera moves away from the subject. This can reveal new information, increase scale or make someone appear increasingly alone.</p>

<h3>Prompt example</h3>

<div class="example">Close shot of a child standing beneath a streetlamp at night holding a red balloon. The camera slowly dollies backward, revealing dozens of identical abandoned balloons scattered across the empty street. The child remains perfectly still.</div>

<p>The movement becomes a reveal. We begin with one piece of information and end with another.</p>

<h2>8. Tracking Shot</h2>

<p>A tracking shot moves with the subject. Instead of watching someone cross the frame, the camera travels alongside, behind or ahead of them.</p>

<h3>Best for</h3>

<p>Walking scenes, running, action, exploration, entrances and immersive sequences.</p>

<h3>Prompt example</h3>

<div class="example">Side-profile tracking shot following a bicycle courier racing through a crowded futuristic market. The camera travels alongside her at matching speed as pedestrians, steam and holographic advertisements streak through the background. She weaves around a delivery vehicle without slowing.</div>

<p>The subject and camera now have a relationship, so specify that relationship. Don't just prompt "tracking shot" — try "the camera tracks beside her at matching speed." There are more <a href="/prompts">prompt examples</a> to adapt in the library.</p>

<h2>9. Pan</h2>

<p>A pan rotates the camera horizontally from a fixed position. Think of turning your head left or right.</p>

<h3>Best for</h3>

<p>Following movement, revealing information beside the subject, surveying environments and transitioning attention between characters.</p>

<h3>Prompt example</h3>

<div class="example">Wide shot inside an empty 1970s television studio. The camera slowly pans from left to right across abandoned cameras and dusty lighting equipment before revealing a single television monitor still broadcasting in the corner.</div>

<p>Again, the movement has a destination. The pan isn't there to look cinematic. It's there to reveal the monitor.</p>

<h2>10. Tilt</h2>

<p>A tilt rotates the camera vertically, up or down.</p>

<h3>Best for</h3>

<p>Revealing height, introducing characters, architecture, scale and dramatic entrances.</p>

<h3>Prompt example</h3>

<div class="example">The shot begins on polished black shoes stepping onto a rain-soaked sidewalk. The camera slowly tilts upward, revealing a tailored black suit, gloved hands and finally the expressionless face of the person wearing it. Neon reflections ripple across the pavement behind them.</div>

<p>This is essentially controlled information delivery. The audience doesn't see everything immediately. You decide when they see it.</p>

<h2>11. Orbit Shot</h2>

<p>The camera moves in an arc around the subject. Orbit shots can make a character feel important, create dramatic dimensionality, reveal the environment around them or heighten a pivotal moment.</p>

<h3>Prompt example</h3>

<div class="example">Medium shot of a violinist performing alone on the roof of a skyscraper at sunrise. The camera slowly orbits around her as the city skyline shifts behind her. Her coat and hair move naturally in the wind while she continues playing.</div>

<p>One warning: more camera movement isn't automatically better camera movement. If a gentle partial orbit communicates the shot, you may not need an enormous 360-degree rotation.</p>

<h2>12. Crane / Jib Shot</h2>

<p>A crane-style movement changes the camera's vertical position through space. It can begin close to the subject and rise to reveal the world around them, or descend from a large environment into an intimate scene.</p>

<h3>Prompt example</h3>

<div class="example">The shot begins at street level behind a musician performing beneath a flickering marquee. The camera rises slowly above him, then above the theater entrance, revealing an enormous crowd filling the entire city block.</div>

<p>This is a great scale-reveal movement. Start small. End big.</p>

<h2>13. Handheld Shot</h2>

<p>Not every shot should glide perfectly through space. Handheld movement introduces small imperfections that can make a scene feel immediate, documentary-like, chaotic or intimate.</p>

<h3>Prompt example</h3>

<div class="example">Handheld medium shot following a journalist moving quickly through a crowded train station during an evacuation. People rush past the lens in both directions. The camera struggles slightly to keep pace as she pushes through the crowd.</div>

<p>The important word here is not just "handheld." Describe the behavior of the handheld camera. Subtle? Nervous? Aggressive? Following someone? Trying to keep up? Those choices affect the feeling of the shot.</p>

<h2>14. POV Shot</h2>

<p>A point-of-view shot places the camera approximately where a character's eyes would be. The audience experiences the scene from that character's perspective.</p>

<h3>Prompt example</h3>

<div class="example">First-person POV moving slowly through a dark apartment while holding a flashlight. The beam sweeps across framed photographs, an overturned chair and an open bedroom door at the end of the hallway. The camera hesitates before approaching the doorway.</div>

<p>POV works especially well when camera behavior reflects character behavior. Notice the camera hesitates. That's not traditional camera terminology. It's direction.</p>

<h2>15. Aerial / Drone Shot</h2>

<p>An aerial shot places the camera high above the environment. It can establish geography, follow movement, reveal patterns or create tremendous scale.</p>

<h3>Prompt example</h3>

<div class="example">High aerial tracking shot above a lone vehicle crossing a winding desert road at sunrise. The camera follows from behind and gradually gains altitude, revealing hundreds of abandoned vehicles scattered across the surrounding desert.</div>

<p>Aerial shots become much more interesting when they do something besides simply say "drone shot of a desert." Give the shot a beginning and an end.</p>

<h2>The Most Important Technique: Give Camera Movement a Purpose</h2>

<p>Here's a useful rule. Don't ask what camera movement looks coolest. Ask what the audience should know or feel by the end of this shot that they didn't know at the beginning. Then choose the camera movement.</p>

<ul>
<li><strong>Reveal information</strong> — use a pan, tilt, pull-out or crane movement.</li>
<li><strong>Increase emotional intensity</strong> — try a slow push-in.</li>
<li><strong>Stay connected to a moving character</strong> — use a tracking shot.</li>
<li><strong>Communicate instability</strong> — consider handheld movement.</li>
<li><strong>Show scale</strong> — use a pull-out, crane or aerial movement.</li>
<li><strong>Make the audience inhabit the character's experience</strong> — use POV.</li>
</ul>

<p>Camera movement becomes storytelling instead of decoration.</p>

<h2>Combine Subject Motion, Environmental Motion and Camera Motion</h2>

<p>One of the biggest mistakes in writing <a href="/blog/how-to-write-ai-video-prompts">AI video prompts</a> is treating all motion as one thing. Instead, think in layers.</p>

<h3>Subject motion</h3>

<p>What does the character or object do? "A woman walks toward the elevator."</p>

<h3>Environmental motion</h3>

<p>What moves around the subject? "Her coat shifts in the wind while steam drifts from a nearby vent."</p>

<h3>Camera motion</h3>

<p>What does the camera do? "The camera tracks backward in front of her at walking speed."</p>

<p>Put them together:</p>

<div class="example">Medium tracking shot of a woman walking quickly toward an elevator in an underground parking garage. The camera tracks backward directly in front of her at walking speed. Her coat moves slightly as ventilation fans push air through the garage, while steam drifts from a pipe in the background.</div>

<p>Now the model receives three different kinds of movement instead of a vague request for a "dynamic cinematic shot."</p>

<h2>Don't Over-Direct Every Shot</h2>

<p>There's another trap. Once filmmakers discover camera terminology, prompts can turn into this:</p>

<div class="example">Dolly tracking orbit crane shot, camera pans left while tilting upward and zooming backward with handheld cinematic drone movement...</div>

<p>Congratulations. You've invented a camera operator's nightmare.</p>

<p>More instructions don't necessarily produce more control. Start with the one movement that matters most, then iterate. If the shot works but feels too static, add another carefully chosen element. If the camera is doing something strange, simplify. Direction is partly knowing what to leave out.</p>

<h2>Camera Movement for Image-to-Video</h2>

<p>Image-to-video deserves special attention. Your starting image already establishes much of the subject, composition, environment and visual style. That means the prompt can often spend more of its attention on what changes after frame one.</p>

<p>Instead of repeating everything visible in the image:</p>

<div class="example">Cinematic woman wearing a red coat standing on a rainy street with neon signs...</div>

<p>Try directing the motion:</p>

<div class="example">She slowly turns toward the camera as wind moves her hair and coat. The camera gently pushes closer while neon reflections ripple across the wet pavement behind her.</div>

<p>The image handles much of the <em>what</em>. The prompt directs much of the <em>what happens next</em> — the same is true whether you <a href="/generate">generate</a> the shot from a still or from text.</p>

<h2>A Reusable Camera Prompt Formula</h2>

<p>When you're unsure how to structure a shot, try:</p>

<div class="callout"><strong>[Shot size] + [subject / action] + [camera movement] + [environmental motion] + [lighting / style] + [end state]</strong></div>

<p>For example:</p>

<div class="example">Wide shot of a lone astronaut walking across a frozen lake. The camera slowly tracks beside her at matching speed while snow blows across the ice. Cold blue twilight, distant mountains barely visible through fog. The camera gradually falls behind as she continues toward a faint light in the distance.</div>

<p>Notice the last sentence. The shot has an ending. That's useful because filmmaking isn't just composition. It's change over time.</p>

<p>If assembling all of that by hand feels like a lot, the <a href="/prompt-builder">Video Prompt Builder</a> scaffolds each part for you.</p>

<h2>Before You Generate: Ask These Five Questions</h2>

<p>Before sending your next AI video prompt, ask yourself:</p>

<ul>
<li>Where is the camera?</li>
<li>How is the subject framed?</li>
<li>Does the camera move?</li>
<li>Why does it move?</li>
<li>Where should the shot end?</li>
</ul>

<p>If you can answer those five questions, you're no longer merely describing an image. You're beginning to direct a shot.</p>

<h2>Final Thought: Think Like a Director, Not a Prompt Engineer</h2>

<p>The terminology matters. But memorizing words like dolly, crane and tracking shot isn't the real skill. The real skill is understanding why a filmmaker would choose one over another.</p>

<p>A push-in can tell us: "Pay attention." A pull-out can tell us: "There's more here than you realized." A tracking shot can tell us: "Come with this character." A locked camera can tell us: "You aren't allowed to look away."</p>

<p>The best AI video prompts aren't necessarily the ones with the most technical terminology. They're the ones where the camera, subject, environment and story are all trying to accomplish the same thing. Shot choice is one piece of a larger <a href="/blog/how-to-make-ai-short-film">AI filmmaking workflow</a> — so don't just tell the model what the camera does. Decide what the shot means.</p>

<div class="cta-inline">
<strong>Build Your Next Shot</strong>
<p>Have the idea but don't want to assemble all the filmmaking language yourself? Use the RevaultAI Video Prompt Builder to turn a rough concept into a structured video prompt with camera direction, lighting, action, setting, visual style and more. Free. No account required.</p>
<a class="cta-btn" href="/prompt-builder">Build a Video Prompt</a>
</div>

<h2>Frequently Asked Questions</h2>

<h3>What camera movements work well in AI video prompts?</h3>
<p>Common movements include push-ins and pull-outs, tracking shots, pans, tilts, orbit shots, crane movements, aerial shots and handheld camera movement. The best choice depends on what the shot needs to communicate.</p>

<h3>Should every AI-generated shot have camera movement?</h3>
<p>No. A locked camera can be more effective than movement when you want stillness, tension, symmetry or uninterrupted attention on a performance.</p>

<h3>How do I describe camera movement in an AI video prompt?</h3>
<p>Be direct. Describe where the camera begins, how it moves relative to the subject and, when important, where it ends. For example: "The camera slowly tracks backward in front of the subject at walking speed."</p>

<h3>What's the difference between a pan and a tracking shot?</h3>
<p>A pan rotates the camera horizontally from its position. A tracking shot moves the camera through physical space with or around the subject.</p>

<h3>How should I prompt camera movement for image-to-video?</h3>
<p>Focus primarily on what should change after the starting frame: subject movement, environmental movement and camera behavior. Avoid unnecessarily redescribing visual information already established by the source image.</p>

<h3>Can I combine multiple camera movements?</h3>
<p>Yes, but use compound movements deliberately. A simple, well-defined movement is often easier to control than several competing camera instructions.</p>

<p class="editorial-note">AI video models evolve quickly, and their handling of camera language changes over time. The techniques here are deliberately model-agnostic — always check the current capabilities of the tools in your workflow.</p>
`,
  },
  {
    slug: "how-to-write-ai-video-prompts",
    title: "How to Write AI Video Prompts: A Filmmaker's Guide to Better Generations",
    seoTitle: "How to Write AI Video Prompts: Complete 2026 Guide",
    description:
      "Learn how to write better AI video prompts using camera direction, lighting, motion, composition, audio and cinematic storytelling. Includes examples, templates and practical prompting techniques.",
    date: "2026-08-16",
    author: "Richard Garland",
    category: "Guides",
    readingTime: "16 min",
    faq: [
      ["How long should an AI video prompt be?", "There is no ideal word count. A prompt should be long enough to communicate the shot clearly without introducing unnecessary or contradictory instructions. Simple shots may require only a sentence or two, while highly directed shots may benefit from more detail."],
      ["Should I say \"cinematic\" in AI video prompts?", "You can, but the word alone provides relatively little direction. Shot size, camera movement, lighting, composition and visual style communicate what you mean by cinematic much more precisely."],
      ["Why doesn't my AI video follow my entire prompt?", "You may be asking too much of one generation. Simplify the action, eliminate conflicting directions and consider breaking a complex sequence into several shots."],
      ["What's the best structure for an AI video prompt?", "A useful starting framework is Subject, Action, Environment, Shot, Camera, Lighting, Style, Motion, Audio. Adapt it rather than treating it as a rigid formula."],
      ["Is image-to-video better than text-to-video?", "Neither is universally better. Text-to-video offers more freedom and exploration. Image-to-video gives you a strong visual starting point and can provide greater control over composition, character appearance and style."],
      ["How do I make AI video look more cinematic?", "Think like a filmmaker rather than simply adding the word cinematic. Make deliberate decisions about framing, camera movement, lighting, blocking, depth, environmental motion, sound and what the shot is supposed to communicate."],
      ["Should every AI video prompt include camera movement?", "No. A locked camera can be just as intentional as an elaborate tracking shot. Movement should serve the shot."],
    ],
    content: `
<p>AI video prompting is often treated like a contest to see who can write the longest description. It isn't. A great video prompt doesn't describe everything imaginable — it directs a shot.</p>

<p>That distinction matters. If you're generating an image, describing what something looks like may be enough. Video introduces another dimension: time. Something has to happen. A person moves, a camera follows, wind pushes through a room, light changes, someone hesitates before answering a question.</p>

<p>Good AI video prompting is less about piling adjectives into a paragraph and more about communicating the same things a director communicates to a cinematographer, a performer and a crew. This guide shows you how. If you want the wider context first, it sits alongside our <a href="/blog/how-to-make-ai-short-film">complete AI short film workflow</a>.</p>

<h2>The AI Video Prompting Framework</h2>

<p>A useful framework for building a prompt is:</p>

<div class="callout"><strong>Subject → Action → Environment → Shot → Camera → Lighting → Visual Style → Motion → Audio</strong></div>

<p>You won't need every element in every prompt. But understanding them gives you control.</p>

<h3>1. Subject</h3>

<p>Who or what are we looking at? Instead of "a woman," try "a woman in her early thirties wearing a weathered orange utility jacket." Instead of "a robot," try "a battered silver delivery robot with one flickering blue eye."</p>

<p>Give the model enough to establish the subject without burying it under irrelevant detail. Ask what visually defines them, and what actually matters to this shot. If a detail needs to stay consistent across multiple shots — clothing, hairstyle, age, a particular prop — it's worth establishing clearly, and worth reusing the same wording each time; our guide to <a href="/blog/ai-video-character-consistency">character consistency in AI video</a> covers the wider workflow.</p>

<h3>2. Action</h3>

<p>Now answer the most important video question: what happens?</p>

<p>Compare "a detective in a diner" with "a detective sits alone in a nearly empty diner, slowly stirring untouched coffee while watching someone outside through the rain-covered window." Now there's a shot.</p>

<p>Actions can be extremely subtle. Someone might slowly raise their eyes, hesitate before opening a door, tighten their grip on an object, turn toward a sound, stumble backward, or remain perfectly still while the environment moves around them. Don't mistake more action for better action — one meaningful action is usually more useful than six competing ones.</p>

<h3>3. Environment</h3>

<p>Environment gives the model spatial and atmospheric context. "A man walks" becomes "a man walks through an abandoned subway station partially flooded with ankle-deep water." Now the environment participates: water ripples around his shoes, lights reflect from the floor, the architecture establishes scale.</p>

<p>Think about location, time of day, weather, background activity, foreground objects and atmosphere — but don't turn the environment into a furniture inventory. Describe the details that matter visually.</p>

<h3>4. Choose the Shot</h3>

<p>Here's where prompting starts becoming filmmaking. Don't just tell the model what to see. Tell it how we're seeing it: extreme wide, wide, medium, medium close-up, close-up, extreme close-up, over-the-shoulder, two-shot, POV, low angle, high angle, top-down, macro.</p>

<p>The shot size changes the meaning. Consider "wide shot of a lone astronaut standing inside an enormous abandoned hangar" versus "extreme close-up of the astronaut's eyes reflecting the abandoned hangar." Same character, completely different storytelling — the first communicates scale and isolation, the second communicates reaction.</p>

<p>Ask what information the audience needs from this shot, then frame accordingly.</p>

<h3>5. Direct the Camera</h3>

<p>Camera movement is one of the most powerful and most frequently abused parts of a prompt. The useful vocabulary is small and precise:</p>

<ul>
<li><strong>Static / locked</strong> — the camera doesn't move</li>
<li><strong>Pan</strong> — rotates horizontally; <strong>tilt</strong> — rotates vertically</li>
<li><strong>Dolly in / out</strong> — physically moves toward or away from the subject</li>
<li><strong>Tracking shot</strong> — travels with the subject; <strong>truck</strong> — moves sideways</li>
<li><strong>Crane</strong> — moves vertically or through a sweeping elevated path</li>
<li><strong>Arc / orbit</strong> — circles the subject</li>
<li><strong>Handheld</strong> — introduces instability and immediacy</li>
<li><strong>Aerial / drone</strong> — moves through the scene from above</li>
</ul>

<p>These aren't interchangeable vocabulary words. They change how a shot feels, and movement should have a reason. If a character realizes she's being followed, "slow dolly inward as her expression changes from confusion to fear" gradually closes the space between us and her. But "static wide shot as she realizes someone is standing motionless behind her" creates tension precisely through stillness. Cinematic camera movement isn't automatically better than a locked camera — sometimes not moving is the directing choice. For a shot-by-shot tour of each move and when to reach for it, see our guide to the <a href="/blog/ai-video-camera-shots-movements">camera shots and movements</a> every AI filmmaker should know.</p>

<h3>6. Lighting Is Storytelling</h3>

<p>Instead of adding "cinematic lighting" to every prompt, describe where the light comes from and what it's doing. Compare that phrase with "cold moonlight enters through the blinds while a warm desk lamp illuminates one side of his face." The second gives the model something concrete.</p>

<p>Think about source, direction, intensity, color temperature, contrast, shadows and practical lights:</p>

<div class="example">Harsh fluorescent ceiling lights create pale green highlights and deep shadows beneath the eyes.</div>
<div class="example">Soft morning sunlight diffuses through sheer curtains, creating low-contrast natural light.</div>
<div class="example">Flashing red emergency lights intermittently illuminate the dark corridor.</div>

<p>Lighting shouldn't simply make the shot prettier. It should help establish the world.</p>

<h3>7. Define Style Without Drowning in Adjectives</h3>

<p>This is where prompts go off the rails: "cinematic, masterpiece, ultra cinematic, incredible, award-winning, stunning, breathtaking, 8K, hyperrealistic, professional cinematography." That isn't direction. It's enthusiasm.</p>

<p>Instead, define the visual language:</p>

<div class="example">Restrained 1970s science-fiction aesthetic, practical production design, muted earth tones, subtle film grain.</div>
<div class="example">Clean contemporary commercial photography, high-key lighting, crisp surfaces, controlled studio reflections.</div>
<div class="example">Naturalistic documentary aesthetic, available light, handheld observational camera.</div>

<p>Specific aesthetic decisions communicate more than stacks of generic quality words.</p>

<h3>8. Describe Motion, Not Just Objects</h3>

<p>Video models have to understand how the world changes over time, so don't forget secondary motion. "A woman stands on a train platform" becomes far more alive as: "a woman stands motionless on an outdoor train platform while wind pushes her coat and loose hair sideways. Commuters pass behind her in soft motion blur. A train approaches in the distance."</p>

<p>The subject barely moves, but the shot is alive. Look for motion in hair, clothing, smoke, steam, rain, dust, foliage, crowds, reflections, shadows, vehicles, water and background characters. Environmental movement can make an otherwise simple generation feel dramatically more convincing.</p>

<h3>9. Add Audio Intentionally</h3>

<p>Modern AI video models increasingly support native or prompt-directed audio. Think in three layers.</p>

<p><strong>Dialogue</strong> — what is said, and how? Consider emotion, volume, pace, vocal quality and pauses, not just the words. <strong>Sound effects</strong> — what would actually make sound here? "Soft electrical buzzing, rain hitting the metal roof, distant thunder." <strong>Music</strong> — if the shot needs it, describe its function: "sparse ambient synth score slowly increasing in tension."</p>

<p>But don't automatically add music. Sometimes "no music, only room tone and breathing" is the stronger choice.</p>

<h2>Putting It Together</h2>

<p>Let's build a prompt progressively.</p>

<p><strong>Weak:</strong></p>
<div class="example">A woman in a space station.</div>
<p>We know the subject and approximate location. Not much else.</p>

<p><strong>Better:</strong></p>
<div class="example">A woman sits alone inside an abandoned space station at night. She looks through a window at Earth.</div>
<p>We have an action now, but we're still leaving most of the filmmaking to the model.</p>

<p><strong>Directed:</strong></p>
<div class="example">Medium close-up of a woman in her early thirties wearing a faded orange utility jacket, sitting alone inside the dark observation deck of an abandoned orbital station. She slowly raises her eyes toward a large window as Earth comes into view beyond the glass. The camera performs a subtle dolly inward. Cold blue light from Earth illuminates her face while dim amber instrument lights glow behind her. Restrained cinematic science-fiction realism, shallow depth of field, subtle natural movement. Quiet electrical hum, distant structural creaks, no music.</div>

<p>We've now directed the subject, the action, the environment, the shot size, the camera, the lighting, the style, the motion and the audio. The prompt isn't better because it's longer. It's better because the additional words have jobs.</p>

<h2>One Shot, One Purpose</h2>

<p>One of the easiest ways to break a generation is asking too much of it:</p>

<div class="example">A man enters a bar, sits down, orders a drink, notices his ex-wife across the room, walks over to her, they argue, she throws her drink at him and he leaves.</div>

<p>That's not a shot. That's a scene. Break it up:</p>

<ul>
<li><strong>Shot 1</strong> — Wide tracking shot following a tired man entering a dim hotel bar and walking toward an empty stool.</li>
<li><strong>Shot 2</strong> — Medium shot as he sits at the bar and quietly signals the bartender.</li>
<li><strong>Shot 3</strong> — Close-up. He suddenly stops moving as something across the room catches his attention.</li>
<li><strong>Shot 4</strong> — Over-the-shoulder shot revealing a woman seated at a corner table.</li>
</ul>

<p>Now the model has manageable jobs. And more importantly, you have an edit.</p>

<h2>Prompt for What the Audience Sees</h2>

<p>Avoid relying too heavily on abstract backstory. "Marcus is devastated because his brother died ten years ago and this is the first time he's returned home since the funeral" may help establish context, but almost none of it is visible.</p>

<p>Translate emotion into performance instead: "Marcus stands silently in the doorway of his childhood bedroom. His shoulders remain tense. He reaches toward an old photograph on the desk, hesitates before touching it, then slowly lowers his hand."</p>

<p>AI video models generate pictures and sound. Give internal ideas external evidence.</p>

<h2>Image-to-Video Prompting Is Different</h2>

<p>When you start from an image, that frame has already established much of the shot — what the character looks like, what they're wearing, where they are, the composition, the color, the lighting and the visual style. You don't need to describe all of that again.</p>

<p>Concentrate instead on what changes after frame one. If your starting image shows a woman beneath a neon sign in the rain, don't re-describe her hair and jacket. Write:</p>

<div class="example">She slowly looks over her shoulder as wind moves her hair and jacket. Rain continues falling around her. The camera gently pushes toward her face. Her expression changes from calm to concerned as she notices something behind the camera.</div>

<p>The image handles appearance. The prompt handles time. That's the division of labor.</p>

<div class="cta-inline">
<strong>Put the technique into practice.</strong>
<p>Generate from text or a starting image with leading AI video models directly on RevaultAI.</p>
<a class="cta-btn" href="/generate">Generate Video</a>
</div>

<h2>Prompting Dialogue</h2>

<p>Dialogue deserves restraint. If a shot contains dialogue, give the character enough time to actually perform it. Don't ask someone to deliver five sentences while running down a hallway, firing a weapon and changing expression six times in an eight-second clip.</p>

<p>Break the scene apart:</p>

<div class="example">Medium close-up. The woman stares at the radio, barely breathing. After a short pause she quietly says: "I know that voice."</div>

<p>Then cut, and let another shot carry the response. Treat dialogue as a performance, not a caption.</p>

<h2>Camera Movement Without Chaos</h2>

<p>A common mistake is stacking every move at once: "dolly zoom tracking orbit crane shot cinematic camera movement." Pick one movement and know why you're using it.</p>

<ul>
<li><strong>For intimacy</strong> — slow dolly inward</li>
<li><strong>For isolation</strong> — slow dolly backward, gradually revealing the enormous empty room around him</li>
<li><strong>For energy</strong> — fast handheld tracking shot following alongside the runner</li>
<li><strong>For revelation</strong> — camera slowly cranes upward, revealing thousands of people beyond the wall</li>
<li><strong>For importance</strong> — slow controlled arc around the subject</li>
<li><strong>For tension</strong> — locked camera, no movement at all</li>
</ul>

<h2>How Much Detail Is Too Much?</h2>

<p>There's no magic prompt length. Ask instead whether every instruction is helping the shot. A fifty-word prompt can be excellent. A 250-word prompt can be excellent. A 250-word prompt can also be a confused pile of contradictions.</p>

<p>Watch for instructions fighting each other: static handheld camera, fast slow movement, bright low-key lighting, extreme close-up showing the entire city. More detail doesn't fix contradictory direction. Clarity beats volume.</p>

<h2>Change One Thing at a Time</h2>

<p>Suppose the generation is almost right, but the camera moves too aggressively. Don't rewrite the character, location, lighting, lens, action and style all at once. Change "fast dolly inward" to "extremely slow, subtle dolly inward" and generate again.</p>

<p>Treat prompting like an experiment and change variables deliberately. Otherwise, when the next generation improves, you won't know why.</p>

<h2>Use References and Frames When Available</h2>

<p>Text isn't your only directing tool. Depending on the model and workflow, you may be able to use starting images, ending images, character references, scene references, previous video, reference audio or seeds.</p>

<p>Use them when available. Trying to force exact visual continuity entirely through prose is inefficient — a picture communicates character appearance, costume, composition and production design instantly. When a model supports first-and-last-frame generation, the two images can establish where a shot begins and ends, leaving the model to generate the transition between them.</p>

<p>Model behavior varies here, so it's worth knowing which tool you're working in. Our <a href="/blog/which-ai-video-model-to-use-seedance-veo-kling-wan">comparison of Seedance 2.0, Veo 3.1, Kling 3.0 and Wan 2.6</a> covers where each one is strongest.</p>

<h2>Advanced: Prompt With Time</h2>

<p>For more complicated generations, think temporally. Instead of describing a collection of actions, specify their order:</p>

<div class="example"><strong>0–3 seconds:</strong> Wide shot. A man stands alone beneath a streetlight while heavy snow falls around him. Camera remains locked.<br><br><strong>3–6 seconds:</strong> He notices something offscreen and slowly turns his head.<br><br><strong>6–10 seconds:</strong> The camera begins a subtle dolly inward as his expression changes from confusion to recognition.</div>

<p>This can be useful when the model responds well to structured prompting. But don't use timestamps merely because they look sophisticated — use them when timing actually matters.</p>

<h2>Negative Prompts: Use Them Surgically</h2>

<p>If your model supports negative prompting, use it to address recurring unwanted results rather than turning it into a giant superstition list copied from somewhere online. Start with the positive direction, then exclude specific problems: "no camera shake, no additional people entering frame."</p>

<p>Behavior and availability vary by model, so use the controls provided by the system you're generating with rather than assuming every model interprets negative prompts identically.</p>

<h2>The Prompt Is Not Sacred</h2>

<p>This might be the most useful advice in the guide. If a generation contains four incredible seconds and six broken ones, use the four seconds. Don't spend another twenty generations trying to make the original prompt produce a flawless ten-second shot just because that's what you first imagined.</p>

<p>AI filmmaking isn't a prompt-writing competition. The prompt is a production tool. The footage is what matters.</p>

<h2>A Reusable Prompt Template</h2>

<div class="callout"><strong>[Shot / composition]</strong> of <strong>[subject + important visual details]</strong> <strong>[performing a clear action]</strong> in <strong>[environment + relevant atmospheric details]</strong>. <strong>[Camera movement]</strong>. <strong>[Lighting direction and quality]</strong>. <strong>[Visual style]</strong>. <strong>[Secondary motion]</strong>. <strong>[Dialogue / sound / ambience / music if needed]</strong>.</div>

<p>In practice:</p>

<div class="example">Low-angle medium shot of a battered service robot standing in the doorway of an abandoned roadside diner at dawn. The robot slowly steps inside and looks around the empty room. Camera gently tracks backward as it approaches. Pale morning sunlight enters through dusty windows, creating long shadows across the floor. Restrained retro-futurist realism, weathered practical design, muted colors. Dust drifts through the light and a broken ceiling fan turns slowly overhead. Quiet wind outside, soft mechanical footsteps, distant electrical buzz, no music.</div>

<p>That's a prompt with a job.</p>

<h2>A Quick Checklist</h2>

<p>Before generating, ask:</p>

<ul>
<li><strong>Subject</strong> — is it obvious what we're looking at?</li>
<li><strong>Action</strong> — does something clearly happen?</li>
<li><strong>Environment</strong> — do we know where the action occurs?</li>
<li><strong>Composition</strong> — have I chosen the right shot size?</li>
<li><strong>Camera</strong> — should the camera move? If so, how and why?</li>
<li><strong>Lighting</strong> — where is the light coming from?</li>
<li><strong>Style</strong> — have I defined a visual language instead of stacking buzzwords?</li>
<li><strong>Motion</strong> — what else moves in the scene?</li>
<li><strong>Audio</strong> — what should we hear?</li>
<li><strong>Timing</strong> — am I asking for too much within the clip?</li>
<li><strong>Purpose</strong> — what does this shot contribute to the film?</li>
</ul>

<p>You don't need to specify all eleven every time. But you should know the answers.</p>

<h2>Frequently Asked Questions</h2>

<h3>How long should an AI video prompt be?</h3>
<p>There's no ideal word count. A prompt should be long enough to communicate the shot clearly without introducing unnecessary or contradictory instructions. Simple shots may require only a sentence or two, while highly directed shots may benefit from more detail.</p>

<h3>Should I say "cinematic" in AI video prompts?</h3>
<p>You can, but the word alone provides relatively little direction. Shot size, camera movement, lighting, composition and visual style communicate what you mean by "cinematic" much more precisely.</p>

<h3>Why doesn't my AI video follow my entire prompt?</h3>
<p>You may be asking too much of one generation. Simplify the action, eliminate conflicting directions and consider breaking a complex sequence into several shots.</p>

<h3>What's the best structure for an AI video prompt?</h3>
<p>A useful starting framework is subject, action, environment, shot, camera, lighting, style, motion, audio. Adapt it rather than treating it as a rigid formula.</p>

<h3>Is image-to-video better than text-to-video?</h3>
<p>Neither is universally better. Text-to-video offers more freedom and exploration. Image-to-video gives you a strong visual starting point and greater control over composition, character appearance and style.</p>

<h3>How do I make AI video look more cinematic?</h3>
<p>Think like a filmmaker rather than adding the word "cinematic." Make deliberate decisions about framing, camera movement, lighting, blocking, depth, environmental motion, sound and — most importantly — what the shot is supposed to communicate.</p>

<h3>Should every AI video prompt include camera movement?</h3>
<p>No. A locked camera can be just as intentional as an elaborate tracking shot. Movement should serve the shot.</p>

<h2>Better Prompting Is Better Directing</h2>

<p>The most important shift is simple. Stop asking "how do I describe this image?" and start asking "how would I direct this shot?"</p>

<p>Where is the camera? What does the subject do? What moves in the background? Where does the light come from? What changes between the first frame and the last? What should we hear? And why does this shot exist?</p>

<p>As AI video models improve, they'll handle more of the technical work. That doesn't make direction less important — it makes taste, intention and decision-making more valuable. The goal isn't to write the world's most impressive prompt. It's to make a shot worth putting in your film.</p>

<div class="cta-inline">
<strong>Turn your prompt into a film.</strong>
<p>Generate your next shot on RevaultAI, then submit the finished work to the Gallery for consideration.</p>
<a class="cta-btn" href="/generate">Generate Video</a>
<a class="cta-btn cta-btn-ghost" href="/submit">Submit Your Film</a>
</div>

<p class="editorial-note">AI filmmaking is evolving quickly. Model capabilities and available tools can change over time, so always check the current capabilities of the tools in your workflow.</p>
`,
  },
  {
    slug: "how-to-make-ai-short-film",
    title: "How to Make an AI Short Film in 2026: From Idea to Final Cut",
    seoTitle: "How to Make an AI Short Film in 2026: Complete Workflow",
    description:
      "Learn how to make an AI short film from idea to final cut. A practical 2026 workflow covering scripts, shot lists, prompting, continuity, AI video generation, sound, editing and upscaling.",
    date: "2026-08-16",
    author: "Richard Garland",
    category: "Guides",
    readingTime: "14 min",
    faq: [
      ["Can you make an entire short film with AI?", "Yes. AI can now contribute to nearly every stage of short-film production, including concept development, imagery, video generation, dialogue, sound and post-production. In practice, creators still need to direct individual shots, select takes, maintain continuity and assemble the finished work in an edit."],
      ["How long should my first AI short film be?", "There is no required length, but starting small is useful. A focused 30 to 90 second film can teach you more about continuity, pacing and editing than attempting a ten-minute project you never finish."],
      ["Should I use text-to-video or image-to-video?", "Use both. Text-to-video is excellent for exploration and shots where exact composition matters less. Image-to-video provides a stronger visual anchor when character appearance, wardrobe, location or composition needs to remain consistent."],
      ["Do I need to use the same AI model for every shot?", "No. Different models have different strengths. Using multiple models within one project can work well as long as your visual direction and final edit make the footage feel like part of the same film."],
      ["How do I make an AI film look less like disconnected AI clips?", "Plan before generating. Establish recurring visual rules, build character and location references, generate from a shot list, preserve continuity between shots, and pay close attention to editing and sound. A coherent film comes from the decisions connecting the shots, not merely the quality of each generation."],
      ["What makes a good AI film?", "The same thing that makes any short film work: an idea worth watching, intentional direction, compelling images, strong pacing, thoughtful sound and an edit that serves the story."],
    ],
    content: `
<p>AI can generate a beautiful ten-second clip in minutes. Making a film is different.</p>

<p>A film needs intention. Shots need to belong together. Characters need to remain recognizable. Camera choices need purpose. Sound needs to support the story. And somewhere along the way, a collection of generated clips has to become something worth watching from beginning to end.</p>

<p>The good news is that AI filmmaking in 2026 is capable enough that an individual creator can tackle projects that once required a much larger production. The trick is to stop thinking like someone generating videos and start thinking like a filmmaker. This guide walks through the process.</p>

<h2>1. Start With the Story, Not the Model</h2>

<p>It's tempting to open an AI video generator before you know what you're making. Don't. Start with a simple question: what should the audience feel by the end? Fear, wonder, grief, relief, curiosity, laughter. That answer gives the film direction.</p>

<p>For an early AI short, smaller ideas are usually better. Instead of a sprawling ten-minute science-fiction epic with twelve characters and eight locations, build around one central character, one or two locations, one clear conflict, one visual idea and one emotional turn.</p>

<div class="example">Every night, a woman working alone in a radio observatory receives a transmission from Earth — except Earth disappeared twenty years ago.</div>

<p>That's enough. You don't need pages of mythology before making the first shot. You need a situation, a character, and a reason for the audience to keep watching.</p>

<h3>Write a logline</h3>

<p>Try reducing the film to one sentence: character, situation, conflict. If you can't explain the movie simply, generating more footage usually won't solve the problem.</p>

<h2>2. Write for Shots</h2>

<p>Traditional screenwriting and AI filmmaking aren't quite the same. Most AI video models still work best when you ask them to create relatively contained moments, so while your story should flow continuously, your production plan should think in shots.</p>

<p>Take this: "Maya enters the abandoned station, discovers an old radio still operating, hears a voice, realizes it's her own, and runs outside." That's a scene. But it's several shots:</p>

<ul>
<li><strong>Shot 1 — Exterior establishing</strong> — An abandoned desert radio station at dusk.</li>
<li><strong>Shot 2 — Interior tracking</strong> — Maya walks through a dark control room with a flashlight.</li>
<li><strong>Shot 3 — Insert</strong> — An analog radio suddenly illuminates.</li>
<li><strong>Shot 4 — Close-up</strong> — Maya freezes when a voice comes through the speaker.</li>
<li><strong>Shot 5 — Extreme close-up</strong> — Recognition crosses her face.</li>
<li><strong>Shot 6 — Wide tracking</strong> — She runs from the station into the desert.</li>
</ul>

<p>Now you have something generative models can work with.</p>

<h3>Build a shot list before generating</h3>

<p>For each shot, decide the subject, action, location, shot size, camera angle, camera movement, lighting, approximate duration, dialogue or sound, and what must remain consistent from the previous shot. This simple step saves a remarkable amount of wasted generation. If you're still building that vocabulary, our guide to <a href="/blog/ai-video-camera-shots-movements">camera shots and movements</a> breaks down the options one at a time.</p>

<h2>3. Establish the Visual Language</h2>

<p>Before generating twenty unrelated clips, decide what world they belong to. Think like a cinematographer. What's the aspect ratio? How does the camera move? What lenses would this imaginary production use? Is the lighting soft and naturalistic or harsh and theatrical? Are the colors warm, cold, muted, saturated? Does the camera feel observational or aggressive?</p>

<p>A film might establish rules such as:</p>

<div class="example">Muted earth tones. Naturalistic lighting. Shallow depth of field. Mostly locked-off compositions with slow deliberate camera movement. No handheld movement until the final sequence.</div>

<p>Those rules become part of the film's visual identity. You don't have to repeat every detail word-for-word in every generation, but a consistent visual bible gives you something to direct toward.</p>

<h3>Build references</h3>

<p>If your film has recurring characters, costumes, props or locations, create reference material before serious video generation begins: character references, wardrobe, locations, important props, color palette, lighting, representative frames.</p>

<p>The goal isn't pretty concept art. You're establishing continuity anchors.</p>

<h2>4. Decide Between Text-to-Video and Image-to-Video</h2>

<p>Both approaches are useful, but they solve different problems.</p>

<p><strong>Text-to-video</strong> lets you describe the shot and have the model interpret it. It's useful when you're exploring ideas, when exact composition isn't critical, when you want the model to surprise you, and when the environment matters more than character continuity. It can be fantastic for establishing shots and atmospheric sequences.</p>

<p><strong>Image-to-video</strong> starts from a frame you provide, giving considerably more control over the opening composition. It's especially useful when a recurring character must look consistent, when wardrobe matters, when composition needs to match another shot, or when you've already created the exact frame you want.</p>

<p>For narrative filmmaking you'll often use both. The mistake is treating the choice as ideological — use whichever gives you the control the shot requires.</p>

<h2>5. Choose the Model for the Shot</h2>

<p>There doesn't have to be one AI model behind an entire film. Think of models as tools in a production kit. One may give you the visual quality you want for a quiet dialogue scene. Another may perform better when five people are running through a chaotic environment. Another might be ideal for inexpensive iterations before committing to a final shot.</p>

<p>Ask what's difficult about this particular generation. Is it complex motion, dialogue, camera control, physical realism, facial performance, speed, or cost? That answer should drive your model choice.</p>

<p>A finished AI film can contain shots generated by several different systems and still feel cohesive, as long as the direction, cinematography, edit and sound are consistent.</p>

<p>Not sure which model fits the shot? Read our <a href="/blog/which-ai-video-model-to-use-seedance-veo-kling-wan">comparison of Seedance 2.0, Veo 3.1, Kling 3.0 and Wan 2.6</a> to see where each one excels.</p>

<div class="cta-inline">
<strong>Ready to make your first shot?</strong>
<p>Generate AI video with Seedance, Veo, Kling and Wan using one RevaultAI credit balance — no separate subscriptions or API keys.</p>
<a class="cta-btn" href="/generate">Generate Video</a>
</div>

<h2>6. Prompt Like a Director</h2>

<p>A useful AI video prompt describes what should happen on screen. One practical structure is subject, action, environment, shot, camera movement, lighting, style, motion, audio. You won't need every element every time.</p>

<div class="example">A woman in her early thirties wearing a faded orange utility jacket sits alone inside an abandoned radio observatory at night. She slowly turns toward an analog receiver as its indicator light flickers on. Medium close-up, slow dolly inward. Cold moonlight enters through the windows while warm amber equipment lights illuminate one side of her face. Restrained cinematic realism, subtle natural movement. The room is nearly silent except for electrical hum and distant desert wind.</div>

<p>Notice what the prompt is doing. It isn't merely describing an aesthetic — it's directing an event.</p>

<p>A common mistake is asking for too much: "she enters the building, crosses the room, notices the radio, turns it on, hears the transmission, cries, looks through the window, sees a spacecraft and runs outside." That's practically a sequence. Break it apart. Giving a generation one clear dramatic purpose produces stronger footage than cramming half the screenplay into ten seconds.</p>

<p>For a deeper treatment of this, see our <a href="/blog/how-to-write-ai-video-prompts">full guide to writing AI video prompts</a>.</p>

<h2>7. Generate Takes, Not Answers</h2>

<p>This is one of the biggest mindset changes in AI filmmaking. Don't think in terms of generate, then success or failure. Think take one, take two, take three.</p>

<p>Traditional filmmakers don't expect every take to be perfect, and neither should you. Maybe one generation has the perfect performance but mediocre camera movement. Another nails the camera. Another contains three incredible seconds at the end. Keep them all. AI video generation produces raw material, and your film is discovered partly in the edit.</p>

<p>When something isn't working, avoid rewriting the entire prompt immediately. Ask what failed — the motion, composition, performance, camera, continuity — then adjust that part. Iteration becomes much easier when you know what variable you're testing.</p>

<h2>8. Protect Continuity</h2>

<p>Continuity remains one of the hardest parts of generative filmmaking. Your protagonist shouldn't mysteriously change jackets. The room shouldn't gain another door. A scar shouldn't switch sides. Night shouldn't become afternoon between consecutive shots.</p>

<p>Keep a simple continuity sheet covering character details (hair, face, age, wardrobe, accessories), location details (architecture, major objects, lighting, time of day) and cinematography (palette, lens character, depth of field, camera behavior). Where possible, use approved frames from earlier shots as references for later ones.</p>

<p>Perfect pixel-level consistency isn't always necessary. Perceptual consistency is. The audience needs to believe they're still watching the same person in the same world. For a full workflow, see our guide to how to <a href="/blog/ai-video-character-consistency">keep characters consistent across shots</a>.</p>

<h2>9. Extend When a Shot Needs More Time</h2>

<p>Sometimes you generate exactly the shot you wanted, except it ends too soon. Don't automatically regenerate it. Video extension can continue from an existing clip while preserving its motion, composition and visual language — useful for holding a reaction longer, continuing camera movement, extending an action, creating breathing room before a cut, or building longer continuous sequences.</p>

<p>Extensions can themselves be extended, which means the maximum duration of an individual generation doesn't have to determine the maximum duration of your scene. But use extension intentionally. A shot being longer doesn't automatically make it better, and sometimes the best edit is still the cut.</p>

<h2>10. Treat Dialogue as Performance</h2>

<p>Dialogue isn't just words. It's timing, expression, breathing, pauses and body language. If you're generating spoken dialogue natively, write for what can comfortably happen within the shot. A character delivering a paragraph while simultaneously performing complicated physical actions is asking a lot from one generation.</p>

<p>Simplify. Let a character speak. Let another react. Cut between them. That's filmmaking.</p>

<p>If you've generated the visual performance separately, <a href="/ai-video-generator">lip-sync tools</a> let you build the vocal performance independently and align the character's mouth to the finished audio, giving you more control over delivery, emotion and timing.</p>

<h2>11. Don't Forget Sound</h2>

<p>Beautiful visuals with weak sound still feel unfinished. Sound sells a world that the image only suggests. Think in layers: dialogue (what characters actually say), ambience (rain, traffic, air conditioning, forest insects, machinery, crowd murmur, wind), effects (footsteps, doors, fabric, engines, glass, interface sounds) and music (what emotional job is the score performing?).</p>

<p>And don't be afraid of silence. A sudden absence of sound can be more powerful than another giant cinematic boom.</p>

<p>Native-audio video generation is increasingly useful, but generated audio should still be treated as material to evaluate and edit — not something you must keep simply because it arrived attached to the video.</p>

<h2>12. Upscale the Shots That Earn It</h2>

<p>Generating every experiment at maximum quality gets expensive. A more efficient workflow is draft, evaluate, refine, then upscale the keeper.</p>

<p>Use lower-cost generations to determine composition, movement, timing, performance and whether the idea works at all. Then spend additional resources on the shots that survive. <a href="/ai-video-generator">Upscaling</a> can improve final delivery resolution while maintaining temporal consistency across frames.</p>

<p>But remember: upscaling can improve a good shot. It cannot rescue bad direction.</p>

<h2>13. Edit Ruthlessly</h2>

<p>This is where your AI clips finally become a film. Bring your selects into an editor and forget how difficult they were to generate. The audience doesn't care that shot seventeen took forty attempts. If it hurts the movie, cut it.</p>

<p>Watch for pacing, redundant shots, awkward movement, continuity errors, shots that overstay their welcome, emotional beats that need more room, and places where sound can replace exposition.</p>

<p>A ten-second generation doesn't have to remain ten seconds. Maybe the film needs 2.7 seconds of it — use 2.7 seconds. Your generation is footage. The edit decides what the shot actually is.</p>

<h2>14. Watch the Film Without Looking at the Pictures</h2>

<p>Seriously. Play the rough cut and just listen. Does the sound tell a coherent story? Are dialogue levels consistent? Do transitions feel intentional? Does the ambience suddenly disappear between shots?</p>

<p>Then do the opposite and mute it. Can you still understand what's happening? These two passes reveal problems that are easy to miss when you're watching the complete audiovisual experience.</p>

<h2>15. Export, Then Watch It Like a Stranger</h2>

<p>Before publishing, export the entire film and get away from it for a little while. Then watch it start to finish without touching the timeline. Don't analyze prompts. Don't think about models. Don't remember how many credits a shot cost. Just watch the movie.</p>

<p>Ask: was I interested? Did I understand what was happening? Did I feel what the film wanted me to feel? Where did my attention drift? Those questions matter more than whether every frame is technically perfect.</p>

<h2>A Simple AI Short Film Workflow</h2>

<div class="flow">
<span>Idea</span><span>Logline</span><span>Script</span><span>Visual Bible</span><span>Storyboard / Shot List</span><span>Character &amp; Location References</span><span>Choose Model Per Shot</span><span>Generate Takes</span><span>Select &amp; Iterate</span><span>Extend / Lip Sync / Upscale Where Needed</span><span>Edit</span><span>Sound Design &amp; Music</span><span>Color &amp; Finishing</span><span>Final Export</span><span>Publish</span>
</div>

<p>Notice how little of that workflow is simply "write a prompt." That's the point.</p>

<h2>The Real Skill Is Direction</h2>

<p>AI video models will keep getting better. Resolution will increase, generation times will decrease, characters will become more consistent, longer generations will become easier. Today's technical limitations won't all remain limitations forever.</p>

<p>But better generation doesn't eliminate creative decisions. It makes them more important. When everyone can generate impressive images, which images you choose, how you sequence them, what you say with them and why they exist become the differentiators.</p>

<p>The AI filmmaker isn't simply the person operating the model. They're the person deciding what the model should make — and what belongs in the final film. That is directing.</p>

<h2>Frequently Asked Questions</h2>

<h3>Can you make an entire short film with AI?</h3>
<p>Yes. AI can now contribute to nearly every stage of short-film production, including concept development, imagery, video generation, dialogue, sound and post-production. In practice, creators still need to direct individual shots, select takes, maintain continuity and assemble the finished work in an edit.</p>

<h3>How long should my first AI short film be?</h3>
<p>There's no required length, but starting small is useful. A focused 30 to 90 second film can teach you more about continuity, pacing and editing than a ten-minute project you never finish.</p>

<h3>Should I use text-to-video or image-to-video?</h3>
<p>Use both. Text-to-video is excellent for exploration and shots where exact composition matters less. Image-to-video provides a stronger visual anchor when character appearance, wardrobe, location or composition needs to remain consistent.</p>

<h3>Do I need to use the same AI model for every shot?</h3>
<p>No. Different models have different strengths. Using multiple models within one project can work well as long as your visual direction and final edit make the footage feel like part of the same film.</p>

<h3>How do I make an AI film look less like disconnected AI clips?</h3>
<p>Plan before generating. Establish recurring visual rules, build character and location references, generate from a shot list, preserve continuity between shots, and pay close attention to editing and sound. A coherent film comes from the decisions connecting the shots, not merely the quality of each generation.</p>

<h3>What makes a good AI film?</h3>
<p>The same thing that makes any short film work: an idea worth watching, intentional direction, compelling images, strong pacing, thoughtful sound and an edit that serves the story. The technology may be new. The audience still wants to feel something.</p>

<div class="cta-inline">
<strong>Made something worth showing?</strong>
<p>Submit your finished AI film to the RevaultAI Gallery for consideration. Every submission is personally reviewed before publication.</p>
<a class="cta-btn" href="/submit">Submit Your Film</a>
</div>

<p class="editorial-note">AI filmmaking is evolving quickly. Model capabilities and available tools can change over time, so always check the current capabilities of the tools in your workflow.</p>
`,
  },
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

<p>You can <a href="/ai-video-generator">see how it works here</a>. If you're building a film rather than a single shot, our <a href="/blog/how-to-make-ai-short-film">complete AI short film workflow</a> covers the whole process end to end.</p>

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