import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, PanResponder, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  WIDGET_KEYS,
  WIDGET_ACCENT_OPTIONS,
  WIDGET_STYLE_OPTIONS,
  WIDGET_SIZE_OPTIONS,
  MAX_WIDGET_CUSTOM_OFFSET,
  DEFAULT_WIDGET_CUSTOMIZATION,
  getWidgetCustomization,
  setWidgetCustomization,
  resetWidgetCustomization,
} from '../utils/widgetCustomization';
import { refreshCustomWidget } from '../utils/widgetSync';

const TABS = [
  { key: WIDGET_KEYS.list, icon: 'list-outline', labelKey: 'widgetTabList' },
  { key: WIDGET_KEYS.stats, icon: 'stats-chart-outline', labelKey: 'widgetTabStats' },
  { key: WIDGET_KEYS.quickAdd, icon: 'add-circle-outline', labelKey: 'widgetTabQuickAdd' },
];

const PAD_SIZE = 140; // dp — the draggable position pad

/** A small square pad the person drags a dot inside to set the widget's on-screen offset. */
function PositionPad({ value, onChange, accentColor }) {
  const dot = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const center = PAD_SIZE / 2;
    const px = center + (value.x / MAX_WIDGET_CUSTOM_OFFSET) * (center - 14);
    const py = center + (value.y / MAX_WIDGET_CUSTOM_OFFSET) * (center - 14);
    dot.setValue({ x: px - 14, y: py - 14 });
  }, [value.x, value.y]);

  // Drag is tracked via dx/dy deltas from the gesture's start point, applied
  // to the offset that was current when the touch began — avoids any
  // absolute-position math mismatches with the dot's own animated position.
  const startValue = useRef({ x: 0, y: 0 });
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValue.current = { ...valueRef.current };
      },
      onPanResponderMove: (evt, gesture) => {
        const center = PAD_SIZE / 2 - 14;
        const nextX = Math.max(-MAX_WIDGET_CUSTOM_OFFSET, Math.min(MAX_WIDGET_CUSTOM_OFFSET, startValue.current.x + (gesture.dx / center) * MAX_WIDGET_CUSTOM_OFFSET));
        const nextY = Math.max(-MAX_WIDGET_CUSTOM_OFFSET, Math.min(MAX_WIDGET_CUSTOM_OFFSET, startValue.current.y + (gesture.dy / center) * MAX_WIDGET_CUSTOM_OFFSET));
        onChange({ x: Math.round(nextX), y: Math.round(nextY) });
      },
      onPanResponderRelease: () => Haptics.selectionAsync(),
    })
  ).current;

  return (
    <View style={[padStyles.pad, { borderColor: accentColor + '55' }]}>
      <View style={[padStyles.crosshairH, { backgroundColor: accentColor + '33' }]} />
      <View style={[padStyles.crosshairV, { backgroundColor: accentColor + '33' }]} />
      <Animated.View
        {...responder.panHandlers}
        style={[padStyles.dot, { backgroundColor: accentColor, transform: dot.getTranslateTransform() }]}
      />
    </View>
  );
}

