/**
 * A small local, non-cryptographic hash used only so the app never stores
 * a user's App Lock PIN as plain text in AsyncStorage. This is NOT meant to
 * resist serious attacks (there's no server, no network exposure, and no
 * crypto library dependency in this project) — it's just enough so a quick
 * look at the stored JSON doesn't reveal the PIN itself.
 */
export function hashPin(pin) {
  const salted = `a_applock_v1:${pin}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < salted.length; i++) {
    const code = salted.charCodeAt(i);
    h1 = (h1 ^ code) * 0x01000193;
    h1 >>>= 0;
    h2 = (h2 + code * (i + 1)) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
}

export function verifyPin(pin, hash) {
  return hashPin(pin) === hash;
}
