/**
 * Very small masonry helper: distributes items across N columns by always
 * appending the next item to whichever column currently has the least
 * estimated content height, so columns end up roughly balanced instead of
 * strictly alternating (which looks like a plain grid, not masonry).
 *
 * No native measurement is involved (that would require an extra render
 * pass); heights are estimated from the note's content shape, which is
 * good enough to produce a believably staggered layout.
 */
export function estimateNoteCardHeight(note) {
  let height = 86; // emoji row + title + timestamp chrome

  const titleLen = (note.title || '').length;
  height += titleLen > 0 ? Math.min(40, Math.ceil(titleLen / 18) * 20) : 20;

  const snippetLen = (note.content || '').length;
  height += Math.min(44, Math.ceil(snippetLen / 24) * 18);

  const checklist = note.checklistItems || [];
  if (checklist.length) {
    height += Math.min(checklist.length, 3) * 22 + 6;
  }

  if (note.tag) height += 28;
  if (note.color) height += 4;

  return height;
}

export function distributeMasonry(items, columns = 2, estimateHeight = estimateNoteCardHeight) {
  const cols = Array.from({ length: columns }, () => []);
  const heights = new Array(columns).fill(0);

  items.forEach((item) => {
    let shortest = 0;
    for (let i = 1; i < columns; i += 1) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    cols[shortest].push(item);
    heights[shortest] += estimateHeight(item) + 12; // + gap
  });

  return cols;
}
