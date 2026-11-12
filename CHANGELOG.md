# Changelog

What changed in RevaultAI, newest first.

Versions are numbered by the release notes, which are the record; there are no
git tags and `package.json` stays at `0.0.0`, because nobody pins a release of
a site that deploys continuously. The notes carry the full account of each
release — what was measured, what was found while shipping, what is still
open. This file is the short form of the same history, and answers the only
question the version number was ever standing in for: what changed since I
last looked.

Entries are grouped as **Added**, **Fixed** and **Changed**. "Fixed" covers
claims the site was making that were not true, as well as code that misbehaved.

---

## v34 — November 11, 2026

Twenty-four commits since v33. The headline is uncomfortable: almost everything in this
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

## v33 — October 25, 2026

Twenty-three commits. An idea from v32 was built, measured against real data,
and parked at 41% of a 70% bar. The measurement pointed upstream, and what it
found upstream turned out to be the product: nothing at generation time was
asking who is in the shot.

One rule decided the shape of five of these, so it is worth stating first:
**nobody is ever cast from a photograph somebody else uploaded of them.**
Every face in every scene belongs to somebody who built their own locked pack
from their own photograph. It made the friends-in-a-scene path slower to
build and the life-film path considerably slower, and the alternative was
manufacturing locked identities of people who never agreed to one.

### Added

- **Cast Yourself.** One photograph becomes a locked character pack — face,
  build, distinguishing features, wardrobe — written once, never edited
  afterwards by anyone, reused word for word by every later prompt alongside
  the reference images. The locking is the feature: a generated person drifts
  between shots because nothing fixes who they are. Three gates run before a
  pack exists — one face, an adult, not a public figure — and every uncertain
  answer refuses. No account needed; a stranger's pack waits in
  `pending_packs` under a random token and moves into the Vault on sign-up.
- **Animate Yourself.** The same locked character, drawn. Six mediums —
  cel-shade, ink halftone, Sunday funnies, stop-motion clay, watercolor wash,
  pencil rough — each rendering a set of poses that is recognizably one
  person. No studio, franchise or director names in the presets, and 34
  protected terms refused in a prompt.
- **Cast Your Crew, and Duets.** A scene with two or three people. The host
  picks look and beat and gets a link; whoever opens it sees who asked, what
  the scene is and how many seats remain, then adds their own photograph. If
  they already have a character they pick it instead and skip the camera —
  two locked identities, each already in films of their own, in one frame.
  Nothing is shot and nothing charged until everybody is in.
- **Lot Booth and Phone Remote.** One photograph holds up from one angle;
  several survive the camera moving. A capture is a session with a
  six-character code, drawn from an alphabet without O, 0, I or 1 because
  somebody reads it off a screen and types it on a phone in bad light. Eight
  named angles, four including the front builds a pack. Named rather than
  "upload some photos" for a measurable reason: left alone, people shoot six
  forward-facing frames and only the first is worth anything downstream.
- **Memory Cinema.** A day, one line about what happened, up to six
  photographs, a genre and who plays you. The photographs are read for where
  you were, what the light said, what the weather did — by a prompt told in
  as many words not to describe any person identifiably. A face in a camera
  roll is not a casting decision.

### Fixed

- **Not one Cast Yourself scene would have rendered.** The page sent
  `duration: 8` and Seedance 2.5 accepts 5, 10, 15 or 30. Every scene from
  Cast Yourself and every crew scene would have come back *Invalid duration*
  on the first real click. Found by a test harness checking something else.
- **A host could swap a crew scene's beat after people joined.** The beat
  came from the request body, so faces collected for a stakeout could have
  been filmed doing something else entirely. Look and beat are now read off
  the invite row at shoot time and whatever the client sends is ignored.
- **Deleting a character left the face behind** in four places: deleting an
  account never touched packs, `animated_sets` had no `pack_id`, capture
  frames outlived the pack with a dangling pointer, and an anonymous capture
  had nothing to link to. Files first, then rows, throughout.

### Measured and parked

- **Story Worlds.** Lock a finished take into a place somebody can walk into
  and speak to, with no authoring step. A gate run against every finished
  take in the database asked how many would produce a world worth walking
  into. Three bugs sat in front of the real answer, each looking like the
  answer: a failed query treated as an empty result, a measurement of an
  account that owns no takes, and extraction reading only Vault entries while
  the cast sat in the prompt. The honest figure is 41% against a 70% bar, so
  it stays off. The gate cost an evening instead of a month, and the answer
  it gave was not *build it better* but *the problem is upstream* — takes
  fail because nothing in the product has ever asked who is in a shot.

---

## v32 — October 22, 2026

Eighteen commits. A run at the outstanding test items from v31, a
conversation about what else belongs on a studio lot, and a third outside
brief on the Rehearsal Studio. The first of those found a bug that had
nothing to do with what was being tested.

### Fixed

