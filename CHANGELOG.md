# Changelog

What changed in RevaultAI, newest first.

A version exists once it has a heading here. Nothing else marks one — there are
no git tags and `package.json` stays at `0.0.0`, because nobody pins a release
of a site that deploys continuously. This file answers the only question the
version number was ever standing in for: what changed since I last looked.

Entries are grouped as **Added**, **Fixed** and **Changed**. "Fixed" covers
claims the site was making that were not true, as well as code that misbehaved.

---

## v33 — November 11, 2026

Twenty-four commits. The headline is uncomfortable: almost everything in this
release was already written. Casting Call, published receipts and Part 2 had
all shipped, all passed their checks, and none of them worked. A casting call
404'd before the app loaded. A receipt link did the same. Part 2 wrote to a
column that did not exist. Three models were submitting to fal endpoints that
rejected them. And the default model had been sold for less than it cost to
run since the day its rate was set.

Not one of these was reported by anybody. Every one was found by building
something that compares two things nobody had compared: what we charge
against what fal charges, what we send against what fal accepts, and what the
router claims to serve against what the host will actually hand it.

So the second theme is the durable one. Four new build checks, and the rule
they share is that **an unverified thing is never reported as a passing
thing.** Three bugs this week were hidden by checks that looked for the
author's own artifact rather than for the capability — a policy by name, a
price unit in a hand-written fixture, one endpoint's schema generalized to
its neighbour. Each passed while proving nothing.

### Added

- **Part 2.** One press continues a take: the next shot opens on the frame
  the last one ended on, with the same cast, model, framing and length, and
  the previous prompt carried over as editable text. The frame is the one
  saved in End Frame if there is one, otherwise the clip's last frame, read
  in the browser and uploaded. `generations.continues_from` records the link,
  and a take that continues another says so above it.
- **Casting Call.** A role anyone can audition for with their own face.
  Whoever opens the link sees the role, the brief, who is casting and how
  many have turned up — never who they are. Most people who audition are not
  cast, which is the point: they leave holding a locked character pack of
  themselves. Casting does not shoot. Picking somebody creates an ordinary
  crew invite showing the actual scene, so being cast is a second and
  specific consent.
- **Published receipts have a page.** `/receipt/<id>` renders the same
  component the owner sees, in public mode, with its own title, snippet and
  link preview. A receipt is the one artifact here a filmmaker would rather
  show another filmmaker than show off.
- **Kling 4.0** at 4 credits a second — 1080p, and up to thirty seconds in a
  single take, for a third of what the same length costs on Seedance 2.5. Its
  schema was read from fal's own OpenAPI document rather than its docs page,
  which was wrong about both the price and the resolution tiers.
- **Vercel Web Analytics**, and the privacy policy now says so.
- **Four build checks.** `check-vercel` validates vercel.json against
  Vercel's schema and requires a rewrite for every route that carries an id.
  `check-margin` refuses to build when any model earns less than it costs at
  the deepest-discount pack, when the two price tables disagree, or when
  published copy quotes a rate the server does not charge. `check-payload`
  compares every field the generator can send against what each fal endpoint
  accepts and requires, offline. `npm run fal:schemas` refreshes what those
  last two compare against.

### Fixed

- **The default model was sold at a loss.** Wan 2.6 cost $0.100 a second on
  fal and earned $0.064 at the Studio rate — 0.64x, on every generation, for
  as long as the rate had existed. Kling 3.0 was underwater at the same pack.
  Both rates were raised. Nothing in the build had ever compared the two
  numbers because one of them lived on fal.
- **Every Kling 3.0 generation with a starting frame was rejected.** The
  endpoint requires `start_image_url`; we sent `image_url`. Found by a check
  on its first run against fal's real schemas, not by anyone using it.
- **Every Veo 3.1 text generation was submitted to an endpoint that does not
  exist.** `fal-ai/veo3.1/fast/text-to-video` 404s — the bare
  `fal-ai/veo3.1/fast` is the text-to-video endpoint. The id had been
  assumed from the pattern of its siblings.
- **Wan 2.6 silently discarded the aspect ratio** on its image route, which
  has no such field. A creator picked 9:16, got whatever shape their still
  was, and nothing said otherwise.
- **A casting call and a published receipt both 404'd.** Neither
  `/casting/<id>` nor `/receipt/<id>` had a rewrite to index.html, so Vercel
  looked for a static file, did not find one, and served the 404 page — the
  app never loaded and its router never saw the path. `/world/<id>` was the
  same. Prerendering hid it for `/film/` and `/blog/`, whose pages exist at
  build time, which is the worst way for a bug to behave: it works when you
  test with old data and fails for every real link.
