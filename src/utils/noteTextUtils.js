/**
 * Small, dependency-free text helpers shared by the note editor and cards.
 */

// Matches http(s)://... and bare www.*** links. Deliberately conservative
// (stops at whitespace) — good enough for "is there a link in this block"
// without pulling in a full URL-parsing library.
const URL_REGEX = /((https?:\/\/|www\.)[^\s]+)/gi;

/** Returns every URL found in `text`, de-duplicated, in order of appearance. */
export function extractLinks(text) {
  if (!text) return [];
  const matches = text.match(URL_REGEX) || [];
  const seen = new Set();
  const links = [];
  for (const raw of matches) {
    // Trim common trailing punctuation that isn't part of the URL itself.
    const cleaned = raw.replace(/[.,!?;:)\]]+$/g, '');
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    links.push(cleaned);
  }
  return links;
}

export function normalizeUrlForOpen(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

/** Word + character counts across every text-bearing block in a note. */
export function countNoteText(blocks = [], checklistItems = []) {
  let text = '';
  for (const block of blocks) {
    if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote') {
      text += ` ${block.text || ''}`;
    } else if (block.type === 'bulletList' || block.type === 'numberedList') {
      text += ` ${(block.items || []).map((it) => it.text || '').join(' ')}`;
    }
  }
  text += ` ${checklistItems.map((it) => it.text || '').join(' ')}`;

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const characters = trimmed.replace(/\s/g, '').length;
  return { words, characters };
}
