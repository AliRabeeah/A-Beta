import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTrash } from '../context/TrashContext';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NoteContext';
import { usePlanning } from '../context/PlanningContext';
import { useTables } from '../context/TableContext';
import { useFavorites } from '../context/FavoriteContext';
import { useWishlist } from '../context/WishlistContext';

function labelFor(item, t) {
  switch (item.type) {
    case 'task':
      return item.data.title || t('trashType_task');
    case 'note':
      if (item.data.isLocked) return t('noteLockedTitle');
      return item.data.title || item.data.content?.slice(0, 40) || t('trashType_note');
    case 'planning':
      return item.data.title || t('trashType_planning');
    case 'favorite':
      return item.data.title || t('trashType_favorite');
    case 'wishlist':
      return item.data.title || t('trashType_wishlist');
    case 'table':
      return item.data.title || t('trashType_table');
    default:
      return '—';
  }
}

export default function TrashScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { items, refresh, removeItem, clearAll } = useTrash();
  const { restoreTask } = useTasks();
  const { restoreNote } = useNotes();
  const { restorePlanningItem } = usePlanning();
  const { restoreFavorite } = useFavorites();
  const { restoreItem: restoreWishlistItem } = useWishlist();
  const { restoreTable } = useTables();

  useEffect(() => {
    navigation.setOptions({ title: t('trashTitle') });
  }, [navigation, t]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const restoreHandlers = {
    task: restoreTask,
    note: restoreNote,
    planning: restorePlanningItem,
    favorite: restoreFavorite,
    wishlist: restoreWishlistItem,
    table: restoreTable,
  };

  const handleRestore = async (item) => {
    const restoreFn = restoreHandlers[item.type];
    if (restoreFn) await restoreFn(item.data);
    await removeItem(item.id);
  };

  const handleDeleteForever = (item) => {
    Alert.alert(t('deleteForever'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('deleteForever'), style: 'destructive', onPress: () => removeItem(item.id) },
    ]);
  };

  const handleEmptyTrash = () => {
    if (items.length === 0) return;
    Alert.alert(t('emptyTrashConfirmTitle'), t('emptyTrashConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('emptyTrash'), style: 'destructive', onPress: () => clearAll() },
    ]);
  };

  const byType = {
    task: items.filter((i) => i.type === 'task'),
    note: items.filter((i) => i.type === 'note'),
    planning: items.filter((i) => i.type === 'planning'),
    favorite: items.filter((i) => i.type === 'favorite'),
    wishlist: items.filter((i) => i.type === 'wishlist'),
    table: items.filter((i) => i.type === 'table'),
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {items.length > 0 && (
        <TouchableOpacity onPress={handleEmptyTrash} style={styles.emptyTrashBtn}>
          <Ionicons name="trash-bin-outline" size={16} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: '700', marginLeft: 6, fontSize: 13 }}>{t('emptyTrash')}</Text>
        </TouchableOpacity>
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trash-outline" size={36} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 10 }}>{t('trashEmpty')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
          {['task', 'note', 'planning', 'favorite', 'wishlist', 'table'].map((type) =>
            byType[type].length === 0 ? null : (
              <View key={type} style={{ marginBottom: 16 }}>
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t(`trashType_${type}`)}</Text>
                {byType[type].map((item) => (
                  <View key={item.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {labelFor(item, t)}
                    </Text>
                    <TouchableOpacity onPress={() => handleRestore(item)} style={styles.iconBtn}>
                      <Ionicons name="arrow-undo-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteForever(item)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )
          )}
          <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            {t('trashAutoCleanHint')}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTrashBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', padding: 16, paddingBottom: 4 },
  sectionHeader: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  iconBtn: { padding: 8, marginLeft: 4 },
});
