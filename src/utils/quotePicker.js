import { QUOTES } from '../constants/quotes';
import { getQuoteCategories, getRecentQuoteIds, pushRecentQuoteId } from './quoteSettings';

// A small curated set of motivational emojis, used only when the user has
// the "add emoji" toggle turned on. Kept short and upbeat on purpose.
export const QUOTE_EMOJIS = ['🔥', '💪', '🌟', '🚀', '✨', '🎯', '⚡️', '🌱', '🏆', '🧠'];

export function randomQuoteEmoji() {
  return QUOTE_EMOJIS[Math.floor(Math.random() * QUOTE_EMOJIS.length)];
}

/**
 * Deterministic emoji for a given quote id (same quote always shows the
 * same emoji). Used by the widget so the emoji doesn't flicker to a
 * different one on every periodic re-render while the quote stays the same.
 */
export function emojiForQuoteId(id) {
  const idx = Math.abs(Number(id) || 0) % QUOTE_EMOJIS.length;
  return QUOTE_EMOJIS[idx];
}

function poolForCategories(categoryIds) {
  if (!categoryIds || categoryIds.length === 0) return QUOTES;
  const pool = QUOTES.filter((q) => categoryIds.includes(q.category));
  return pool.length > 0 ? pool : QUOTES;
}

/**
 * Picks a random quote, avoiding the most-recently-shown quotes when
 * possible so the same line doesn't repeat back-to-back across notifications
 * and widget refreshes. Falls back to the full pool if every quote in the
 * selected categories has recently been shown.
 */
export async function pickRandomQuote({ markShown = true } = {}) {
  const [categoryIds, recentIds] = await Promise.all([getQuoteCategories(), getRecentQuoteIds()]);
  const pool = poolForCategories(categoryIds);
  const fresh = pool.filter((q) => !recentIds.includes(q.id));
  const candidates = fresh.length > 0 ? fresh : pool;
  const quote = candidates[Math.floor(Math.random() * candidates.length)];
  if (markShown && quote) await pushRecentQuoteId(quote.id);
  return quote;
}

export function findQuoteById(id) {
  return QUOTES.find((q) => q.id === id) || null;
}

/**
 * Deterministic "quote of the day": same quote for every user/instance on
 * a given calendar date, changing only at local midnight. Independent of
 * pickRandomQuote's tap-to-shuffle/recent-history behavior — use this
 * instead of pickRandomQuote() wherever a stable, date-based quote (rather
 * than a shuffled one) is wanted.
 */
export function getDailyQuote(date = new Date()) {
  if (!QUOTES.length) return null;
  const dayKey = Math.floor(date.getTime() / 86400000); // days since epoch, local-clock based
  const index = ((dayKey % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return QUOTES[index];
}

/**
 * Estimates the largest font size (in dp, between minFontSize and
 * maxFontSize) at which `text` is likely to fit inside a widget of
 * widthDp x heightDp without being clipped, and returns the exact box
 * width (dp) QuoteWidget should render the text at.
 *
 * Why this exists instead of a library: react-native-android-widget renders
 * FlexWidget/TextWidget to native Android RemoteViews, not real React
 * Native views. Home-screen widgets have no live JS/layout thread once
 * rendered, so components that rely on runtime text measurement (like
 * react-native-auto-size-text's onTextLayout-based resizing) never get a
 * chance to run there — the size has to be decided up front, in JS, before
 * props.renderWidget() is called.
 *
 * Safety margin: some launchers (especially heavily-themed/custom ones)
 * report a widget size to Android widgets that doesn't match the size
 * they actually render at — the library's own changelog documents this
 * ("crop widget when reported and actual size are different on some
 * launchers"). If we size text to fill 100% of the *reported* width, a
 * launcher that under-delivers on actual width will silently crop the
 * text with no reflow, which is exactly the clipped/off-center look this
 * fixes. We deliberately compute against ~80% of the reported dimensions,
 * and render the text at a fixed (not match_parent) width matching that
 * same math, so wrapping/centering can't drift away from what we assumed.
 */
export function estimateQuoteFontSize({
  text = '',
  widthDp,
  heightDp,
  hasAuthorLine = false,
  hasEmoji = false,
  minFontSize = 10,
  maxFontSize = 24,
  safetyRatio = 0.8,
}) {
  const SAFETY_RATIO = Number.isFinite(safetyRatio) ? safetyRatio : 0.8; // guard against launchers over-reporting size
  const reportedWidth = Number.isFinite(widthDp) && widthDp > 0 ? widthDp : 250;
  const reportedHeight = Number.isFinite(heightDp) && heightDp > 0 ? heightDp : 180;

  // Match QuoteWidget's own padding/margins so the estimate reflects the
  // space actually left for the quote text, then apply the safety margin.
  // Only subtract the outer FlexWidget's real padding (16dp each side) —
  // there's no extra inner padding anymore, the text box itself is now
  // rendered at exactly this width, so this is the true available width.
  const usableWidth = Math.max(60, (reportedWidth - 16 * 2) * SAFETY_RATIO);
  let usableHeight = Math.max(40, (reportedHeight - 16 * 2) * SAFETY_RATIO);
  if (hasAuthorLine) usableHeight -= 28;
  if (hasEmoji) usableHeight -= 24;
  usableHeight = Math.max(30, usableHeight);

  const length = Math.max(1, (text || '').length);

  let fontSize = minFontSize;
  for (let candidate = maxFontSize; candidate >= minFontSize; candidate -= 1) {
    // Average glyph width for a BOLD serif/sans font (QuoteWidget uses
    // fontWeight: 700) is noticeably wider than regular weight — using a
    // regular-weight estimate here was the cause of long quotes overflowing.
    const avgCharWidth = candidate * 0.62;
    const charsPerLine = Math.max(1, Math.floor(usableWidth / avgCharWidth));
    const estimatedLines = Math.max(1, Math.ceil(length / charsPerLine));
    const lineHeight = candidate * 1.35;

    if (estimatedLines * lineHeight <= usableHeight) {
      fontSize = candidate;
      break;
    }
  }

  return { fontSize, boxWidthDp: Math.round(usableWidth) };
}