- **Part 2 failed on insert** until its migration was run. Credits were
  refunded automatically, and ordinary generations were never affected,
  because the column is only written on a continuation.
- **`/vault`, `/projects` and `/settings` served the homepage**, byte for
  byte, with `index, follow` and a homepage canonical. The noindex rule had
  been right all along and never ran, because the loop that writes those
  pages only covers routes in `PAGES`.
- **Two deployments failed over a `"comment"` key** added to vercel.json to
  explain a redirect. JSON has no comments. Nothing in the build read that
  file; Vercel was the first thing to validate it.
- **A second, incomplete VideoObject** was being emitted client-side, which
  is what Search Console was reporting as a missing `uploadDate`.
- **`/explore` had no links to any film** and `/creators` none to any
  creator, so the two index pages a crawler is most likely to follow led
  nowhere. Creator pages ran to fourteen words.
- **The End Frame panel said it had attached a frame** to the next generation
  and had not — it sent a field the prefill never read.
- **The blog quoted the old credit rates in nine places**, two of them inside
  FAQ answers that become structured data on live pages. Published prices now
  fail the build if they disagree with what the server charges.
- **A check that asked fal what exists by submitting to it** queued
  twenty-seven real jobs. It reads the pricing API now, and submits nothing.

### Changed

- Wan 2.6 goes from 1 credit a second to 2, Kling 3.0 from 2 to 3. These are
  the smallest whole numbers that clear cost at the Studio rate, and they
  still clear it after payment fees. For most work the catalog got cheaper
  the same day, because Kling 4.0 does thirty seconds at 1080p for 120
  credits where the only previous thirty-second option was 360.
- What fal charges is recorded per endpoint, measured rather than
  remembered, and the admin check reports when a live price has drifted from
  it. A model's floor is its dearest path: MiniMax costs more through
  references than through text, and the dearer figure is the one its rate is
  held to.
- `robots.txt` disallows the app's own routes; the sitemap gained the tool
  pages that had shipped without it.

### Known limitations

- **Casting Call has no front door.** There is no UI to post a call — one is
  created by hand — and no scene picker, so casting somebody is API-only.
  Auditioning, which is the part a stranger does, works.
- **Kling 4.0 is wired for text and image only.** Its reference endpoint
  takes named `@Element` tokens, voices and reference videos, which is a
  different mechanism from anything else here. Its multi-shot prompts and its
  eight intermediate keyframes are also unused, and the second of those is a
  natural home for what the Frame Planner already produces.
- **Seedance 2.5 is still called "Long take"** though thirty seconds in one
  take is no longer what distinguishes it. Renaming a model creators have
  been buying is a decision, not a tidy-up.

---

## v28 — October 25, 2026

Seventy-one commits. The headline is that the site now does something it has
never done: it puts the person using it on screen. Everything before this
helped you make a film about somebody else.

A second theme runs underneath, and it is a constraint rather than a feature.
One rule decided the shape of five of these: **nobody is ever cast from a
photo somebody else uploaded of them.** Every face in every scene belongs to
somebody who built their own pack from their own photograph. It made the
friends-in-a-scene path slower to build and the life-film path considerably
slower, and the alternative was manufacturing locked identities of people who
never agreed to one.

### Added

- **Cast Yourself** at `/cast`. One photo becomes a locked character pack — a
  fixed description of face, build, distinguishing features and wardrobe,
  written once and never editable, reused word for word by every later prompt
  alongside the reference photos. Three gates run before a pack exists: one
  face, an adult, not a public figure, and every uncertain answer refuses. No
  account needed; the pack waits under a random token in `pending_packs` and
  moves into the Vault on sign-up, drawings included.
- **Animate Yourself.** Six mediums — cel-shade, ink halftone, Sunday funnies,
  stop-motion clay, watercolor wash, pencil rough — each drawing a set of
  poses that is recognizably one person. Four free, eight with an account. No
  studio, franchise or director names in the presets, and `protectedTermIn`
  refuses them in a prompt.
- **Cast Your Crew.** A scene with two or three people in it. The host picks
  the look and the beat and gets a link; whoever opens it sees who asked, what
  the scene is and how many seats are left, then adds their own photo. Nothing
  is shot and nothing charged until everybody is in.
