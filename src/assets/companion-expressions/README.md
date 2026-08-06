# Companion expression images

✅ **Real artwork is installed** for all 4 moods (as of this update) — the
user-supplied cat images, background removed and mapped as:

| filename      | source expression         | when it shows                                    |
|---------------|----------------------------|---------------------------------------------------|
| `happy.png`   | laughing, open mouth, sparkles | did a habit/task today                        |
| `content.png` | closed-eye gentle smile, hearts | last activity was yesterday, streak still alive |
| `sleepy.png`  | curled up asleep, "Zzz"    | 2+ days with no activity                          |
| `new.png`     | wide curious green eyes    | no activity logged yet at all                     |

Two extra expressions the user provided (a sad face, an excited/playing
pose) aren't used yet — there's no trigger condition for them in
`computeCompanionState` (see `src/utils/companionStats.js`). Candidates for
later: a transient "excited" pose right after completing a task/habit, or
a "sad" pose if a streak breaks — neither is wired up yet.

## If you want to swap any of these later

Same process as before: replace the file at
`src/assets/companion-expressions/<mood>.png` with a new one (same
filename), transparent background, roughly square framing works best
since `CompanionExpressions.js` uses `resizeMode="contain"`. No code
changes needed for a straight swap.
