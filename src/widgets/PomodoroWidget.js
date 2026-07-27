import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const PHASE_LABELS = { work: 'Focus', short: 'Short Break', long: 'Long Break' };

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Shows the Pomodoro timer's last-known state. Important limitation:
 * Android widgets can't run a live JS countdown in the background, so
 * this does NOT tick down in real time — it shows the correct time
 * remaining as of when it last had a chance to update (app opened/
 * backgrounded, or the periodic ~30 min system refresh), computed
 * from a fixed end-timestamp so at least what it does show is always
 * mathematically accurate, never stale/wrong. Tapping it opens the
 * app to the Timer tab for full, live control.
 */
export default function PomodoroWidget({ state, opacity = 100 }) {
  const alpha = Math.max(0, Math.min(255, Math.round((opacity / 100) * 255)));
  const backgroundColor = `#${alpha.toString(16).padStart(2, '0')}000000`;

  if (!state || !state.running || !state.endTimestamp) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor, borderRadius: 20, padding: 14, justifyContent: 'center', alignItems: 'center' }}
      >
        <TextWidget text="No timer running" style={{ color: '#8E8E93', fontSize: 12, textAlign: 'center' }} />
        <TextWidget text="Tap to open Timer" style={{ color: '#FF8A00', fontSize: 12, fontWeight: 'bold', marginTop: 4 }} />
      </FlexWidget>
    );
  }

  const remaining = Math.round((state.endTimestamp - Date.now()) / 1000);
  const phaseLabel = PHASE_LABELS[state.phase] || 'Focus';

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor, borderRadius: 20, padding: 14, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
    >
      <FlexWidget style={{ backgroundColor: '#FF8A00', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
        <TextWidget text={phaseLabel} style={{ color: '#000000', fontSize: 11, fontWeight: 'bold' }} />
      </FlexWidget>
      <TextWidget text={remaining > 0 ? formatTime(remaining) : "Time's up"} style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }} />
    </FlexWidget>
  );
}
