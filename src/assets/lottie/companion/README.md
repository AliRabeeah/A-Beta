# Companion Lottie animation

`idle.json` in this folder is currently a **deliberately empty placeholder**
(no visible shapes) — just enough for the app to build. Replace it with a
real animation to see the cat.

## Where to get one for free

1. **LottieFiles** — https://lottiefiles.com — the biggest library, search
   "cat", "kitten", or "pet". Filter by **Free** (top of search results —
   some are paid/Pro only). Open an animation you like → **Download** →
   choose **Lottie JSON** (not `.dotLottie`, not GIF/video). License is
   shown on the animation's page — for an app you're distributing, prefer
   ones marked free for commercial use, or check the specific license.
2. **IconScout** — https://iconscout.com/lotties — has a free filter too,
   same idea: search "cat", download the `.json` (Lottie) format.
3. **Iconscout / Freepik / Lordicon** also have Lottie sections, same
   general steps (search → filter free → download JSON).

Look for ones that **loop cleanly** (idle/breathing/blinking animations
are described as "loop" on LottieFiles) since this is used as a
continuously-playing idle animation, not a one-shot.

## How to install what you download

1. Download the `.json` file (NOT `.lottie` — that's a different packed
   format `lottie-react-native` doesn't read the same way).
2. Rename it to exactly `idle.json`.
3. Replace this file (`src/assets/lottie/companion/idle.json`) with it —
   same filename, same folder. No code changes needed.
4. Rebuild/reload the app — the new animation should appear in place of
   the (currently invisible) placeholder.

## Current limits of this integration (first pass)

- Only **one** animation file (`idle.json`) is wired up right now — mood
  (`happy`/`sad`/etc.) and growth stage don't swap to a different
  animation, only a size scale-up as the companion grows (see
  `STAGE_SCALE` in `src/components/CompanionLottie.js`). Wiring up
  separate files per mood/stage is possible later, but each one needs its
  own `require(...)` added in code (Metro can't resolve a dynamic path to
  a file that doesn't exist at build time), so it's a small code change
  per additional file, not just a drop-in.
- The original hand-drawn Skia cat is untouched at `src/components/Companion.js`
  if you want to revert — just change the import in
  `src/components/CompanionWorld.js` back from `./CompanionLottie` to
  `./Companion`.
