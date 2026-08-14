import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useTables } from '../context/TableContext';
import { COLUMN_TYPES } from '../constants/tableTemplates';
import {
  makeColumn, columnAggregate, formatCellDisplay, sortRows, shareTableCSV,
  rowMatchesSearch, groupRowsByTag,
} from '../utils/tableUtils';
import { toKey } from '../utils/dateUtils';
import ActionSheet from '../components/ActionSheet';
import ColumnEditorSheet from '../components/tables/ColumnEditorSheet';
import TagPickerSheet from '../components/tables/TagPickerSheet';

const COLUMN_WIDTH = { text: 140, number: 90, currency: 110, date: 120, checkbox: 70, tag: 130, link: 160, rating: 116 };
const ADD_COLUMN_WIDTH = 48;
const ROW_ACTION_WIDTH = 40;
const STAR_COUNT = 5;

// Fixed row heights keep the frozen column and the scrollable columns in
// perfect sync — they're rendered as two independent FlatLists that we
// scroll together, so every row (and group header) must be exactly the
// same height on both sides.
const HEADER_HEIGHT = 42;
const ROW_HEIGHT = 46;
const FOOTER_HEIGHT = 42;
const GROUP_HEADER_HEIGHT = 34;

function isLikelyUrl(value) {
  if (!value) return false;
  return /^(https?:\/\/|www\.)[^\s]+\.[^\s]+/i.test(value.trim());
}
function normalizeUrl(value) {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export default function TableDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { tables, updateTable, deleteTable, addColumn, updateColumn, removeColumn, addRow, updateCell, removeRow, reorderRows } = useTables();
  const tableId = route.params?.tableId;
  const table = tables.find((tb) => tb.id === tableId);
  const insets = useSafeAreaInsets();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const [title, setTitle] = useState(table?.title || '');
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnId }
  const [editingDraft, setEditingDraft] = useState('');
  const [datePickerCell, setDatePickerCell] = useState(null);
  const [tagPickerCell, setTagPickerCell] = useState(null);
  const [columnEditorTarget, setColumnEditorTarget] = useState(undefined); // undefined = closed, null = new, column = edit
  const [sort, setSort] = useState({ columnId: null, direction: 'asc' });
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByColumnId, setGroupByColumnId] = useState(null);
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderDraft, setReorderDraft] = useState([]);
  const cellInputRef = useRef(null);

  // The two lists (frozen column + scrollable columns) scroll vertically in
  // lockstep. syncSource tracks which side the user is actively dragging so
  // we don't fight ourselves with a feedback loop between the two onScroll handlers.
  const frozenListRef = useRef(null);
  const scrollListRef = useRef(null);
  const syncSource = useRef(null);

  const columns = table?.columns || [];
  const frozenColumn = columns.find((c) => c.id === table?.frozenColumnId) || columns[0] || null;
  const scrollColumns = frozenColumn ? columns.filter((c) => c.id !== frozenColumn.id) : columns;

  const sortColumn = columns.find((c) => c.id === sort.columnId);
  const sortedRows = useMemo(() => sortRows(table?.rows || [], sortColumn, sort.direction), [table?.rows, sortColumn, sort.direction]);
  const filteredRows = useMemo(
    () => (searchQuery.trim() ? sortedRows.filter((row) => rowMatchesSearch(row, columns, searchQuery)) : sortedRows),
    [sortedRows, columns, searchQuery]
  );
  const groupByColumn = (groupByColumnId && columns.find((c) => c.id === groupByColumnId && c.type === 'tag')) || null;
  const displayItems = useMemo(
    () => groupRowsByTag(filteredRows, groupByColumn, t('tableGroupNoValue')),
    [filteredRows, groupByColumn, t]
  );
  const tagColumns = columns.filter((c) => c.type === 'tag');

  const frozenWidth = frozenColumn ? (COLUMN_WIDTH[frozenColumn.type] || 120) + ROW_ACTION_WIDTH : 0;
  const scrollWidth = scrollColumns.reduce((sum, c) => sum + (COLUMN_WIDTH[c.type] || 120), 0) + ADD_COLUMN_WIDTH;
  const hasAggregateColumn = columns.some((c) => c.type === 'number' || c.type === 'currency');

  const onFrozenScroll = useCallback((e) => {
    if (syncSource.current === 'scroll') return;
    syncSource.current = 'frozen';
    scrollListRef.current?.scrollToOffset({ offset: e.nativeEvent.contentOffset.y, animated: false });
  }, []);

  const onScrollListScroll = useCallback((e) => {
    if (syncSource.current === 'frozen') return;
    syncSource.current = 'scroll';
    frozenListRef.current?.scrollToOffset({ offset: e.nativeEvent.contentOffset.y, animated: false });
  }, []);

  const clearSyncSource = useCallback(() => { syncSource.current = null; }, []);

  if (!table) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>{t('untitledTable')}</Text>
      </View>
    );
  }

  const commitTitle = () => {
    if (title.trim() !== table.title) updateTable(table.id, { title: title.trim() });
  };

  const toggleSort = (column) => {
    Haptics.selectionAsync();
    setSort((prev) => {
      if (prev.columnId !== column.id) return { columnId: column.id, direction: 'asc' };
      if (prev.direction === 'asc') return { columnId: column.id, direction: 'desc' };
      return { columnId: null, direction: 'asc' };
    });
  };

  const openCellEditor = (row, column) => {
    if (column.type === 'checkbox') {
      Haptics.selectionAsync();
      updateCell(table.id, row.id, column.id, !row.cells[column.id]);
      return;
    }
    if (column.type === 'date') { setDatePickerCell({ rowId: row.id, columnId: column.id }); return; }
    if (column.type === 'tag') { setTagPickerCell({ rowId: row.id, columnId: column.id }); return; }
    if (column.type === 'rating') return; // handled by direct star taps, no text editor
    setEditingDraft(row.cells[column.id] === null || row.cells[column.id] === undefined ? '' : String(row.cells[column.id]));
    setEditingCell({ rowId: row.id, columnId: column.id });
  };

  const commitCellEdit = () => {
    if (!editingCell) return;
    const column = columns.find((c) => c.id === editingCell.columnId);
    let value = editingDraft;
    if (column?.type === 'number' || column?.type === 'currency') {
      value = editingDraft.trim() === '' ? null : Number(editingDraft.replace(',', '.'));
      if (Number.isNaN(value)) value = null;
    }
    updateCell(table.id, editingCell.rowId, editingCell.columnId, value);
    setEditingCell(null);
  };

  const handleSetRating = (row, column, star) => {
    Haptics.selectionAsync();
    const current = row.cells[column.id];
    updateCell(table.id, row.id, column.id, current === star ? null : star);
  };

  const handleOpenLink = (value) => {
    if (!isLikelyUrl(value)) {
      Alert.alert(t('tableInvalidLink'));
      return;
    }
    Linking.openURL(normalizeUrl(value)).catch(() => Alert.alert(t('tableInvalidLink')));
  };

  const handleAddRow = () => addRow(table.id);

  const handleDeleteRow = (row) => {
    Haptics.selectionAsync();
    removeRow(table.id, row.id);
  };

  const handleSaveColumn = (draft) => {
    if (columnEditorTarget) {
      updateColumn(table.id, columnEditorTarget.id, { name: draft.name, tagOptions: draft.tagOptions });
    } else {
      addColumn(table.id, makeColumn(draft.name, draft.type, draft.tagOptions));
    }
    setColumnEditorTarget(undefined);
  };

  const handleDeleteColumn = () => {
    if (!columnEditorTarget) return;
    Alert.alert(t('deleteColumnConfirmTitle'), t('deleteColumnConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          if (table.frozenColumnId === columnEditorTarget.id) updateTable(table.id, { frozenColumnId: null });
          removeColumn(table.id, columnEditorTarget.id);
          setColumnEditorTarget(undefined);
        },
      },
    ]);
  };

  const handleExportCSV = async () => {
    setMoreMenuVisible(false);
    try {
      await shareTableCSV(table, locale);
    } catch (e) {
      Alert.alert(t('exportFailedTitle'));
    }
  };

  const handleDeleteTable = () => {
    setMoreMenuVisible(false);
    Alert.alert(t('deleteTableConfirmTitle'), t('deleteTableConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deleteTable(table.id); navigation.goBack(); } },
    ]);
  };

  const handleSetFrozenColumn = (column) => {
    Haptics.selectionAsync();
    updateTable(table.id, { frozenColumnId: column.id });
  };

  const handleToggleSearch = () => {
    setSearchVisible((v) => {
      if (v) setSearchQuery('');
      return !v;
    });
  };

  const handleEnterReorderMode = () => {
    setMoreMenuVisible(false);
    setReorderDraft(table.rows);
    setReorderMode(true);
  };

  const handleReorderDragEnd = ({ data }) => {
    setReorderDraft(data);
    reorderRows(table.id, data);
  };

  const openGroupPicker = () => {
    setMoreMenuVisible(false);
    setGroupPickerVisible(true);
  };

  const groupPickerActions = [
    { icon: 'close-circle-outline', label: t('tableGroupByNone'), onPress: () => setGroupByColumnId(null) },
    ...tagColumns.map((c) => ({ icon: 'pricetag-outline', label: c.name, onPress: () => setGroupByColumnId(c.id) })),
  ];

  const renderRating = (row, column, width) => (
    <View key={column.id} style={[styles.cell, styles.ratingCell, { width }]}>
      {Array.from({ length: STAR_COUNT }).map((_, i) => {
        const starValue = i + 1;
        const filled = (row.cells[column.id] || 0) >= starValue;
        return (
          <TouchableOpacity key={i} onPress={() => handleSetRating(row, column, starValue)} hitSlop={3}>
            <Ionicons name={filled ? 'star' : 'star-outline'} size={14} color={filled ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderLink = (row, column, width) => {
    const value = row.cells[column.id];
    const isEditingThis = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
    if (isEditingThis) {
      return (
        <View key={column.id} style={[styles.cell, { width }]}>
          <TextInput
            ref={cellInputRef}
            autoFocus
            value={editingDraft}
            onChangeText={setEditingDraft}
            onBlur={commitCellEdit}
            onSubmitEditing={commitCellEdit}
            autoCapitalize="none"
            keyboardType="url"
            style={[styles.cellInput, { color: colors.text, borderColor: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>
      );
    }
    return (
      <View key={column.id} style={[styles.cell, styles.linkCell, { width }, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => openCellEditor(row, column)} style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: value ? colors.primary : colors.textSecondary, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}>
            {value || '\u2014'}
          </Text>
        </TouchableOpacity>
        {!!value && (
          <TouchableOpacity onPress={() => handleOpenLink(value)} hitSlop={6} style={{ paddingHorizontal: 2 }}>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCell = (row, column) => {
    const width = COLUMN_WIDTH[column.type] || 120;
    if (column.type === 'rating') return renderRating(row, column, width);
    if (column.type === 'link') return renderLink(row, column, width);

    const isEditingThis = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
    const value = row.cells[column.id];

    if (isEditingThis) {
      return (
        <View key={column.id} style={[styles.cell, { width }]}>
          <TextInput
            ref={cellInputRef}
            autoFocus
            value={editingDraft}
            onChangeText={setEditingDraft}
            onBlur={commitCellEdit}
            onSubmitEditing={commitCellEdit}
            keyboardType={column.type === 'number' || column.type === 'currency' ? 'decimal-pad' : 'default'}
            style={[styles.cellInput, { color: colors.text, borderColor: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>
      );
    }

    if (column.type === 'checkbox') {
      return (
        <TouchableOpacity key={column.id} onPress={() => openCellEditor(row, column)} style={[styles.cell, styles.cellCenter, { width }]}>
          <Ionicons name={value ? 'checkbox' : 'square-outline'} size={20} color={value ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      );
    }

    if (column.type === 'tag') {
      const opt = (column.tagOptions || []).find((o) => o.id === value);
      return (
        <TouchableOpacity key={column.id} onPress={() => openCellEditor(row, column)} style={[styles.cell, { width }]}>
          {opt ? (
            <View style={[styles.tagChip, { backgroundColor: withAlpha(opt.color, 0.18) }]}>
              <Text numberOfLines={1} style={{ color: opt.color, fontSize: 12, fontWeight: '700' }}>{opt.label}</Text>
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{'\u2014'}</Text>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity key={column.id} onPress={() => openCellEditor(row, column)} style={[styles.cell, { width }]}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>
          {formatCellDisplay(value, column, locale)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderColumnHeaderCell = (column, { showPin = false } = {}) => {
    const width = COLUMN_WIDTH[column.type] || 120;
    const isSorted = sort.columnId === column.id;
    return (
      <View key={column.id} style={[styles.headerCell, { width, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => toggleSort(column)} style={styles.headerNameBtn}>
          <Text numberOfLines={1} style={[styles.headerText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {column.name}
          </Text>
          {isSorted && <Ionicons name={sort.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={11} color={colors.primary} />}
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {showPin && (
            <TouchableOpacity onPress={() => handleSetFrozenColumn(column)} hitSlop={6} style={{ padding: 2 }}>
              <Ionicons name="pin-outline" size={13} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setColumnEditorTarget(column)} hitSlop={6} style={{ padding: 2 }}>
            <Ionicons name="ellipsis-vertical" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooterCell = (column) => {
    const width = COLUMN_WIDTH[column.type] || 120;
    if (column.type !== 'number' && column.type !== 'currency') return <View key={column.id} style={{ width }} />;
    const { sum } = columnAggregate(table, column.id);
    return (
      <View key={column.id} style={[styles.cell, { width }]}>
        <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>
          {'\u03a3 '}{sum.toLocaleString(locale, { maximumFractionDigits: 2 })}
        </Text>
      </View>
    );
  };

  const zebraBg = (index) => (index % 2 === 1 ? withAlpha(colors.text, 0.035) : 'transparent');

  // ---- Frozen (pinned) column: header / row / footer ----

  const renderFrozenHeader = () => (
    <View style={[styles.headerRow, { height: HEADER_HEIGHT, backgroundColor: colors.surface, borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
      {renderColumnHeaderCell(frozenColumn)}
      <View style={{ width: ROW_ACTION_WIDTH }} />
    </View>
  );

  const renderFrozenItem = ({ item, index }) => {
    if (item.type === 'group') {
      return (
        <View style={[styles.groupHeader, { height: GROUP_HEADER_HEIGHT, width: frozenWidth, backgroundColor: withAlpha(item.color || colors.primary, 0.14), borderColor: colors.border }]}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{item.label} · {item.count}</Text>
        </View>
      );
    }
    const row = item.row;
    return (
      <View style={[styles.dataRow, { height: ROW_HEIGHT, backgroundColor: colors.surface, borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: zebraBg(index) }]} pointerEvents="none" />
        {renderCell(row, frozenColumn)}
        <TouchableOpacity onPress={() => handleDeleteRow(row)} style={[styles.cell, styles.cellCenter, { width: ROW_ACTION_WIDTH }]} hitSlop={4}>
          <Ionicons name="trash-outline" size={15} color={colors.danger} style={{ opacity: 0.6 }} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderFrozenFooter = () => {
    if (!hasAggregateColumn) return null;
    const isAggregatable = frozenColumn.type === 'number' || frozenColumn.type === 'currency';
    return (
      <View style={[styles.footerRow, { height: FOOTER_HEIGHT, backgroundColor: colors.surface, borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
        {isAggregatable ? renderFooterCell(frozenColumn) : (
          <View style={[styles.cell, { width: COLUMN_WIDTH[frozenColumn.type] || 120 }]}>
            <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{t('tableTotalLabel')}</Text>
          </View>
        )}
        <View style={{ width: ROW_ACTION_WIDTH }} />
      </View>
    );
  };

  // ---- Scrollable (remaining) columns: header / row / footer ----

  const renderScrollHeader = () => (
    <View style={[styles.headerRow, { height: HEADER_HEIGHT, backgroundColor: colors.background, borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
      {scrollColumns.map((c) => renderColumnHeaderCell(c, { showPin: true }))}
      <TouchableOpacity onPress={() => setColumnEditorTarget(null)} style={[styles.addColumnBtn, { width: ADD_COLUMN_WIDTH, borderColor: colors.border }]}>
        <Ionicons name="add" size={18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderScrollItem = ({ item, index }) => {
    if (item.type === 'group') {
      return <View style={[styles.groupHeader, { height: GROUP_HEADER_HEIGHT, width: scrollWidth, backgroundColor: withAlpha(item.color || colors.primary, 0.14), borderColor: colors.border }]} />;
    }
    const row = item.row;
    return (
      <View style={[styles.dataRow, { height: ROW_HEIGHT, borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: zebraBg(index) }]} pointerEvents="none" />
        {scrollColumns.map((column) => renderCell(row, column))}
        <View style={{ width: ADD_COLUMN_WIDTH }} />
      </View>
    );
  };

  const renderScrollFooter = () => {
    if (!hasAggregateColumn) return null;
    return (
      <View style={[styles.footerRow, { height: FOOTER_HEIGHT, backgroundColor: colors.background, borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
        {scrollColumns.map(renderFooterCell)}
        <View style={{ width: ADD_COLUMN_WIDTH }} />
      </View>
    );
  };

  const editingDateValue = datePickerCell
    ? (table.rows.find((r) => r.id === datePickerCell.rowId)?.cells[datePickerCell.columnId] || null)
    : null;
  const tagPickerColumn = tagPickerCell ? columns.find((c) => c.id === tagPickerCell.columnId) : null;
  const tagPickerValue = tagPickerCell
    ? table.rows.find((r) => r.id === tagPickerCell.rowId)?.cells[tagPickerCell.columnId]
    : null;

  const moreActions = [
    { icon: 'swap-vertical', label: t('tableReorderRows'), onPress: handleEnterReorderMode },
    { icon: 'layers-outline', label: `${t('tableGroupBy')}${groupByColumn ? `: ${groupByColumn.name}` : ''}`, onPress: openGroupPicker },
    { icon: 'share-outline', label: t('exportCSV'), onPress: handleExportCSV },
    { icon: 'trash', label: t('deleteTable'), destructive: true, onPress: handleDeleteTable },
  ];

  if (reorderMode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.titleInput, { color: colors.text }]} numberOfLines={1}>{t('tableReorderRows')}</Text>
          <TouchableOpacity onPress={() => setReorderMode(false)} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{t('tableReorderDoneBtn')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{t('tableReorderHint')}</Text>
        <DraggableFlatList
          data={reorderDraft}
          keyExtractor={(row) => row.id}
          onDragEnd={handleReorderDragEnd}
          renderItem={({ item: row, drag, isActive }) => (
            <ScaleDecorator>
              <TouchableOpacity
                onLongPress={drag}
                disabled={isActive}
                style={[
                  styles.reorderRow,
                  { backgroundColor: isActive ? withAlpha(colors.primary, 0.12) : colors.surface, borderColor: colors.border },
                  isRTL && { flexDirection: 'row-reverse' },
                ]}
              >
                <Ionicons name="reorder-three" size={20} color={colors.textSecondary} />
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                  {frozenColumn ? formatCellDisplay(row.cells[frozenColumn.id], frozenColumn, locale) || t('untitledTable') : t('untitledTable')}
                </Text>
              </TouchableOpacity>
            </ScaleDecorator>
          )}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onBlur={commitTitle}
          placeholder={t('tableNamePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[styles.titleInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
        />
        <TouchableOpacity onPress={handleToggleSearch} hitSlop={8}>
          <Ionicons name={searchVisible ? 'search' : 'search-outline'} size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMoreMenuVisible(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {searchVisible && (
        <View style={[styles.searchBar, { borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="search" size={15} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            placeholder={t('tableSearchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={{ flex: 1, color: colors.text, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
      {searchVisible && searchQuery.trim() !== '' && filteredRows.length === 0 && (
        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>{t('tableNoSearchResults')}</Text>
      )}

      {columns.length === 0 ? (
        <View style={styles.emptyColumns}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noColumnsYetTitle')}</Text>
          <TouchableOpacity onPress={() => setColumnEditorTarget(null)} style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('addColumnTitle')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={[styles.tableBody, isRTL && { flexDirection: 'row-reverse' }]}>
            {/* Frozen/pinned column — stays put while the rest of the table scrolls horizontally. */}
            <View
              style={[
                { width: frozenWidth },
                isRTL ? { borderLeftWidth: 1.5, borderLeftColor: colors.border } : { borderRightWidth: 1.5, borderRightColor: colors.border },
              ]}
            >
              <FlatList
                ref={frozenListRef}
                data={displayItems}
                keyExtractor={(item) => item.key}
                ListHeaderComponent={renderFrozenHeader}
                stickyHeaderIndices={[0]}
                renderItem={renderFrozenItem}
                ListFooterComponent={renderFrozenFooter}
                onScroll={onFrozenScroll}
                onScrollBeginDrag={() => { syncSource.current = 'frozen'; }}
                onMomentumScrollEnd={clearSyncSource}
                onScrollEndDrag={clearSyncSource}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Remaining columns, scrollable horizontally. */}
            <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
              <View style={{ width: scrollWidth }}>
                <FlatList
                  ref={scrollListRef}
                  data={displayItems}
                  keyExtractor={(item) => item.key}
                  ListHeaderComponent={renderScrollHeader}
                  stickyHeaderIndices={[0]}
                  renderItem={renderScrollItem}
                  ListFooterComponent={renderScrollFooter}
                  onScroll={onScrollListScroll}
                  onScrollBeginDrag={() => { syncSource.current = 'scroll'; }}
                  onMomentumScrollEnd={clearSyncSource}
                  onScrollEndDrag={clearSyncSource}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity onPress={handleAddRow} style={[styles.addRowBar, { borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{t('addRow')}</Text>
          </TouchableOpacity>
        </>
      )}

      {datePickerCell && (
        <DateTimePicker
          value={editingDateValue ? new Date(editingDateValue + 'T00:00:00') : new Date()}
          mode="date"
          onChange={(event, selected) => {
            const cell = datePickerCell;
            setDatePickerCell(null);
            if (selected && cell) updateCell(table.id, cell.rowId, cell.columnId, toKey(selected));
          }}
        />
      )}

      <TagPickerSheet
        visible={!!tagPickerCell}
        options={tagPickerColumn?.tagOptions || []}
        value={tagPickerValue}
        onClose={() => setTagPickerCell(null)}
        onSelect={(optionId) => {
          if (tagPickerCell) updateCell(table.id, tagPickerCell.rowId, tagPickerCell.columnId, optionId);
          setTagPickerCell(null);
        }}
      />

      <ColumnEditorSheet
        visible={columnEditorTarget !== undefined}
        column={columnEditorTarget}
        onClose={() => setColumnEditorTarget(undefined)}
        onSave={handleSaveColumn}
        onDelete={columnEditorTarget ? handleDeleteColumn : undefined}
      />

      <ActionSheet visible={moreMenuVisible} onClose={() => setMoreMenuVisible(false)} title={table.title || t('untitledTable')} actions={moreActions} />
      <ActionSheet visible={groupPickerVisible} onClose={() => setGroupPickerVisible(false)} title={t('tableGroupByPickTitle')} actions={groupPickerActions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 14 },
  titleInput: { flex: 1, fontSize: 17, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 12 },
  emptyColumns: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  addFirstBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  tableBody: { flex: 1, flexDirection: 'row' },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1.5 },
  headerCell: { paddingHorizontal: 8, borderRightWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  headerNameBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  headerText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  addColumnBtn: { alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth },
  dataRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  groupHeader: { justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { paddingHorizontal: 8, justifyContent: 'center', flex: 1 },
  cellCenter: { alignItems: 'center' },
  cellInput: { borderBottomWidth: 1.5, fontSize: 14, padding: 0, paddingBottom: 2 },
  tagChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, maxWidth: '100%' },
  ratingCell: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerRow: { flexDirection: 'row', borderTopWidth: 1.5 },
  addRowBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  reorderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, marginHorizontal: 12, borderRadius: 10, marginBottom: 6 },
});