- **Every start-frame generation was broken, on every model.** Attaching a
  start frame made `get-upload-url.js` return an `R2_PUBLIC_URL` link — how
  this app records where an object lives, not a link anyone can fetch. The
  bucket is private. Every read path presigns; `generate-video.js` skipped
  that step and handed the stored form to fal, which got a 403. It looked
  like a MiniMax problem only because MiniMax is the one family that keeps
  reference photos when a start frame is present. About 75¢ of failed
  generations before the cause turned up.
- **Both failure paths were throwing away fal's explanation.** The submit
  path replaced a 422 with "Generation service rejected the job", and the
  webhook collapsed a structured error to "Generation failed". Both now share
  one extractor that flattens whatever shape arrives and redacts URLs,
  because reference links are presigned and carry credentials in the query.
- **A repeat sale overwrote the first one.** Both writers to `purchases`
  upserted on `(user_id, creation_id)`, so a buyer purchasing the same film
  twice overwrote their first row, session id included, orphaning that sale's
  payout. Sales are one row each now, keyed on the Stripe session, verified
  against PostgreSQL 16 by replaying the exact case.
- **Submissions were credited to the wrong model.** A ternary meant every
  Veo, Seedance and MiniMax film reached the archive labeled as Wan.

### Added

- **The Recording Studio.** Lip sync had shipped for months with nowhere on
  the lot to make the audio it consumes. A scene read aloud in up to four
  voices, one credit per thousand characters. Voices live in the Vault: a
  character gets a locked voice the way they get a locked description. The
  turn order is the order you wrote, because Performance & Blocking groups
  lines by character and keeps no record of who speaks when.
- **The Lot is an honest inventory.** Three separate lists of what this
  platform contains disagreed — the meta description named six rooms,
  `LotPage.jsx` five different ones, and `toolCatalog.js` twenty-two. Only
  "script supervisor" appeared in all three. Thirteen departments now cover
  all twenty-three tools, and `check-lot.mjs` fails the build if a tool has
  no room or a door points nowhere.
- **Sharing a rehearsal needs no account.** Without one: a link that works at
  once, lasts 30 days, three a day, counted per caller using a salted hash
  and never an address. Signed in: no expiry, no limit, listed and
  deletable.

### Changed

- The Rehearsal Studio's type floor rose to 12px and `--accent` used as text
  became `--accent-text`, from 3.0:1 up to 8.65:1. The brief said the small
  text was low-contrast gray; measuring found `--muted` already passed and
  the accent color did not.
- `check-links.mjs` guards 177 link targets and every sitemap entry, after a
  dead route turned up: `/discovered` was in the nav, the router and the
  sitemap, but missing from `KNOWN_PAGES`, so a direct visit fell through to
  the home page.

---

## v31 — October 21, 2026

Eighteen commits. Two outside briefs drove most of it: one on the Rehearsal
Studio's usability, one on turning it into the flagship.

### Added

- **The studio has a front door.** Three starter scenes — a walk-and-talk, a
  dinner argument, a standoff — each with real multi-keyframe blocking,
  directed actions and a camera that does something. Hand-authored
  coordinates look right in a diff and wrong on screen, so
  `check-starters.mjs` runs them through the real engine on every build. It
  caught three errors during authoring, including a camera placed 1.7 metres
  from its subjects.
- **Work survives a refresh.** Blocking is kept in the browser as you go.
  Seventeen test cases cover private windows, blocked storage, quota
  exceeded and six kinds of corrupted payload, because this storage fails in
  more ways than it works.
- **Three ways to get work out.** A storyboard sheet, one captioned frame per
  camera with shot size, lens, subject and timecode. An animatic — the
  timeline as a playable MP4, encoded in the browser by the ffmpeg build the
  Finish tool already carries, nothing uploaded and no credits. And a share
  link that opens the scene for anyone, with no account at the far end.
- The share table has **no select policy at all**; reads go through a
  security-definer function that takes an id and returns the title and the
  scene, never the owner. The obvious design — a public `using (true)` —
  would have let anyone holding the anon key list every scene ever shared.
  A shared scene is a stranger's JSON going into three.js, so the sanitizer
  is a whitelist, runs before writing and again after reading, and
  `check-share.mjs` holds it to fifty hostile cases on every build.

### Fixed

- **The pricing page served two of its three prices as rubbish** — "$15"
  arrived as `<div id="root">5` and "$32" as `</div>2`. The prerendered body
  was injected with a replacement string built as `$1${html}$3`, so "$1" in
  our own copy was read as a capture group. "$5" survived because there was
  no group 5. Six more injection sites had the same flaw.
- **The secondary text color failed accessibility everywhere** — 3.16–3.53:1
  against the four page backgrounds, across 408 usages in 70 files. Raised to
  the lightest value on the same hue that passes.
- **Image generation returned 500 on every call.** One route read
  `SUPABASE_URL` where the other 51 read `VITE_SUPABASE_URL`, so
  `createClient(undefined)` threw at module load and the route failed before
  seeing a request.