- **Duets.** The same invite, accepted with a character you already have
  instead of a new photo — two locked identities, each already in films of
  their own, in one frame. Needed no new backend: `crew-join` already read an
  owned pack owner-scoped.
- **Lot Booth and Phone Remote.** A capture session with a six-character code,
  because the camera is never on the machine you are working at. Named angles
  — front, three-quarters each way, both profiles, chin up and down, full body
  — shot on a phone while the originating device watches them land. Four
  angles including the front one builds a pack. The booth is the same
  mechanism with an operator, and `capture_sessions_booth_operator` refuses a
  booth capture that has none, so studio provenance cannot be claimed by a
  caller who merely says so. Every frame runs the same three gates.
- **Memory Cinema** at `/memory`. A line about the day, up to six photos, a
  genre, and a character to play you. Photos are read for setting by a prompt
  told not to describe any person identifiably — not face, build, clothing or
  even how many there are. A day stays a draft until you ask for it: no
  overnight job, nothing charged until you tap. Other people appear only
  through `memory_grants`, a standing pass they create from their own
  character, revocable, lapsing in fourteen days, destroyed with the
  character, and re-checked by `castable_for` at the moment of filming rather
  than when the day was saved.
- **The Recording Studio** and cloned voices. A scene read aloud in your
  characters' own voices, cloned from a recording and stored in the Vault
  alongside their wardrobe.
- **End frames.** A shot can land on an exact closing frame.
- **Story Worlds**, measured and parked. `world_capsules` and `world_beats`
  lock a finished take into a place somebody can walk into and speak to. The
  gate said 0% of 71 real takes were usable; prompt extraction raised it to
  41% against a 70% bar, so it stays off. The diagnosis is upstream and it is
  the reason Cast Yourself exists: nothing at generation time was asking who
  is in the shot.
- **Prompt extraction.** `api/extract-prompt.js` reads cast and place out of a
  prompt when no structured record has them.
- **Six jobs on `/tools`,** not five. "Be in it yourself" is the first group
  whose subject is a person rather than a scene.
- **A dated "Recently added" section on the homepage,** for the visitor who
  does not follow any of this anywhere else.

### Fixed

- **Every Cast Yourself scene would have failed.** The page sent `duration: 8`
  and `seedance-2.5` accepts 5, 10, 15 or 30. Not one scene would have
  rendered. Found by a test harness, not by a user.
- **A host could swap a crew scene's beat after people joined.** The beat came
  from the request body, so faces collected for one scene could have been
  filmed in another. The look and the beat are now read off the invite and
  whatever the client sends is ignored.
- **Deleting a character left its capture frames in storage.**
  `capture_sessions.pack_id` was `on delete set null`, so the rows outlived
  the pack with a dangling pointer. It cascades now, and `delete-pack` reads
  `capture_keys_for_pack` before anything is dropped — files first, then rows.
- **A crew scene sent one reference image per person** while the solo path
  sent three, which made multi-angle captures worthless in exactly the scenes
  that need identity most. Both cap at three: nine across three packs fits
  every model's reference budget.
- **`world-gate` reported no finished takes against 71 real ones.** A failed
  query was being treated as an empty result. It and `lock-world` now report
  the error.
- **`end_frame_url` and `end_frame_at` had no migration.** `EndFrame.jsx` had
  been writing to columns that did not exist.
- **The Story Worlds gate measured an empty account.** It read only the
  caller's generations, and the admin account owns none. An admin-only
  `scope: "all"` lifts the owner filter across all four reads together or none
  — half-lifting would have reported other people's takes as unpeopled.
- **Prompt extraction ignored the Shot Spec,** reading only Vault entries and
  so reporting 0% usable where the cast was sitting in
  `spec.subjects.characters` and `continuityLocks`.
- **A partial unique index broke an upsert.** `ON CONFLICT` cannot infer one.
  Replaced with a plain unique constraint, which has the same semantics here.
- **Anonymous users could not store a selfie,** because `get-upload-url`
  requires auth. `build-pack` stores it server-side instead, which also closed
  a hole where a client could submit one face for gating and a different
  `imageUrl` as the stored reference.
- **Deleting an account left the face behind.** `delete-account.js` removed
  films and never touched packs.
- **`animated_sets` had no `pack_id`,** so deleting a character could not find
  its drawings.

### Changed

- **Sharing a rehearsal needs no account.** The old reasoning was that an
  unauthenticated endpoint accepting a blob of JSON is free storage for
  whoever finds it. True, but the answer is metering, not a sign-in: three
  anonymous links a day per caller, thirty-day life, and the scene sanitized
  on the server rather than only in the browser.
