import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { toKey, addDays } from '../utils/dateUtils';
import { isDueOnDate, statusOf } from '../utils/streakUtils';
import { isDueOnDate as isPlanningDueOnDate, isDayCompleted as isPlanningDayCompleted, pointsProgress } from '../utils/planningUtils';

const CATEGORY_LABELS = {
  en: {
    health: 'Health',
    fitness: 'Fitness',
    mind: 'Mindfulness',
    productivity: 'Productivity',
    learning: 'Learning',
    other: 'Habit',
  },
  ar: {
    health: 'الصحة',
    fitness: 'اللياقة',
    mind: 'اليقظة الذهنية',
    productivity: 'الإنتاجية',
    learning: 'التعلم',
    other: 'عادة',
  },
};

// Mirrors TaskContext.TASK_CATEGORIES (colors/icons kept in sync with the app).
const TASK_CATEGORY_META = {
  task: { icon: '⏰', color: '#FF375F', label: { en: 'Task', ar: 'مهمة' } },
  personal: { icon: '👤', color: '#0A84FF', label: { en: 'Personal', ar: 'شخصي' } },
  work: { icon: '💼', color: '#FFD60A', label: { en: 'Work', ar: 'عمل' } },
  shopping: { icon: '🛒', color: '#00E676', label: { en: 'Shopping', ar: 'تسوق' } },
  other: { icon: '📌', color: '#8E8E93', label: { en: 'Other', ar: 'أخرى' } },
};
const PLANNING_COLOR = '#BF5AF2';
const PLANNING_ICON = '🗓️';
const PLANNING_LABEL = { en: 'Plan', ar: 'خطة' };
const DAY_LABEL = { en: 'Day', ar: 'يوم' };

const TODAY_LABEL = { en: 'Today', ar: 'اليوم' };
const ROW_HEIGHT_DP = 54;
const HEADER_HEIGHT_DP = 54;

function formatMinutes(seconds) {
  return Math.round(seconds / 60);
}

function opacityToArgbHex(opacityPercent) {
  const alpha = Math.max(0, Math.min(255, Math.round((opacityPercent / 100) * 255)));
  const alphaHex = alpha.toString(16).padStart(2, '0');
  return `#${alphaHex}000000`;
}

/** Mirrors TodayScreen's isTaskDueOnDate so the widget matches the in-app list exactly. */
function isTaskDueOnDate(task, date) {
  if (task.taskType === 'recurring') return isDueOnDate(task, date);
  const dateKey = toKey(date);
  if (task.dueDate === dateKey) return true;
  if (task.isPending && !task.completed && task.dueDate && dateKey > task.dueDate) return true;
  return false;
}

/**
 * Builds one normalized row shape out of a habit, task, or planning item so
 * the widget can render every kind through the same row layout — this is
 * what lets the list actually fill the widget's real height instead of
 * leaving dead space or overflowing when the mix of items changes.
 */
