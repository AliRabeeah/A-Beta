import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { toKey } from '../utils/dateUtils';
import { isDueOnDate, statusOf } from '../utils/streakUtils';

/**
 * Small widget showing how much of today is done, as a big "5/8"
 * fraction plus a horizontal progress bar. (A literal circular ring
 * isn't used here because this widget library's building blocks are
 * rectangles/text, not arbitrary SVG arcs — a bar is the honest,
 * reliably-renderable equivalent.)
 */
export default function ProgressWidget({ habits, opacity = 100 }) {
  const today = new Date();
  const todayKey = toKey(today);
  const due = (habits || []).filter((h) => !h.archived && isDueOnDate(h, today));
  const done = due.filter((h) => statusOf(h, todayKey) === 'done').length;
  const total = due.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const alpha = Math.max(0, Math.min(255, Math.round((opacity / 100) * 255)));
  const backgroundColor = `#${alpha.toString(16).padStart(2, '0')}000000`;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
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
      <TextWidget text={total === 0 ? '—' : `${done}/${total}`} style={{ color: '#FFFFFF', fontSize: 30, fontWeight: 'bold' }} />
      <TextWidget text="Today" style={{ color: '#8E8E93', fontSize: 12, marginTop: 2, marginBottom: 12 }} />

      <FlexWidget style={{ width: 90, height: 8, borderRadius: 4, backgroundColor: '#2A2A2A' }}>
        <FlexWidget style={{ width: `${Math.max(4, pct)}%`, height: 8, borderRadius: 4, backgroundColor: '#FF8A00' }} />
      </FlexWidget>
    </FlexWidget>
  );
}
