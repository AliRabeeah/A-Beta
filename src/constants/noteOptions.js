/**
 * Category tags for notes. Matches the approved design spec exactly:
 * Tasks ✅ / Ideas 💡 / Work 💼 / Private 🔒.
 */
export const NOTE_TAGS = [
  { id: 'task', emoji: '\u2705', labelKey: 'noteTagTask' },
  { id: 'idea', emoji: '\ud83d\udca1', labelKey: 'noteTagIdea' },
  { id: 'work', emoji: '\ud83d\udcbc', labelKey: 'noteTagWork' },
  { id: 'private', emoji: '\ud83d\udd12', labelKey: 'noteTagPrivate' },
];

export function getTagById(id) {
  return NOTE_TAGS.find((t) => t.id === id) || null;
}

// A small, curated grid of common emojis for the note-icon picker.
export const NOTE_EMOJIS = [
  '\ud83d\udcdd', '\ud83d\udca1', '\u2705', '\ud83d\udccc', '\ud83d\udd12', '\ud83d\udcbc',
  '\ud83c\udfaf', '\ud83d\udcc5', '\ud83d\udecd\ufe0f', '\u2708\ufe0f', '\ud83c\udfe0', '\ud83d\udcb0',
  '\u2764\ufe0f', '\ud83c\udf89', '\ud83d\udcda', '\ud83e\udde0', '\ud83c\udf4e', '\ud83c\udfb5',
  '\ud83d\uddbc\ufe0f', '\u2b50', '\ud83d\udcde', '\u2709\ufe0f', '\ud83d\udcc8', '\ud83c\udfe1',
  '\ud83d\ude97', '\u2615', '\ud83c\udf1f', '\ud83c\udfc6', '\ud83e\udd57', '\ud83d\udcaa',
  '\ud83d\udc36', '\ud83c\udf3f', '\u26a1', '\ud83c\udfae', '\ud83d\udee0\ufe0f', '\ud83d\udcf7',
  '\ud83c\udf93', '\ud83e\uddfe', '\ud83d\udc9a', '\ud83d\udc99', '\ud83d\udc9b', '\ud83e\udd0d',
  '\ud83d\uddd3\ufe0f', '\ud83c\udfa7', '\ud83d\udee1\ufe0f', '\ud83d\udd11', '\u2757', '\u2753',
];

export const DEFAULT_NOTE_EMOJI = NOTE_EMOJIS[0]; // 📝

/**
 * Note card colors — soft "paper" pastels in light mode, muted low-luminance
 * versions of the same hues in dark mode (dark mode is a pure #000000
 * screen background, so card tints stay dim to avoid glare). Each color
 * carries its own `text` tone (kept legible on that tint) and a `tape`
 * tone used for the pinned washi-tape accent and checkbox strokes.
 * This is a fixed, deliberate palette — not derived from the app's accent
 * color system — matching the approved note design exactly.
 */
export const NOTE_COLOR_PALETTE = {
  mint: {
    light: { bg: '#DFF0E4', tape: '#9FCDB0', text: '#1F5E3F' },
    dark: { bg: '#182620', tape: '#3E6A50', text: '#BFE7CE' },
  },
  peach: {
    light: { bg: '#FBE7D6', tape: '#E7B78C', text: '#8A4B1E' },
    dark: { bg: '#271D13', tape: '#6B4A2A', text: '#F0C89D' },
  },
  lavender: {
    light: { bg: '#E9E3F7', tape: '#B7A4DE', text: '#4B3A78' },
    dark: { bg: '#1D1728', tape: '#5A4680', text: '#D8C9F2' },
  },
  sky: {
    light: { bg: '#DEEBFA', tape: '#9CC3E8', text: '#1F4E78' },
    dark: { bg: '#131F29', tape: '#3D6690', text: '#BFE0F7' },
  },
  blush: {
    light: { bg: '#FBE1E6', tape: '#E8A9B4', text: '#7D2E3C' },
    dark: { bg: '#251419', tape: '#6B3B49', text: '#F2C4CE' },
  },
  butter: {
    light: { bg: '#FCF2CE', tape: '#E6CE7C', text: '#6E5A12' },
    dark: { bg: '#241F10', tape: '#6B5A26', text: '#F2E3A0' },
  },
};

export const NOTE_COLOR_IDS = Object.keys(NOTE_COLOR_PALETTE);
export const DEFAULT_NOTE_COLOR = NOTE_COLOR_IDS[0]; // mint

/**
 * Resolves a stored note color id to its {bg, tape, text} tone for the
 * current theme mode. Falls back to the default color so every note
 * (including ones created before a color was picked) always renders with
 * a valid tint.
 */
export function resolveNoteColor(colorId, isDark) {
  const id = colorId && NOTE_COLOR_PALETTE[colorId] ? colorId : DEFAULT_NOTE_COLOR;
  return NOTE_COLOR_PALETTE[id][isDark ? 'dark' : 'light'];
}
