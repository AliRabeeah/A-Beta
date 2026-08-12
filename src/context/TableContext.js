import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js
import { addToTrash, removeFromTrash } from './TrashContext';
import { emitUndo } from '../utils/undoBus';
import { makeRow, withNewColumnCells, withoutColumnCells } from '../utils/tableUtils';

const STORAGE_KEY = 'a_tables_v1';

const TableContext = createContext(null);

export function TableProvider({ children }) {
  const [tables, setTables] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setTables(JSON.parse(raw)); })
      .catch((e) => console.error('Error loading tables:', e))
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback(async (next) => {
    setTables(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addTable = useCallback(async (payload) => {
    const newTable = {
      id: Date.now().toString(),
      title: '',
      icon: '\ud83d\udcca',
      color: null,
      columns: [],
      rows: [],
      isPinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      lastEdited: new Date().toISOString(),
      ...payload,
    };
    await persist([...tables, newTable]);
    return newTable;
  }, [tables, persist]);

  const touch = (table) => ({ ...table, lastEdited: new Date().toISOString() });

  const updateTable = useCallback(async (id, updates) => {
    const next = tables.map((tb) => (tb.id === id ? touch({ ...tb, ...updates }) : tb));
    await persist(next);
  }, [tables, persist]);

  const toggleTablePinned = useCallback(async (id) => {
    const next = tables.map((tb) => (tb.id === id ? { ...tb, isPinned: !tb.isPinned } : tb));
    await persist(next);
  }, [tables, persist]);

  const restoreTable = useCallback(async (tableData) => {
    setTables((prev) => {
      if (prev.some((tb) => tb.id === tableData.id)) return prev;
      const next = [...prev, tableData];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const deleteTable = useCallback(async (id) => {
    const existing = tables.find((tb) => tb.id === id);
    if (!existing) return;
    await persist(tables.filter((tb) => tb.id !== id));
    const trashId = await addToTrash('table', existing);
    emitUndo({
      onUndo: async () => {
        await removeFromTrash(trashId);
        await restoreTable(existing);
      },
    });
  }, [tables, persist, restoreTable]);

  const replaceAllTables = useCallback(async (importedTables) => {
    await persist(importedTables || []);
  }, [persist]);

  // --- Columns -------------------------------------------------------

  const addColumn = useCallback(async (tableId, column) => {
    const next = tables.map((tb) => {
      if (tb.id !== tableId) return tb;
      return touch({ ...tb, columns: [...tb.columns, column], rows: withNewColumnCells(tb.rows, column) });
    });
    await persist(next);
  }, [tables, persist]);

  const updateColumn = useCallback(async (tableId, columnId, updates) => {
    const next = tables.map((tb) => {
      if (tb.id !== tableId) return tb;
      return touch({ ...tb, columns: tb.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c)) });
    });
    await persist(next);
  }, [tables, persist]);

  const removeColumn = useCallback(async (tableId, columnId) => {
    const next = tables.map((tb) => {
      if (tb.id !== tableId) return tb;
      return touch({
        ...tb,
        columns: tb.columns.filter((c) => c.id !== columnId),
        rows: withoutColumnCells(tb.rows, columnId),
      });
    });
    await persist(next);
  }, [tables, persist]);

  const reorderColumns = useCallback(async (tableId, orderedColumns) => {
    const next = tables.map((tb) => (tb.id === tableId ? touch({ ...tb, columns: orderedColumns }) : tb));
    await persist(next);
  }, [tables, persist]);

  // --- Rows ------------------------------------------------------------

  const addRow = useCallback(async (tableId) => {
    let newRowId = null;
    const next = tables.map((tb) => {
      if (tb.id !== tableId) return tb;
      const row = makeRow(tb.columns);
      newRowId = row.id;
      return touch({ ...tb, rows: [...tb.rows, row] });
    });
    await persist(next);
    return newRowId;
  }, [tables, persist]);

  const updateCell = useCallback(async (tableId, rowId, columnId, value) => {
    const next = tables.map((tb) => {
      if (tb.id !== tableId) return tb;
      return touch({
        ...tb,
        rows: tb.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: value } } : r)),
      });
    });
    await persist(next);
  }, [tables, persist]);

  const removeRow = useCallback(async (tableId, rowId) => {
    const next = tables.map((tb) => (tb.id === tableId ? touch({ ...tb, rows: tb.rows.filter((r) => r.id !== rowId) }) : tb));
    await persist(next);
  }, [tables, persist]);

  const reorderRows = useCallback(async (tableId, orderedRows) => {
    const next = tables.map((tb) => (tb.id === tableId ? touch({ ...tb, rows: orderedRows }) : tb));
    await persist(next);
  }, [tables, persist]);

  const value = useMemo(
    () => ({
      tables,
      loaded,
      addTable,
      updateTable,
      toggleTablePinned,
      deleteTable,
      restoreTable,
      replaceAllTables,
      addColumn,
      updateColumn,
      removeColumn,
      reorderColumns,
      addRow,
      updateCell,
      removeRow,
      reorderRows,
    }),
    [tables, loaded, addTable, updateTable, toggleTablePinned, deleteTable, restoreTable, replaceAllTables,
      addColumn, updateColumn, removeColumn, reorderColumns, addRow, updateCell, removeRow, reorderRows]
  );

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTables() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTables must be used within TableProvider');
  return ctx;
}
