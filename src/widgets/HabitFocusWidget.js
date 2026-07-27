import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { toKey } from '../utils/dateUtils';
import { statusOf, getCurrentStreak } from '../utils/streakUtils';

/**
 * Pins a single, user-chosen habit (set from Settings → Widgets) with
 * its name, current streak, and one big Done button. If no habit has
 * been picked yet, shows a prompt that opens the app to Settings.
 */
export default function HabitFocusWidget({ habit, opacity = 100 }) {
  const alpha = Math.max(0, Math.min(255, Math.round((opacity / 100) * 255)));
  const backgroundColor = `#${alpha.toString(16).padStart(2, '0')}000000`;

  if (!habit) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor,
          borderRadius: 20,
          padding: 14,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text="Pick a habit in" style={{ color: '#8E8E93', fontSize: 12, textAlign: 'center' }} />
        <TextWidget text="Settings → Widgets" style={{ color: '#FF8A00', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }} />
      </FlexWidget>
    );
  }

  const todayKey = toKey(new Date());
  const status = statusOf(habit, todayKey);
  const streak = getCurrentStreak(habit);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FlexWidget clickAction="FOCUS_OPEN_APP" style={{ alignItems: 'center' }}>
        <TextWidget text={habit.icon || ''} style={{ fontSize: 22 }} />
        <TextWidget text={habit.name} style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginTop: 4 }} />
        <TextWidget
          text={streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : ' '}
          style={{ color: '#8E8E93', fontSize: 11, marginTop: 2, marginBottom: 10 }}
        />
      </FlexWidget>

      <FlexWidget
        clickAction="FOCUS_TOGGLE_DONE"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: status === 'done' ? habit.color : '#2A2A2A',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text={status === 'done' ? '∞' : ''} style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }} />
      </FlexWidget>
    </FlexWidget>
  );
}
