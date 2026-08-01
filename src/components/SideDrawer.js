import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8);
const ORDER_STORAGE_KEY = 'sidebar_menu_order';

export default function SideDrawer({ visible, onClose, navigation }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [order, setOrder] = useState(null);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const dateLabel = new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const go = (screen) => {
    onClose();
    navigation.navigate(screen);
  };

  const MENU_ITEMS = [
    { key: 'Today', icon: 'checkmark-circle-outline', label: t('today') },
    { key: 'Search', icon: 'search-outline', label: t('searchTitle') },
    { key: 'Agenda', icon: 'calendar-outline', label: t('agendaTitle') },
    { key: 'Habits', icon: 'list-outline', label: t('habitsTitle') },
    { key: 'Planning', icon: 'school-outline', label: t('planningTitle') },
    { key: 'Tasks', icon: 'clipboard-outline', label: t('tasksTitle') },
    { key: 'Challenges', icon: 'trophy-outline', label: t('challenges') },
    { key: 'Notes', icon: 'document-text-outline', label: t('notesTitle') },
    { key: 'Favorites', icon: 'star-outline', label: t('favoritesTitle') },
    { key: 'Wishlist', icon: 'sparkles-outline', label: t('wishlistTitle') },
    { key: 'Timer', icon: 'timer-outline', label: t('timerTitle') },
    { key: 'Stats', icon: 'bar-chart-outline', label: t('statsTitle') },
    { key: 'WeeklyReview', icon: 'calendar-outline', label: t('weeklyReviewTitle') },
    { key: 'YearInPixels', icon: 'grid-outline', label: t('yearInPixelsTitle') },
    { key: 'Archive', icon: 'archive-outline', label: t('archivedHabitsTitle') },
    { key: 'Settings', icon: 'settings-outline', label: t('settingsTitle') },
    { key: 'About', icon: 'information-circle-outline', label: t('aboutApp') },
  ];

  const itemsByKey = MENU_ITEMS.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});

  const reorderableKeys = MENU_ITEMS.map((i) => i.key);

  // Load (and reconcile) the persisted order every time the drawer opens.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    AsyncStorage.getItem(ORDER_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      let stored = [];
      try {
        stored = raw ? JSON.parse(raw) : [];
      } catch (e) {
        stored = [];
      }
      // Keep only keys that still exist, then append any new keys
      // (e.g. a feature added after the user last customized their order).
      const known = stored.filter((k) => reorderableKeys.includes(k));
      const missing = reorderableKeys.filter((k) => !known.includes(k));
      setOrder([...known, ...missing]);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const persistOrder = useCallback(async (next) => {
    // Update UI immediately; persist in the background so dragging never
    // feels blocked or laggy waiting on AsyncStorage.
    setOrder(next);
    AsyncStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  if (!visible) return null;

  const orderedKeys = order && order.length ? order : reorderableKeys;
  const draggableData = orderedKeys.map((key) => itemsByKey[key]).filter(Boolean);

  const renderMenuItem = ({ item, drag, isActive }) => (
    <ScaleDecorator>
      <TouchableOpacity
        onPress={() => go(item.key)}
        onLongPress={drag}
        delayLongPress={200}
        disabled={isActive}
        style={[
          styles.menuRow,
          language === 'ar' && { flexDirection: 'row-reverse' },
          isActive && { opacity: 0.6 },
        ]}
      >
        <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
        <Text style={{ color: colors.text, marginHorizontal: 16, fontSize: 15 }}>{item.label}</Text>
      </TouchableOpacity>
    </ScaleDecorator>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: colors.background,
              transform: [{ translateX: slideAnim }],
              [language === 'ar' ? 'right' : 'left']: 0,
            },
          ]}
        >
          <View style={[styles.header, language === 'ar' && { flexDirection: 'row-reverse' }]}>
            {/* TODO: once you have your logo file, replace this placeholder
                square with: <Image source={require('../../assets/logo.png')}
                style={{ width: 56, height: 56, borderRadius: 14 }} /> */}
            <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.onPrimary, fontSize: 22, fontWeight: '800' }}>∞</Text>
            </View>
            <View style={[styles.headerText, language === 'ar' && { alignItems: 'flex-end' }]}>
              <Text style={[styles.appName, { color: colors.text }]}>A</Text>
              <Text style={[styles.byLine, { color: colors.textSecondary }]}>by Ali Halim</Text>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{dateLabel}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.draggableListWrap}>
            <DraggableFlatList
              data={draggableData}
              keyExtractor={(item) => item.key}
              renderItem={renderMenuItem}
              onDragEnd={({ data }) => persistOrder(data.map((item) => item.key))}
              containerStyle={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: { position: 'absolute', top: 0, bottom: 0, paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logoPlaceholder: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerText: { alignItems: 'flex-start' },
  appName: { fontSize: 18, fontWeight: '800' },
  byLine: { fontSize: 11.5, marginTop: 2 },
  dateLabel: { fontSize: 11.5, marginTop: 3 },
  divider: { height: 1, marginBottom: 8 },
  draggableListWrap: { flex: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
});
