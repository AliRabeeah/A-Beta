import { TAG_COLOR_PALETTE } from '../constants/tableTemplates';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

let idSeed = 0;
function makeId(prefix) {
  idSeed += 1;
  return `${prefix}_${Date.now()}_${idSeed}`;
}

export function makeColumnId() { return makeId('col'); }
export function makeRowId() { return makeId('row'); }
export function makeTagOptionId() { return makeId('tag'); }

export function emptyCellValue(type) {
  switch (type) {
    case 'checkbox': return false;
    case 'number':
    case 'currency':
    case 'rating': return null; // null = empty, distinct from 0
    case 'date':
    case 'tag': return null;
    default: return '';
  }
}

export function makeColumn(name, type, tagOptions = []) {
  return {
    id: makeColumnId(),
    name,
    type,
    tagOptions: type === 'tag' ? tagOptions : undefined,
  };
}

export function makeRow(columns) {
  const cells = {};
  for (const col of columns) cells[col.id] = emptyCellValue(col.type);
  return { id: makeRowId(), cells };
}

/** Adds a matching empty cell to every existing row when a new column is inserted. */
export function withNewColumnCells(rows, column) {
  return rows.map((r) => ({ ...r, cells: { ...r.cells, [column.id]: emptyCellValue(column.type) } }));
}

/** Strips a removed column's cell out of every row. */
export function withoutColumnCells(rows, columnId) {
  return rows.map((r) => {
    const cells = { ...r.cells };
    delete cells[columnId];
    return { ...r, cells };
  });
}

export function nextTagColor(existingOptions = []) {
  return TAG_COLOR_PALETTE[existingOptions.length % TAG_COLOR_PALETTE.length];
}

/** Sum / average / count of a numeric-ish (number or currency) column, ignoring empty cells. */
export function columnAggregate(table, columnId) {
  const values = (table.rows || [])
    .map((r) => r.cells[columnId])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map(Number)
    .filter((v) => !Number.isNaN(v));
  const sum = values.reduce((a, b) => a + b, 0);
  return { sum, avg: values.length ? sum / values.length : 0, count: values.length };
}

export function formatCellDisplay(value, column, locale) {
  if (value === null || value === undefined || value === '') return '';
  switch (column.type) {
    case 'currency': {
      const n = Number(value);
      return Number.isNaN(n) ? '' : n.toLocaleString(locale, { maximumFractionDigits: 2 });
    }
    case 'number':
      return String(value);
    case 'date': {
      const d = new Date(value + 'T00:00:00');
      return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    case 'tag': {
      const opt = (column.tagOptions || []).find((o) => o.id === value);
      return opt ? opt.label : '';
    }
    case 'rating':
      return String(value);
    default:
      return String(value);
  }
}

/** True if any cell in the row contains the query (case-insensitive, all column types). */
export function rowMatchesSearch(row, columns, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return columns.some((column) => {
    const raw = row.cells[column.id];
    if (raw === null || raw === undefined || raw === '') return false;
    if (column.type === 'checkbox') return false; // nothing textual to match
    const display = column.type === 'tag'
      ? (column.tagOptions || []).find((o) => o.id === raw)?.label || ''
      : String(raw);
    return display.toLowerCase().includes(needle);
  });
}

/**
 * Splits already-sorted/filtered rows into { type: 'group' | 'row' } display
 * items for a tag column, so a single flat list can render section headers
 * inline. Rows with no value for the tag column land in a shared "no value" group.
 */
export function groupRowsByTag(rows, groupColumn, noneLabel) {
  if (!groupColumn) return rows.map((row) => ({ type: 'row', key: `row-${row.id}`, row }));
  const options = groupColumn.tagOptions || [];
  const buckets = new Map();
  const order = [];
  for (const row of rows) {
    const optionId = row.cells[groupColumn.id];
    const key = optionId || '__none__';
    if (!buckets.has(key)) { buckets.set(key, []); order.push(key); }
    buckets.get(key).push(row);
  }
  const items = [];
  for (const key of order) {
    const opt = options.find((o) => o.id === key);
    items.push({ type: 'group', key: `group-${key}`, label: opt ? opt.label : noneLabel, color: opt ? opt.color : null, count: buckets.get(key).length });
    for (const row of buckets.get(key)) items.push({ type: 'row', key: `row-${row.id}`, row });
  }
  return items;
}

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Plain-text CSV of the whole table (header + every row), for sharing/export. */
export function exportTableAsCSV(table, locale) {
  const cols = table.columns || [];
  const header = cols.map((c) => csvEscape(c.name)).join(',');
  const lines = (table.rows || []).map((row) =>
    cols.map((c) => csvEscape(formatCellDisplay(row.cells[c.id], c, locale) || (c.type === 'checkbox' ? (row.cells[c.id] ? '\u2713' : '') : ''))).join(',')
  );
  return [header, ...lines].join('\n');
}

export function sortRows(rows, column, direction = 'asc') {
  if (!column) return rows;
  const mult = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a.cells[column.id];
    const bv = b.cells[column.id];
    const aEmpty = av === null || av === undefined || av === '';
    const bEmpty = bv === null || bv === undefined || bv === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1; // empty cells sink to the bottom regardless of direction
    if (bEmpty) return -1;

    if (column.type === 'number' || column.type === 'currency' || column.type === 'rating') return (Number(av) - Number(bv)) * mult;
    if (column.type === 'checkbox') return ((av === bv) ? 0 : av ? -1 : 1) * mult;
    if (column.type === 'date') return (new Date(av) - new Date(bv)) * mult;
    return String(av).localeCompare(String(bv)) * mult;
  });
}

/** Writes the table out as a .csv file in cache and opens the native share sheet. */
export async function shareTableCSV(table, locale) {
  const csv = exportTableAsCSV(table, locale);
  const safeName = (table.title || 'table').replace(/[^a-z0-9\u0600-\u06FF]+/gi, '_').slice(0, 40) || 'table';
  const path = `${FileSystem.cacheDirectory}${safeName}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: table.title || 'Export Table' });
  }
  return path;
}
