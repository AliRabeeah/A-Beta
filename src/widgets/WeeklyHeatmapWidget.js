import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { toKey, addDays } from '../utils/dateUtils';
import { isDueOnDate, statusOf } from '../utils/streakUtils';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * 7-day strip for one user-chosen habit (set from Settings → Widgets),
 * like a mini GitHub contribution graph. Tap today's square to mark
 * it done; tap anywhere else to open the app.
 */
export default function WeeklyHeatmapWidget({ habit, opacity = 100 }) {
  const alpha = Math.max(0, Math.min(255, Math.round((opacity / 100) * 255)));
  const backgroundColor = `#${alpha.toString(16).padStart(2, '0')}000000`;

  if (!habit) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor, borderRadius: 20, padding: 14, justifyContent: 'center', alignItems: 'center' }}
      >
        <TextWidget text="Pick a habit in" style={{ color: '#8E8E93', fontSize: 12 }} />
        <TextWidget text="Settings → Widgets" style={{ color: '#FF8A00', fontSize: 12, fontWeight: 'bold' }} />
      </FlexWidget>
    );
  }

  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => addDays(today, -(6 - i)));
  const todayKey = toKey(today);

  return (
    <FlexWidget
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor, borderRadius: 20, padding: 14, flexDirection: 'column' }}
    >
      <FlexWidget clickAction="OPEN_APP" style={{ marginBottom: 10 }}>
        <TextWidget text={`${habit.icon || ''} ${habit.name}`} style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d, i) => {
          const key = toKey(d);
          const due = isDueOnDate(habit, d);
          const status = statusOf(habit, key);
          const isToday = key === todayKey;

          let bg = '#1F1F1F';
          if (due && status === 'done') bg = habit.color;
          else if (due && status === 'skipped') bg = '#3A3A3A';

          return (
            <FlexWidget
              key={i}
              clickAction={isToday ? 'HEATMAP_TOGGLE_DONE' : 'OPEN_APP'}
              style={{ flexDirection: 'column', alignItems: 'center' }}
            >
              <TextWidget text={DAY_LETTERS[d.getDay()]} style={{ color: '#8E8E93', fontSize: 9, marginBottom: 4 }} />
              <FlexWidget
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: bg,
                  borderWidth: isToday ? 2 : 0,
                  borderColor: '#FF8A00',
                }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>
    </FlexWidget>
  );
}
