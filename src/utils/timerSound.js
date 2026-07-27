import { Audio } from 'expo-av';

// Cached Sound instance so we don't reload the asset from disk on every
// single completion — it's created once, then rewound and replayed.
let cachedSound = null;
let loadingPromise = null;

async function getSound() {
  if (cachedSound) return cachedSound;
  if (!loadingPromise) {
    loadingPromise = Audio.Sound.createAsync(require('../../assets/sounds/timer_complete.wav')).then(
      ({ sound }) => {
        cachedSound = sound;
        return sound;
      }
    );
  }
  return loadingPromise;
}

/**
 * Plays the short completion chime used for both the normal timer and
 * every Pomodoro phase (focus session or break) finishing. Safe to call
 * even if audio playback isn't available (e.g. silent/unsupported
 * environments) — failures are swallowed so the timer UI never breaks.
 */
export async function playTimerCompleteSound() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    const sound = await getSound();
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    // Ignore — a missed chime shouldn't disrupt the timer.
  }
}
