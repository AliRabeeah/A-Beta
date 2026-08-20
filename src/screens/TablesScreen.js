import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTables } from '../context/TableContext';
import { TABLE_TEMPLATES, TAG_COLOR_PALETTE } from '../constants/tableTemplates';
import { makeColumn, makeTagOptionId, buildTableFromCSVRows, pickAndParseCSVFile } from '../utils/tableUtils';
import TableCard from '../components/TableCard';
import ActionSheet from '../components/ActionSheet';

export default function TablesScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { tables, deleteTable, toggleTablePinned, addTable } = useTables();
  const insets = useSafeAreaInsets();

  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [creationSheetVisible, setCreationSheetVisible] = useState(false);
  const [cardActionsTable, setCardActionsTable] = useState(null);
  const [importingCSV, setImportingCSV] = useState(false);

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.lastEdited) - new Date(a.lastEdited);
    }),
    [tables]
  );

  const handleOpenTable = useCallback((table) => {
    navigation.navigate('TableDetail', { tableId: table.id });
  }, [navigation]);


  const createFromTemplate = useCallback(async (template) => {
    Haptics.selectionAsync();
    setTemplatePickerVisible(false);
    const columns = template.columns.map((c) => {
      const tagOptions = c.tagOptionKeys
        ? c.tagOptionKeys.map((key, i) => ({ id: makeTagOptionId(), label: t(key), color: TAG_COLOR_PALETTE[i % TAG_COLOR_PALETTE.length] }))
        : undefined;
      return makeColumn(t(c.nameKey), c.type, tagOptions);
    });
    const newTable = await addTable({ title: t(template.nameKey), icon: template.icon, columns, rows: [] });
    navigation.navigate('TableDetail', { tableId: newTable.id, isNew: true });
  }, [addTable, navigation, t]);

  const handleImportCSV = useCallback(async () => {
    if (importingCSV) return;
    setImportingCSV(true);
    try {
      const picked = await pickAndParseCSVFile();
      if (!picked) { setImportingCSV(false); return; } // user cancelled
      const built = buildTableFromCSVRows(picked.csvRows, (i) => `${t('tableColumnItem')} ${i + 1}`);
      if (!built || built.columns.length === 0) {
        Alert.alert(t('csvImportFailedTitle'), t('csvImportInvalidBody'));
        setImportingCSV(false);
        return;
      }
      Haptics.selectionAsync();
      const newTable = await addTable({
        title: picked.fileName || t('untitledTable'),
        icon: '\ud83d\udcc4',
        columns: built.columns,
        rows: built.rows,
      });
      setImportingCSV(false);
      navigation.navigate('TableDetail', { tableId: newTable.id, isNew: true });
    } catch (e) {
      setImportingCSV(false);
      Alert.alert(t('csvImportFailedTitle'), e?.message === 'Empty CSV file' ? t('csvImportInvalidBody') : t('csvImportGenericError'));
    }
  }, [addTable, navigation, t, importingCSV]);

  const openCreationMenu = useCallback(() => {
    Haptics.selectionAsync();
    setCreationSheetVisible(true);
  }, []);

  const creationActions = [
    { icon: 'grid-outline', label: t('newTableFromTemplate'), onPress: () => setTemplatePickerVisible(true) },
    { icon: 'document-attach-outline', label: t('importCSVTable'), onPress: handleImportCSV },
  ];

  const handleDeleteTable = useCallback((table) => {
    Alert.alert(t('deleteTableConfirmTitle'), t('deleteTableConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteTable(table.id) },
    ]);
  }, [deleteTable, t]);

  const cardActions = cardActionsTable
    ? [
        {
          icon: cardActionsTable.isPinned ? 'pin-outline' : 'pin',
          label: cardActionsTable.isPinned ? t('unpinNote') : t('pinNote'),
          onPress: () => toggleTablePinned(cardActionsTable.id),
        },
        { icon: 'trash', label: t('delete'), destructive: true, onPress: () => handleDeleteTable(cardActionsTable) },
      ]
    : [];

  const isEmpty = sortedTables.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('tablesTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{'\ud83d\udcca'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('tablesEmptyTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('tablesEmptySubtitle')}</Text>
          <TouchableOpacity onPress={openCreationMenu} style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('addFirstTable')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
          {sortedTables.map((table, index) => (
            <TableCard
              key={table.id}
              item={table}
              index={index}
              onPress={() => handleOpenTable(table)}
              onLongPress={() => { Haptics.selectionAsync(); setCardActionsTable(table); }}
              onTogglePin={() => toggleTablePinned(table.id)}
            />
          ))}
        </ScrollView>
      )}

      {!isEmpty && (
        <TouchableOpacity
          onPress={openCreationMenu}
          disabled={importingCSV}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
          activeOpacity={0.85}
        >
          {importingCSV ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="add" size={28} color={colors.onPrimary} />}
        </TouchableOpacity>
      )}

      <ActionSheet
        visible={creationSheetVisible}
        onClose={() => setCreationSheetVisible(false)}
        title={t('newTableActionTitle')}
        actions={creationActions}
      />

      <Modal visible={templatePickerVisible} transparent animationType="slide" onRequestClose={() => setTemplatePickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity onPress={() => setTemplatePickerVisible(false)} style={styles.modalClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('chooseTableTemplate')}</Text>
            {TABLE_TEMPLATES.map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                onPress={() => createFromTemplate(tpl)}
                style={[styles.templateRow, { borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}
              >
                <Text style={styles.templateIcon}>{tpl.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templateName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t(tpl.nameKey)}</Text>
                  <Text style={[styles.templateColumns, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {tpl.columns.map((c) => t(c.nameKey)).join(' \u00b7 ')}
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <ActionSheet
        visible={!!cardActionsTable}
        onClose={() => setCardActionsTable(null)}
        title={cardActionsTable?.title || t('untitledTable')}
        actions={cardActions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: -60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  addFirstBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalClose: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  templateIcon: { fontSize: 26 },
  templateName: { fontSize: 15, fontWeight: '700' },
  templateColumns: { fontSize: 12, marginTop: 2 },
});
