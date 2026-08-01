import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import WishlistCard from '../components/WishlistCard';
import WishlistFilterBar from '../components/WishlistFilterBar';
import SideDrawer from '../components/SideDrawer';

// Same responsive column logic as Favorites — 2 columns is the baseline
// even on phones so the grid never leaves a big empty area under 1-2 cards.
function columnsForWidth(width) {
  if (width >= 900) return 4;
  if (width >= 650) return 3;
  if (width >= 340) return 2;
  return 1;
}

const HORIZONTAL_PADDING = 16;
const GRID_GAP = 10;

export default function WishlistScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { items, tags, loaded, deleteItem } = useWishlist();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const numColumns = columnsForWidth(width);
  // Fixed pixel width per card (instead of flex: 1) so that when the last
  // row has fewer items than numColumns, the lone card keeps its normal
  // compact size instead of stretching to fill the whole row.
  const cardWidth =
    numColumns > 1 ? (width - HORIZONTAL_PADDING * 2 - GRID_GAP * (numColumns - 1)) / numColumns : undefined;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTagIds, setActiveTagIds] = useState([]);
  const [query, setQuery] = useState('');

  const tagsById = useMemo(() => tags.reduce((acc, tg) => ({ ...acc, [tg.id]: tg }), {}), [tags]);

  const counts = useMemo(() => {
    const c = {};
    tags.forEach((tg) => {
      c[tg.id] = items.filter((it) => (it.tagIds || []).includes(tg.id)).length;
    });
    return c;
  }, [items, tags]);

  const handleToggleTag = (tagId) => {
    if (tagId === null) {
      setActiveTagIds([]);
      return;
    }
    setActiveTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const filtered = useMemo(() => {
    let result = items;
    if (activeTagIds.length > 0) {
      result = result.filter((it) => (it.tagIds || []).some((id) => activeTagIds.includes(id)));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (it) => it.title.toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [items, activeTagIds, query]);

  const handleAdd = () => navigation.navigate('AddEditWishlist');
  const handleOpen = (item) => navigation.navigate('AddEditWishlist', { wishlistId: item.id });

  const handleDelete = (item) => {
    Haptics.selectionAsync();
    Alert.alert(t('deleteConfirmTitle'), `${t('deleteConfirmBody')} "${item.title}"?`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteItem(item.id) },
    ]);
  };

  const renderEmptyState = () => {
    const filteredEmpty = items.length > 0 && (activeTagIds.length > 0 || query.trim().length > 0);
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>🌠</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {filteredEmpty ? t('wishlistNoResultsTitle') : t('wishlistEmptyTitle')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {filteredEmpty ? t('wishlistNoResultsSubtitle') : t('wishlistEmptySubtitle')}
        </Text>
        {!filteredEmpty && (
          <TouchableOpacity onPress={handleAdd} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.emptyBtnText, { color: colors.onPrimary }]}>{t('wishlistAddFirst')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!loaded) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.headerLeft, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('wishlistTitle')}</Text>
        </View>
      </View>

      <View style={[styles.searchRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.surface }, isRTL && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('wishlistSearchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterWrap}>
        <WishlistFilterBar tags={tags} counts={counts} activeTagIds={activeTagIds} onToggleTag={handleToggleTag} />
      </View>

      <FlatList
        data={filtered}
        key={numColumns}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={filtered.length === 0 ? styles.emptyListContent : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => (
          <View style={numColumns > 1 ? [styles.gridCell, { width: cardWidth }] : undefined}>
            <WishlistCard
              item={item}
              tagsById={tagsById}
              onPress={() => handleOpen(item)}
              onLongPress={() => handleDelete(item)}
            />
          </View>
        )}
      />

      <TouchableOpacity
        onPress={handleAdd}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </TouchableOpacity>

      <SideDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuBtn: { padding: 6, marginRight: 6 },
  title: { fontSize: 24, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    height: 36,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0, height: '100%' },
  filterWrap: { paddingHorizontal: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyListContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 100 },
  gridRow: { gap: GRID_GAP },
  gridCell: { marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { fontWeight: '700', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