- **The generate page stated a price for a video nobody was making** —
  fifteen seconds of Seedance 2.5 read as "180 credits per 5-second video".
- **The Journal told readers blocking required an account.** It never has.
  Four calls to action said so, on the pages most likely to convert a reader.
- Seven British spellings, six of them recent. `us-spelling.mjs` existed and
  was not being run.

### Changed

- `/rehearsal` gained six sections of real indexable copy with hand-drawn SVG
  diagrams, taking the page from about 140 words to 489. The copy lives in
  one module that both the page and the prerenderer read, because the page is
  prerendered from a separate catalog and headings added in React would have
  been invisible to every crawler.

---

## v30 — October 15, 2026

Two commits, the same evening as v29. Both came out of looking at fal's
current catalog rather than from the backlog.

### Added

- **MiniMax H3 Max, in three tiers.** Twelve references against Kling's four,
  and the only model here that holds a reference set *and* opens on an exact
  first frame at the same time — every other model drops the Vault photos
  when a starting frame is attached, so a chained shot keeps its faces for
  the first time. It also takes a middle keyframe and a last frame, which is
  the model the Frame Planner has been waiting for.
- **More than two people in a scene,** up to six, with editable names. Never
  a limit in the engine — performers are an array and every part of the
  system maps over it — only an absence: there was no button anywhere in the
  codebase. The names matter more than they sound, because three people
  called A, B and C is a diagram rather than a scene.

### Fixed

- **Two cameras added in the same millisecond shared an id.** `addCamera`
  built ids from `Date.now()`, which is not unique inside a tick. Found by
  writing `addActor` the same way and watching six performers come back with
  three ids — removing one removed four.
- The plan and the studio disagreed about color past the fourth performer.

### Changed

- `prompt_expansion_mode` is pinned to `disabled` on all three MiniMax tiers
  and is not a creator-facing option. fal's default rewrites the prompt
  before the model sees it, which would quietly undo the framing, eyelines,
  declared intent and Vault wording this platform exists to put there.

---

## v29 — October 15, 2026

Fourteen commits, ten of them that day and all ten the Rehearsal Studio.

### Added

- **A performer can be directed, not only placed.** Blocking answered where
  somebody stands and could not say what they were doing. There are now 37
  directed actions across 10 categories, each naming a clip and the words
  that reach the prompt. The clips were already there — `animations.glb` has
  had 43 since September, of which six were in use. Two entries can share a
  clip and still be different directions: listening and waiting stand equally
  still, but the shot is not the same shot and the model should not be told
  it is.
- **The camera moves through a shot, not only between shots.** Thirteen moves
  in six groups, each writing two marks on the active camera and nothing
  else, so a move can be nudged, re-timed or half-deleted afterwards like
  anything set by hand. Crane and zoom needed height and lens to become
  keyframable, which they now are.
- **Nobody walks through the kitchen island.** Performers and extras stop at
  walls and furniture and slide along them. The camera deliberately passes
  through walls — taking one out to shoot into a room is how sets are built —
  but not through furniture.
- **A full-bleed stage,** with the plan floating over it as a live overlay and
  every camera as a button. Both layouts render from one shared set of props,
  so the split view and the stage cannot drift apart.
- **Walking the camera.** WASD to move, Q and E for height, drag to look, R to
  face the subject. It flies the shot camera rather than a scouting one, and
  every change lands as a mark at the playhead exactly as a drag does.
- **Cameras you can see.** Cameras were objects in the data but the 3D view
  only ever rendered through the active one. Each now stands in the room with
  a body, a lens barrel, a stand and the cone it actually covers — real
  optics, not decoration: at 3.2 metres a 35mm throws 3.3m across and an 85mm
  throws 1.4m, which match full-frame fields of view.

### Fixed

All eight were faults introduced by this release's own code, found by testing
it rather than by reading it.

- The stage controls could not be seen, at 3.53:1 over a near-black viewport.
- The exit button sat underneath the site nav, which had a higher z-index.
- **Collision treated every prop as an obstacle,** including roads and
  pavements, which are things you walk on. Footprints covered 87–136% of the
  floor on exteriors; a shopfront fell from 87% blocked to 8%.
- **Every camera would have been drawn aiming away from its own shot.** Rigs
  were built pointing local +Z; under `yawFromBearing`, forward is −Z.
- A 30-degree arc was described as a track one way and an arc the other.
- Three React advisories introduced by the walk loop.

### Still open

- A performer still walks through furniture between two legal marks. It is
  reported, not solved: solving it means pathfinding, and rerouting a
  performance the director set is the wrong default. The report may be the
  right permanent answer.

---

## Earlier notes, written to a different scheme

The two entries below predate this file matching the numbered release notes.
They were written independently and more coarsely: what they call v28 covers
material released as v32 and v33, and what they call v27 describes a payout
arrangement that v29 onward supersedes. They are kept because they say things
the numbered notes do not, and left unrenumbered because the correspondence
is not one to one.

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
