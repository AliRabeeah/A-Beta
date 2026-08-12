import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useTables } from '../context/TableContext';
import { COLUMN_TYPES } from '../constants/tableTemplates';
import { makeColumn, columnAggregate, formatCellDisplay, sortRows, shareTableCSV } from '../utils/tableUtils';
import { toKey } from '../utils/dateUtils';
import ActionSheet from '../components/ActionSheet';
import ColumnEditorSheet from '../components/tables/ColumnEditorSheet';
import TagPickerSheet from '../components/tables/TagPickerSheet';

const COLUMN_WIDTH = { text: 140, number: 90, currency: 110, date: 120, checkbox: 70, tag: 130 };
const ADD_COLUMN_WIDTH = 48;
const ROW_ACTION_WIDTH = 40;

export default function TableDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { tables, updateTable, deleteTable, addColumn, updateColumn, removeColumn, addRow, updateCell, removeRow } = useTables();
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
  const cellInputRef = useRef(null);

  const columns = table?.columns || [];
  const sortColumn = columns.find((c) => c.id === sort.columnId);
  const sortedRows = useMemo(() => sortRows(table?.rows || [], sortColumn, sort.direction), [table?.rows, sortColumn, sort.direction]);

  const totalWidth = columns.reduce((sum, c) => sum + (COLUMN_WIDTH[c.type] || 120), 0) + ADD_COLUMN_WIDTH + ROW_ACTION_WIDTH;
  const hasAggregateColumn = columns.some((c) => c.type === 'number' || c.type === 'currency');

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

  const renderCell = (row, column) => {
    const width = COLUMN_WIDTH[column.type] || 120;
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

  const renderHeader = () => (
    <View style={[styles.headerRow, { backgroundColor: colors.background, borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
      {columns.map((column) => {
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
            <TouchableOpacity onPress={() => setColumnEditorTarget(column)} hitSlop={6} style={{ padding: 2 }}>
              <Ionicons name="ellipsis-vertical" size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        );
      })}
      <TouchableOpacity onPress={() => setColumnEditorTarget(null)} style={[styles.addColumnBtn, { width: ADD_COLUMN_WIDTH, borderColor: colors.border }]}>
        <Ionicons name="add" size={18} color={colors.primary} />
      </TouchableOpacity>
      <View style={{ width: ROW_ACTION_WIDTH }} />
    </View>
  );

  const renderFooter = () => {
    if (!hasAggregateColumn) return null;
    return (
      <View style={[styles.footerRow, { backgroundColor: colors.background, borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
        {columns.map((column) => {
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
        })}
        <View style={{ width: ADD_COLUMN_WIDTH }} />
        <View style={{ width: ROW_ACTION_WIDTH }} />
      </View>
    );
  };

  const renderRow = ({ item: row }) => (
    <View style={[styles.dataRow, { borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}>
      {columns.map((column) => renderCell(row, column))}
      <View style={{ width: ADD_COLUMN_WIDTH }} />
      <TouchableOpacity onPress={() => handleDeleteRow(row)} style={[styles.cell, styles.cellCenter, { width: ROW_ACTION_WIDTH }]} hitSlop={4}>
        <Ionicons name="trash-outline" size={15} color={colors.danger} style={{ opacity: 0.6 }} />
      </TouchableOpacity>
    </View>
  );

  const editingDateValue = datePickerCell
    ? (table.rows.find((r) => r.id === datePickerCell.rowId)?.cells[datePickerCell.columnId] || null)
    : null;
  const tagPickerColumn = tagPickerCell ? columns.find((c) => c.id === tagPickerCell.columnId) : null;
  const tagPickerValue = tagPickerCell
    ? table.rows.find((r) => r.id === tagPickerCell.rowId)?.cells[tagPickerCell.columnId]
    : null;

  const moreActions = [
    { icon: 'share-outline', label: t('exportCSV'), onPress: handleExportCSV },
    { icon: 'trash', label: t('deleteTable'), destructive: true, onPress: handleDeleteTable },
  ];

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
        <TouchableOpacity onPress={() => setMoreMenuVisible(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {columns.length === 0 ? (
        <View style={styles.emptyColumns}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noColumnsYetTitle')}</Text>
          <TouchableOpacity onPress={() => setColumnEditorTarget(null)} style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('addColumnTitle')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ width: totalWidth }}>
              <FlatList
                data={sortedRows}
                keyExtractor={(row) => row.id}
                ListHeaderComponent={renderHeader}
                stickyHeaderIndices={[0]}
                renderItem={renderRow}
                ListFooterComponent={renderFooter}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  titleInput: { flex: 1, fontSize: 17, fontWeight: '700' },
  emptyColumns: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  addFirstBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1.5 },
  headerCell: { paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerNameBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  headerText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  addColumnBtn: { alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth },
  dataRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { paddingVertical: 12, paddingHorizontal: 8, justifyContent: 'center' },
  cellCenter: { alignItems: 'center' },
  cellInput: { borderBottomWidth: 1.5, fontSize: 14, padding: 0, paddingBottom: 2 },
  tagChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, maxWidth: '100%' },
  footerRow: { flexDirection: 'row', borderTopWidth: 1.5 },
  addRowBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
