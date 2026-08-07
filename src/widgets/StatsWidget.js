import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { toKey } from '../utils/dateUtils';
import { isDueOnDate, statusOf, getCurrentStreak } from '../utils/streakUtils';
import { sizeScale, styleBackground } from '../utils/widgetCustomization';

const LABELS = {
  en: { today: 'Today', streak: 'Best streak', days: 'days' },
  ar: { today: 'اليوم', streak: 'أفضل سلسلة', days: 'يوم' },
};

/**
 * Completion-so-far today (as a fraction + bar — an honest bar, not a fake
 * ring; RemoteViews doesn't give us arbitrary arcs) plus the single best
 * current streak across all habits. Customizable like the others.
 */
export default function StatsWidget({
  habits = [],
  language = 'en',
  accentColor = '#0A84FF',
  style = 'glass',
  size = 'medium',
  offset = { x: 0, y: 0 },
}) {
  const t = LABELS[language] || LABELS.en;
  const today = new Date();
  const todayKey = toKey(today);
  const due = (habits || []).filter((h) => !h.archived && isDueOnDate(h, today));
  const done = due.filter((h) => statusOf(h, todayKey) === 'done').length;
  const total = due.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const bestStreak = (habits || []).reduce((max, h) => {
    if (h.archived) return max;
    const s = getCurrentStreak(h);
    return s > max ? s : max;
  }, 0);

  const scale = sizeScale(size);
  const bigFont = Math.round(30 * scale.font);
  const labelFont = Math.round(12 * scale.font);
  const pad = Math.round(14 * scale.padding);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: styleBackground(style),
        borderRadius: 20,
        padding: pad,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: offset?.x || 0,
        marginTop: offset?.y || 0,
      }}
    >
      <TextWidget text={total === 0 ? '—' : `${done}/${total}`} style={{ color: '#FFFFFF', fontSize: bigFont, fontWeight: 'bold' }} />
      <TextWidget text={t.today} style={{ color: '#8E8E93', fontSize: labelFont, marginTop: 2, marginBottom: 10 }} />

      <FlexWidget style={{ width: 100, height: 8, borderRadius: 4, backgroundColor: '#2A2A2A' }}>
        <FlexWidget style={{ width: `${Math.max(4, pct)}%`, height: 8, borderRadius: 4, backgroundColor: accentColor }} />
      </FlexWidget>

      {bestStreak > 0 && (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <TextWidget text="🔥" style={{ fontSize: labelFont + 2, marginRight: 4 }} />
          <TextWidget text={`${bestStreak} ${t.days}`} style={{ color: accentColor, fontSize: labelFont, fontWeight: '700' }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