- **Type is readable at AA contrast** across the site.
- **Models are named for what they do,** not where they rank, and all five
  families are named consistently everywhere.

### Still true, and worth repeating

None of the Cast Yourself work has met production traffic. Seven migrations
and roughly fifteen endpoints were verified against a local PostgreSQL 16 and
stub harnesses, each check proven by deliberately breaking the code to confirm
it catches it. That found the duration bug and the orphaned frames before
anybody met them. It will not have found everything.

---

## v27 — October 14, 2026

Eighteen commits. The headline is that the Lot Supervisor became a real product
rather than five unconnected tools, and `App.jsx` stopped being a monolith.

### Added

- **Staging audit.** `src/lib/stageGeometry.js` reads a scene's setups against
  each other: axis crossings that name the performer whose screen position
  flips, reverse pairs that won't cut on mismatched focal lengths or camera
  heights, missing masters, and coverage that favors only one character. The
  geometry is computed, so the same scene always produces the same verdict.
- **The Lot Supervisor** at `/lot`. One surface for the five departments, with
  a coverage plan drawing every setup on a single overhead view, the line of
  action extended across the stage, and any camera that crosses it marked.
  Prerendered, in the sitemap, linked from `/blocking` and `/coverage`.
- **Staging board.** Drag performers, cameras, and the point each camera is
  aimed at; the axis, the shaded sides, the lens cones and the findings all
  recompute live. Needs no account. Shot size and lens follow the camera's
  distance, so matching a reverse means matching the distance.
- **Batch generation.** Select uncovered coverage slots, see the running credit
  total, confirm one itemized dialog, and the jobs go out with per-job failure
  reporting. Capped at ten.
- **Trusted creators.** `auto_approve` was read in one line and written nowhere.
  It now has a server route and an Admin table, so a proven creator's premium
  films skip the review queue.
- **Social cards** per page, drawn from the same titles the prerenderer uses.
- **`api/verify-models.js`** — asks fal whether every model id resolves,
  without generating anything or spending a credit.

### Fixed

- Terms of Service went from 370 words to 2,005, adding governing law,
  limitation of liability, indemnity, a termination process with notice,
  creator earnings, and dispute resolution.
- The Refund Policy and AI Content Disclaimer were still dated May 2025 and
  described a retired product. Both rewritten.
- The AI Content Disclaimer named Sora, MidJourney and Stable Diffusion. None
  of them run here. Replaced with the real providers.
- The tools page claimed "Fifteen tools." There are 22.
- The prompt builder advertised Sora as a target. It offers six models, and
  Sora is not among them.
- `--surface` was used throughout the interface and never defined, so dozens
  of panels rendered with no background at all.
- Covering a scene promised "credits of location plates to come." Nothing
  produced them. The promise and the dead code path are gone.
- "Polish" sent you to a prompt form with no indication of where Polish was.
  It is now labeled as living inside the clip list, and scrolls there.
- Veo never set `generate_audio`, so its native audio depended on a provider
  default. Set explicitly, with the parameter name verified against fal.
- Creator sitemap rows carried no last-modified date. They are now dated by the
  creator's most recent published film.
- Five page titles were over 60 characters and four descriptions over 155.
  All 34 pages are within budget.
- A duplicated `project_id` key in `api/scene-breakdown.js`, and a duplicated
  `credits` column in two profile selects.

### Changed

- **`src/App.jsx` went from 4,233 lines to 318** — now an app shell holding
  imports, auth state and the route switch. Thirty components became their own
  modules, and six shared helpers moved into libraries: `getSessionToken`,
  `avatarInitial`, `youtubeThumb`, `isAdmin`, the link and category helpers,
  and the application stylesheet.
- The video model table moved to `src/lib/genModels.js`, read by both the
  generator and the batch costing. It mirrors the server's own table, which is
  the authority — the two must stay in step or the price shown is not the price
  charged.
- `halfFovFor` was lifted out of `inFrame` so the drawn lens cone and the
  in-frame test share one set of numbers.
- ESLint now knows `api/` and `scripts/` run in Node. That cleared 206 false
  errors and took the real count from 294 to 83.

### Known limitations

- Social cards render in Noto Sans, the only font `@vercel/og` bundles.
- The staging board holds its scene in memory; it does not save yet.
- Creator payouts are arranged directly, not through Stripe Connect. The
  Privacy Policy describes the Connect version and is ahead of the code.