function buildRows(habits, tasks, planningItems, targetDate, language) {
  const targetKey = toKey(targetDate);
  const catLabels = CATEGORY_LABELS[language] || CATEGORY_LABELS.en;
  const rows = [];

  for (const h of habits) {
    if (h.archived || !isDueOnDate(h, targetDate)) continue;
    const status = statusOf(h, targetKey);
    const evaluationType = h.evaluationType || 'yesno';
    let progressText = '';
    if (evaluationType === 'numeric') {
      const value = h.values?.[targetKey] || 0;
      progressText = `${value}/${h.numericGoal || 0}`;
    } else if (evaluationType === 'timer') {
      const seconds = h.values?.[targetKey] || 0;
      progressText = `${formatMinutes(seconds)}/${h.timerGoalMinutes || 0}m`;
    } else if (evaluationType === 'checklist') {
      const dayState = h.checklist?.[targetKey] || {};
      const doneCount = (h.checklistItems || []).filter((it) => dayState[it.id]).length;
      progressText = `${doneCount}/${(h.checklistItems || []).length}`;
    }
    rows.push({
      kind: 'habit',
      id: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      isDone: status === 'done',
      isSkipped: status === 'skipped',
      canSkip: true,
      progressText,
      subtitle: catLabels[h.categoryId] || catLabels.other,
      doneClickAction: 'TOGGLE_DONE',
      skipClickAction: 'TOGGLE_SKIP',
      clickActionData: { habitId: h.id, dateKey: targetKey },
    });
  }

  for (const t of tasks) {
    if (t.archived || !isTaskDueOnDate(t, targetDate)) continue;
    const meta = TASK_CATEGORY_META[t.categoryId] || TASK_CATEGORY_META.other;
    const isRecurring = t.taskType === 'recurring';
    const status = isRecurring ? statusOf(t, targetKey) : t.completed ? 'done' : null;
    rows.push({
      kind: 'task',
      id: t.id,
      name: t.title,
      icon: meta.icon,
      color: meta.color,
      isDone: status === 'done',
      isSkipped: status === 'skipped',
      canSkip: isRecurring,
      progressText: '',
      subtitle: meta.label[language] || meta.label.en,
      doneClickAction: 'TASK_TOGGLE_DONE',
      skipClickAction: 'TASK_TOGGLE_SKIP',
      clickActionData: { taskId: t.id, dateKey: targetKey },
    });
  }

  for (const p of planningItems) {
    if (!isPlanningDueOnDate(p, targetDate)) continue;
    const { done, total } = pointsProgress(p);
    rows.push({
      kind: 'planning',
      id: p.id,
      name: p.title,
      icon: PLANNING_ICON,
      color: p.color || PLANNING_COLOR,
      isDone: isPlanningDayCompleted(p, targetDate),
      isSkipped: false,
      canSkip: false,
      progressText: '',
      subtitle: total > 0 ? `${done}/${total}` : (PLANNING_LABEL[language] || PLANNING_LABEL.en),
      doneClickAction: 'PLANNING_TOGGLE_DONE',
      skipClickAction: null,
      clickActionData: { planningId: p.id, dateKey: targetKey },
    });
  }

  return rows;
}

