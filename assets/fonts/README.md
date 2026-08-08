# Fonts for the About screen redesign

`AboutScreen.js` was designed for **Fraunces** (headings, app name, quote)
and **Manrope** (secondary text) per the design spec, but no font files are
bundled here — I can't download font binaries in this environment, so the
screen currently falls back to the system serif/default fonts instead
(configured at the top of `AboutScreen.js`, see `HEADING_FONT` /
`BODY_FONT`).

It still looks and works correctly with the fallback — this is purely a
"swap in the real typeface whenever you have it" step, not something
broken.

## How to add the real fonts

1. Download the font files (both are free/open-source on Google Fonts):
   - **Fraunces**: https://fonts.google.com/specimen/Fraunces — get at
     least the Regular and Italic weights (`Fraunces-Regular.ttf`,
     `Fraunces-Italic.ttf`).
   - **Manrope**: https://fonts.google.com/specimen/Manrope — get
     Regular and SemiBold (`Manrope-Regular.ttf`, `Manrope-SemiBold.ttf`).
2. Put all 4 `.ttf` files directly in this folder
   (`assets/fonts/`) with those exact filenames.
3. In `AboutScreen.js`, find the `useFonts(...)` call near the top of the
   component and uncomment the 4 `require(...)` lines (they're commented
   out right now specifically so the app builds without the files
   present).
4. Change `HEADING_FONT` to `'Fraunces-Regular'` and `BODY_FONT` to
   `'Manrope-Regular'` (both constants are right above the `useFonts`
   call).

That's it — no other code changes needed, and nothing else in the app is
affected either way.
