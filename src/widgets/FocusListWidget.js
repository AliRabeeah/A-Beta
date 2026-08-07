import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { toKey } from '../utils/dateUtils';
import { isDueOnDate, statusOf } from '../utils/streakUtils';
import { sizeScale, styleBackground } from '../utils/widgetCustomization';

const LABELS = {
  en: { today: 'Today', empty: 'Nothing due today', add: '+ Add' },
  ar: { today: 'اليوم', empty: 'ما فيه شي مستحق اليوم', add: '+ إضافة' },
};

/** Mirrors TodayScreen's isTaskDueOnDate so the widget list matches the in-app one. */
function isTaskDueOnDate(task, date) {
  if (task.taskType === 'recurring') return isDueOnDate(task, date);
  const dateKey = toKey(date);
  if (task.dueDate === dateKey) return true;
  if (task.isPending && !task.completed && task.dueDate && dateKey > task.dueDate) return true;
  return false;
}

function buildRows(habits, tasks, todayKey, today) {
  const rows = [];
  for (const h of habits || []) {
    if (h.archived || !isDueOnDate(h, today)) continue;
    rows.push({ kind: 'habit', id: h.id, title: h.name || h.title || '', done: statusOf(h, todayKey) === 'done', color: h.color || '#0A84FF' });
  }
  for (const t of tasks || []) {
    if (!isTaskDueOnDate(t, today)) continue;
    const done = t.taskType === 'single' ? !!t.completed : t.completions?.[todayKey] === 'done';
    rows.push({ kind: 'task', id: t.id, title: t.title || t.name || '', done, color: '#FF9F0A' });
  }
  return rows;
}

/**
 * A compact "what's left today" list — habits and tasks merged into one
 * feed, tap a row to mark it done. Fully customizable: accentColor tints
 * the header/checkmarks, style controls the card background, size scales
 * font/row-height/padding together.
 */
export default function FocusListWidget({
  habits = [],
  tasks = [],
  language = 'en',
  accentColor = '#0A84FF',
  style = 'glass',
  size = 'medium',
  offset = { x: 0, y: 0 },
  widgetHeightDp = null,
}) {
  const t = LABELS[language] || LABELS.en;
  const today = new Date();
  const todayKey = toKey(today);
  const allRows = buildRows(habits, tasks, todayKey, today);
  const doneCount = allRows.filter((r) => r.done).length;

  const scale = sizeScale(size);
  const rowH = Math.round(38 * scale.rowHeight);
  const titleFont = Math.round(14 * scale.font);
  const headerFont = Math.round(13 * scale.font);
  const pad = Math.round(14 * scale.padding);

  // How many rows actually fit the real widget height Android gave us —
  // avoids either leaving dead space or silently overflowing/clipping.
  const headerH = 30 * scale.rowHeight;
  const availableH = (Number.isFinite(widgetHeightDp) && widgetHeightDp > 0 ? widgetHeightDp : 180) - headerH - pad * 2;
  const maxRows = Math.max(1, Math.floor(availableH / rowH));
  const rows = allRows.slice(0, maxRows);

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
        marginLeft: offset?.x || 0,
        marginTop: offset?.y || 0,
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <TextWidget text={t.today} style={{ color: accentColor, fontSize: headerFont, fontWeight: '700' }} />
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'flex-end' }}>
          <TextWidget text={`${doneCount}/${allRows.length}`} style={{ color: '#C8C8CC', fontSize: headerFont, fontWeight: '600' }} />
        </FlexWidget>
      </FlexWidget>

      {rows.length === 0 ? (
        <TextWidget text={t.empty} style={{ color: '#8E8E93', fontSize: titleFont, marginTop: 8 }} />
      ) : (
        rows.map((r) => (
          <FlexWidget
            key={`${r.kind}:${r.id}`}
            clickAction={r.kind === 'habit' ? 'TOGGLE_DONE' : 'TASK_TOGGLE_DONE'}
            clickActionData={r.kind === 'habit' ? { habitId: r.id, dateKey: todayKey } : { taskId: r.id, dateKey: todayKey }}
            style={{ width: 'match_parent', height: rowH, flexDirection: 'row', alignItems: 'center' }}
          >
            <FlexWidget
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                marginRight: 10,
                backgroundColor: r.done ? accentColor : '#00000000',
                // an outline on the unchecked state, a filled dot on done —
                // FlexWidget has no border-only style, so unchecked uses a
                // dim tinted fill instead of a true ring
                opacity: r.done ? 1 : 0.35,
              }}
            >
              {!r.done ? null : <TextWidget text="✓" style={{ color: '#0B0B0F', fontSize: 12, fontWeight: '700' }} />}
            </FlexWidget>
            <TextWidget
              text={r.title}
              maxLines={1}
              truncate="END"
              style={{
                color: r.done ? '#8E8E93' : '#FFFFFF',
                fontSize: titleFont,
                fontWeight: '500',
                width: 200,
              }}
            />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