const padStyles = StyleSheet.create({
  pad: {
    width: PAD_SIZE,
    height: PAD_SIZE,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  crosshairH: { position: 'absolute', top: PAD_SIZE / 2 - 0.5, left: 0, right: 0, height: 1 },
  crosshairV: { position: 'absolute', left: PAD_SIZE / 2 - 0.5, top: 0, bottom: 0, width: 1 },
  dot: { position: 'absolute', width: 28, height: 28, borderRadius: 14 },
});

/** Rough visual stand-in for each widget — not the literal RemoteViews render, just enough to preview color/style/size choices. */
function WidgetPreview({ widgetKey, accentColor, style, size, colors, t }) {
  const bg = style === 'transparent' ? 'transparent' : style === 'solid' ? '#171717' : 'rgba(20,20,24,0.7)';
  const scale = size === 'small' ? 0.85 : size === 'large' ? 1.15 : 1;

  if (widgetKey === WIDGET_KEYS.quickAdd) {
    return (
      <View style={[previewStyles.card, { backgroundColor: bg, borderColor: colors.border }]}>
        <View style={{ width: 44 * scale, height: 44 * scale, borderRadius: 22 * scale, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#0B0B0F', fontSize: 22 * scale, fontWeight: 'bold' }}>+</Text>
        </View>
        <Text style={{ color: '#C8C8CC', fontSize: 11 * scale, marginTop: 6, fontWeight: '600' }}>{t('widgetPreviewAdd')}</Text>
      </View>
    );
  }
  if (widgetKey === WIDGET_KEYS.stats) {
    return (
      <View style={[previewStyles.card, { backgroundColor: bg, borderColor: colors.border }]}>
        <Text style={{ color: '#FFFFFF', fontSize: 26 * scale, fontWeight: 'bold' }}>3/5</Text>
        <Text style={{ color: '#8E8E93', fontSize: 11 * scale, marginTop: 2, marginBottom: 8 }}>{t('widgetPreviewToday')}</Text>
        <View style={{ width: 90, height: 7, borderRadius: 4, backgroundColor: '#2A2A2A' }}>
          <View style={{ width: '60%', height: 7, borderRadius: 4, backgroundColor: accentColor }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Text style={{ fontSize: 12 * scale, marginRight: 4 }}>🔥</Text>
          <Text style={{ color: accentColor, fontSize: 11 * scale, fontWeight: '700' }}>4 {t('widgetPreviewDays')}</Text>
        </View>
      </View>
    );
  }
  // list
  return (
    <View style={[previewStyles.card, { backgroundColor: bg, borderColor: colors.border, alignItems: 'stretch', paddingHorizontal: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: accentColor, fontSize: 12 * scale, fontWeight: '700' }}>{t('widgetPreviewToday')}</Text>
        <Text style={{ color: '#C8C8CC', fontSize: 12 * scale, fontWeight: '600' }}>2/3</Text>
      </View>
      {[{ done: true, label: t('widgetPreviewRow1') }, { done: false, label: t('widgetPreviewRow2') }].map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', height: 26 * scale }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, marginRight: 8, backgroundColor: row.done ? accentColor : '#FFFFFF33' }} />
          <Text style={{ color: row.done ? '#8E8E93' : '#FFFFFF', fontSize: 12 * scale }}>{row.label}</Text>
        </View>
      ))}
    </View>
  );
}

const previewStyles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 140,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
});

export default function WidgetsSettingsScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(WIDGET_KEYS.list);
  const [custom, setCustom] = useState(DEFAULT_WIDGET_CUSTOMIZATION);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    getWidgetCustomization(activeTab).then((c) => {
      setCustom(c);
      setLoaded(true);
    });
  }, [activeTab]);

  const persist = useCallback(
    async (next) => {
      setCustom(next);
      await setWidgetCustomization(activeTab, next);
      refreshCustomWidget(activeTab);
    },
    [activeTab]
  );

  const handleColor = (accentColor) => {
    Haptics.selectionAsync();
    persist({ ...custom, accentColor });
  };
  const handleStyle = (style) => {
    Haptics.selectionAsync();
    persist({ ...custom, style });
  };
  const handleSize = (size) => {
    Haptics.selectionAsync();
    persist({ ...custom, size });
  };
  const handleOffset = (offset) => {
    persist({ ...custom, offset });
  };
  const handleReset = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await resetWidgetCustomization(activeTab);
    setCustom(DEFAULT_WIDGET_CUSTOMIZATION);
    refreshCustomWidget(activeTab);
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
      {/* which widget */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, { backgroundColor: activeTab === tab.key ? colors.primary : colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? colors.onPrimary : colors.textSecondary} />
            <Text style={{ color: activeTab === tab.key ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* live-ish preview */}
      <View style={[styles.previewWrap, { backgroundColor: '#0E0E12' }]}>
        <WidgetPreview widgetKey={activeTab} accentColor={custom.accentColor} style={custom.style} size={custom.size} colors={colors} t={t} />
      </View>

      {/* color */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('widgetColorLabel')}</Text>
      <View style={styles.swatchRow}>
        {WIDGET_ACCENT_OPTIONS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => handleColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c, borderColor: custom.accentColor === c ? colors.text : 'transparent' },
            ]}
          >
            {custom.accentColor === c && <Ionicons name="checkmark" size={16} color={c === '#FFFFFF' || c === '#FFD60A' ? '#000000' : '#FFFFFF'} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* style */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('widgetStyleLabel')}</Text>
      <View style={styles.pillRow}>
        {WIDGET_STYLE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            onPress={() => handleStyle(opt.id)}
            style={[styles.pill, { backgroundColor: custom.style === opt.id ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Text style={{ color: custom.style === opt.id ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>{t(opt.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* size */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('widgetSizeLabel')}</Text>
      <View style={styles.pillRow}>
        {WIDGET_SIZE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            onPress={() => handleSize(opt.id)}
            style={[styles.pill, { backgroundColor: custom.size === opt.id ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Text style={{ color: custom.size === opt.id ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>{t(opt.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* position */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('widgetPositionLabel')}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('widgetPositionHint')}</Text>
      <PositionPad value={custom.offset} onChange={handleOffset} accentColor={custom.accentColor} />

      <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
        <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 6 }}>{t('widgetResetButton')}</Text>
      </TouchableOpacity>

      <Text style={[styles.footnote, { color: colors.textSecondary }]}>{t('widgetSettingsFootnote')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flex: 1, justifyContent: 'center' },
  previewWrap: { borderRadius: 22, padding: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 10, marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingVertical: 10 },
  footnote: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
});
