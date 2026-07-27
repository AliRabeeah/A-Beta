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
