/**
 * Column type metadata + a handful of starter templates for new tables.
 * Templates only supply localized *starting* column names/tags (resolved
 * once at creation time via t()) — after that the table's own column
 * names are plain stored strings the person can rename freely.
 */

export const COLUMN_TYPES = [
  { id: 'text', icon: 'text-outline', labelKey: 'columnTypeText' },
  { id: 'number', icon: 'calculator-outline', labelKey: 'columnTypeNumber' },
  { id: 'currency', icon: 'cash-outline', labelKey: 'columnTypeCurrency' },
  { id: 'date', icon: 'calendar-outline', labelKey: 'columnTypeDate' },
  { id: 'checkbox', icon: 'checkbox-outline', labelKey: 'columnTypeCheckbox' },
  { id: 'tag', icon: 'pricetag-outline', labelKey: 'columnTypeTag' },
];

export function getColumnType(typeId) {
  return COLUMN_TYPES.find((c) => c.id === typeId) || COLUMN_TYPES[0];
}

// Cycled through by index when a new tag option is added without an
// explicit color, and used for templates' default tag colors below.
export const TAG_COLOR_PALETTE = ['#6C8EF5', '#8CE0A0', '#F5A26C', '#F58CC7', '#6CC7F5', '#C9A6F5', '#F5D76C'];

export const TABLE_TEMPLATES = [
  {
    id: 'blank',
    icon: '\ud83d\udccb',
    nameKey: 'tableTemplateBlank',
    columns: [{ nameKey: 'tableColumnItem', type: 'text' }],
  },
  {
    id: 'budget',
    icon: '\ud83d\udcb0',
    nameKey: 'tableTemplateBudget',
    columns: [
      { nameKey: 'tableColumnItem', type: 'text' },
      { nameKey: 'tableColumnAmount', type: 'currency' },
      { nameKey: 'tableColumnCategory', type: 'tag', tagOptionKeys: ['tagFixed', 'tagVariable', 'tagSavings'] },
      { nameKey: 'tableColumnPaid', type: 'checkbox' },
    ],
  },
  {
    id: 'comparison',
    icon: '\u2696\ufe0f',
    nameKey: 'tableTemplateComparison',
    columns: [
      { nameKey: 'tableColumnOption', type: 'text' },
      { nameKey: 'tableColumnPrice', type: 'currency' },
      { nameKey: 'tableColumnNotes', type: 'text' },
      { nameKey: 'tableColumnRating', type: 'number' },
    ],
  },
  {
    id: 'study',
    icon: '\ud83c\udf93',
    nameKey: 'tableTemplateStudy',
    columns: [
      { nameKey: 'tableColumnSubject', type: 'text' },
      { nameKey: 'tableColumnGrade', type: 'number' },
      { nameKey: 'tableColumnDate', type: 'date' },
      { nameKey: 'tableColumnStatus', type: 'tag', tagOptionKeys: ['tagDone', 'tagInProgress', 'tagLate'] },
    ],
  },
  {
    id: 'inventory',
    icon: '\ud83d\udce6',
    nameKey: 'tableTemplateInventory',
    columns: [
      { nameKey: 'tableColumnItem', type: 'text' },
      { nameKey: 'tableColumnQuantity', type: 'number' },
      { nameKey: 'tableColumnPrice', type: 'currency' },
      { nameKey: 'tableColumnAvailable', type: 'checkbox' },
    ],
  },
];
