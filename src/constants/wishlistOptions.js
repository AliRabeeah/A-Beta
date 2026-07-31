/**
 * Built-in starter tags for the Wishlist. Users can add their own custom
 * tags (any label + any emoji) on top of these from the tag picker — these
 * four just ship as sensible defaults so a first-time list isn't empty.
 * Ids are stable strings (not translated) so a tag survives a language
 * switch; only its displayed label is looked up via labelKey.
 */
export const DEFAULT_WISHLIST_TAGS = [
  { id: 'buy_books', emoji: '\ud83d\udcda', labelKey: 'wishlistTag_buyBooks', builtIn: true },
  { id: 'watch_movie', emoji: '\ud83c\udfac', labelKey: 'wishlistTag_watchMovie', builtIn: true },
  { id: 'try_game', emoji: '\ud83c\udfae', labelKey: 'wishlistTag_tryGame', builtIn: true },
  { id: 'general', emoji: '\u2728', labelKey: 'wishlistTag_general', builtIn: true },
];

export function defaultWishlistTagLabel(tag, t) {
  return tag.labelKey ? t(tag.labelKey) : tag.label || '';
}
