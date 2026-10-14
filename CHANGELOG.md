# Changelog

What changed in RevaultAI, newest first.

A version exists once it has a heading here. Nothing else marks one — there are
no git tags and `package.json` stays at `0.0.0`, because nobody pins a release
of a site that deploys continuously. This file answers the only question the
version number was ever standing in for: what changed since I last looked.

Entries are grouped as **Added**, **Fixed** and **Changed**. "Fixed" covers
claims the site was making that were not true, as well as code that misbehaved.

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