export default function TodayWidget({
  habits,
  tasks = [],
  planningItems = [],
  dayOffset = 0,
  opacity = 100,
  language = 'en',
  widgetHeightDp = null,
}) {
  const targetDate = addDays(new Date(), dayOffset);
  const due = buildRows(habits || [], tasks, planningItems, targetDate, language);

  const dateLabel =
    dayOffset === 0
      ? TODAY_LABEL[language] || TODAY_LABEL.en
      : targetDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

  const subDateLabel = targetDate.toLocaleDateString(
    language === 'ar' ? 'ar-EG' : 'en-US',
    { weekday: 'short', month: 'short', day: 'numeric' }
  );

  const backgroundColor = opacityToArgbHex(opacity);

  const heightIsValid =
    typeof widgetHeightDp === 'number' && Number.isFinite(widgetHeightDp) && widgetHeightDp > 0;
  // Rows are computed from the real available height reported by Android
  // (widgetHeightDp minus the header), so the list always fills the
  // widget exactly instead of leaving a gap or clipping the last row —
  // however tall or short the person resizes it to.
  const maxRows = heightIsValid
    ? Math.max(1, Math.min(20, Math.floor((widgetHeightDp - HEADER_HEIGHT_DP) / ROW_HEIGHT_DP)))
    : 5;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor,
        borderRadius: 24,
        padding: 14,
        paddingBottom: 12,
        flexDirection: 'column',
      }}
    >
      {/* ===== HEADER ===== */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 40,
          marginBottom: 10,
        }}
      >
        {/* LEFT: Icon + Title block (flex:1, takes remaining space) */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
          }}
        >
          {/* App Icon */}
          <FlexWidget
            clickAction="OPEN_APP"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: '#FF8A00',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text="∞"
              style={{ color: '#000000', fontSize: 17, fontWeight: 'bold' }}
            />
          </FlexWidget>

          {/* Title + Date stacked vertically */}
          <FlexWidget
            clickAction="OPEN_APP"
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              marginLeft: 10,
            }}
          >
            <TextWidget
              text={dateLabel}
              style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}
            />
            <TextWidget
              text={subDateLabel}
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 11,
                fontWeight: '500',
                marginTop: 1,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* RIGHT: Nav Buttons (fixed width, never wraps) */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <FlexWidget
            clickAction="ADD_HABIT"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 6,
            }}
          >
            <TextWidget
              text="+"
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: '300' }}
            />
          </FlexWidget>
          <FlexWidget
            clickAction="PREV_DAY"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 6,
            }}
          >
            <TextWidget
              text="‹"
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: '300' }}
            />
          </FlexWidget>
          <FlexWidget
            clickAction="NEXT_DAY"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.08)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text="›"
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: '300' }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* Divider */}
      <FlexWidget
        style={{
          height: 1,
          width: 'match_parent',
          backgroundColor: 'rgba(255,255,255,0.06)',
          marginBottom: 10,
        }}
      />

      {/* Empty State */}
      {due.length === 0 && (
        <TextWidget
          text={language === 'ar' ? 'لا يوجد شيء لهذا اليوم' : 'Nothing for this day'}
          style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center' }}
        />
      )}

      {/* ===== ROWS: habits, tasks, and planning items combined ===== */}
      {due.slice(0, maxRows).map((row) => {
        const nameColor = row.isSkipped ? 'rgba(255,255,255,0.35)' : '#FFFFFF';
        const subColor = row.isSkipped ? 'rgba(142,142,147,0.7)' : row.color;

        return (
          <FlexWidget
            key={`${row.kind}_${row.id}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: 52,
              marginBottom: 8,
              paddingLeft: 10,
              paddingRight: 10,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.025)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.04)',
            }}
          >
            {/* Accent Color Bar */}
            <FlexWidget
              style={{
                width: 3,
                height: 32,
                borderRadius: 2,
                backgroundColor: row.color,
              }}
            />

            {/* Row Info (tap to skip, when supported) — flex:1 takes remaining space */}
            <FlexWidget
              clickAction={row.canSkip ? row.skipClickAction : 'OPEN_APP'}
              clickActionData={row.canSkip ? row.clickActionData : undefined}
              style={{
                flexDirection: 'column',
                justifyContent: 'center',
                flex: 1,
                marginLeft: 10,
              }}
            >
              {/* Name row */}
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                {row.icon && (
                  <TextWidget
                    text={row.icon}
                    style={{ fontSize: 15, marginRight: 4 }}
                  />
                )}
                <TextWidget
                  text={row.name}
                  style={{
                    color: nameColor,
                    fontSize: 14,
                    fontWeight: '600',
                    textDecoration: row.isSkipped ? 'line-through' : 'none',
                  }}
                />
                {row.progressText ? (
                  <TextWidget
                    text={`  ${row.progressText}`}
                    style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500' }}
                  />
                ) : null}
              </FlexWidget>

              {/* Category / subtitle label */}
              <TextWidget
                text={row.subtitle}
                style={{
                  color: subColor,
                  fontSize: 10,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  marginTop: 3,
                }}
              />
            </FlexWidget>

            {/* Action Circle — NO flex, fixed width, never shrinks */}
            <FlexWidget
              clickAction={row.doneClickAction}
              clickActionData={row.clickActionData}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: row.isDone ? row.color : 'transparent',
                borderWidth: row.isDone ? 0 : 2,
                borderColor: row.isSkipped ? 'rgba(142,142,147,0.25)' : row.color,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 8,
              }}
            >
              {row.isDone && (
                <TextWidget
                  text="✓"
                  style={{ color: '#000000', fontSize: 16, fontWeight: '800' }}
                />
              )}
              {row.isSkipped && (
                <TextWidget
                  text="—"
                  style={{ color: 'rgba(142,142,147,0.5)', fontSize: 14, fontWeight: '700' }}
                />
              )}
            </FlexWidget>
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}
