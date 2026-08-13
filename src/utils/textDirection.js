// Arabic, Hebrew, and related RTL Unicode ranges (letters only -- not
// digits/punctuation, which are direction-neutral and shouldn't decide it).
const RTL_CHAR = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
// Basic Latin letters, treated as the LTR signal.
const LTR_CHAR = /[A-Za-z]/;

/**
 * Auto text-direction: looks at the first strong-directional character
 * typed and aligns to match (Arabic -> right, Latin -> left) — independent
 * of the app's current UI language, so typing Arabic into an English-language
 * app still right-aligns, and vice versa. Falls back to `fallbackIsRTL`
 * (the app's language direction) only while the field is still empty or
 * contains nothing but digits/punctuation/whitespace.
 */
export function autoTextAlign(text, fallbackIsRTL) {
  if (text) {
    for (const ch of text) {
      if (RTL_CHAR.test(ch)) return 'right';
      if (LTR_CHAR.test(ch)) return 'left';
    }
  }
  return fallbackIsRTL ? 'right' : 'left';
}
