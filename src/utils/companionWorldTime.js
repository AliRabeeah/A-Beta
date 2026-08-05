// Pure time -> sky-state math for the companion's world. Kept separate from
// the rendering component so it's trivially testable and so the "what time
// period is it" logic has exactly one source of truth.

const PERIODS = {
  dawn: {
    // 06:00 - 08:00
    top: '#F3B6A0',
    bottom: '#FCE0C4',
    sunColor: '#FFC978',
    glow: '#FFD9A0',
  },
  day: {
    // 08:00 - 17:00
    top: '#5FB6EE',
    bottom: '#CDEBFF',
    sunColor: '#FFE066',
    glow: '#FFF3C4',
  },
  sunset: {
    // 17:00 - 19:00
    top: '#6C5296',
    bottom: '#F2996B',
    sunColor: '#FF9E5E',
    glow: '#FFC48C',
  },
  night: {
    // 19:00 - 06:00
    top: '#0B1130',
    bottom: '#1C2B4A',
    sunColor: '#EAF1FF', // moon
    glow: '#C9D6FF',
  },
};

/**
 * Returns { period, progress, colors } for a given moment.
 *  - period: 'dawn' | 'day' | 'sunset' | 'night'
 *  - progress: 0-1, how far through that period we are (used to arc the
 *    sun/moon across the sky and to fade between color stops)
 */
export function getSkyState(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;

  let period;
  let progress;

  if (hour >= 6 && hour < 8) {
    period = 'dawn';
    progress = (hour - 6) / 2;
  } else if (hour >= 8 && hour < 17) {
    period = 'day';
    progress = (hour - 8) / 9;
  } else if (hour >= 17 && hour < 19) {
    period = 'sunset';
    progress = (hour - 17) / 2;
  } else {
    period = 'night';
    const nightHour = hour >= 19 ? hour - 19 : hour + 5; // 0..11 across 19:00->06:00
    progress = nightHour / 11;
  }

  return { period, progress: Math.max(0, Math.min(1, progress)), colors: PERIODS[period] };
}

export function isNight(date = new Date()) {
  return getSkyState(date).period === 'night';
}

// Arc position (0-1, 0-1) for the sun/moon within the sky area: rises from
// the horizon, peaks at the midpoint of the period, sets back down.
export function celestialPosition(progress) {
  const x = 0.12 + progress * 0.76; // left -> right
  const arc = 4 * progress * (1 - progress); // 0 at edges, 1 at the middle
  const y = 0.78 - arc * 0.62; // low near horizon, high at midday/midnight
  return { x, y };
}
