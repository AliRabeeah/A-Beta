/**
 * A small rotating set of writing prompts shown above an empty journal
 * entry. Stored as translation keys (resolved via t()) so prompts show in
 * whichever language the person is using; getRandomPrompt() just picks an
 * index, avoiding an immediate repeat when possible.
 */
export const JOURNAL_PROMPT_KEYS = [
  'journalPrompt1',
  'journalPrompt2',
  'journalPrompt3',
  'journalPrompt4',
  'journalPrompt5',
  'journalPrompt6',
  'journalPrompt7',
  'journalPrompt8',
  'journalPrompt9',
  'journalPrompt10',
  'journalPrompt11',
  'journalPrompt12',
  'journalPrompt13',
  'journalPrompt14',
  'journalPrompt15',
];

export function getRandomPromptKey(excludeKey = null) {
  const pool = excludeKey ? JOURNAL_PROMPT_KEYS.filter((k) => k !== excludeKey) : JOURNAL_PROMPT_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}
