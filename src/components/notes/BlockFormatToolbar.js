import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../i18n/LanguageContext';

// Cycles left -> center -> right -> left. Icons are a rough visual hint
// (Ionicons has no dedicated text-align glyphs) rather than a literal one.
const ALIGN_ICON = { left: 'arrow-back-outline', center: 'remove-outline', right: 'arrow-forward-outline' };

/**
 * Compact row of formatting toggles shown right under whichever text block
 * (paragraph / heading / quote) currently has focus. React Native's
 * TextInput can't mix bold/italic within a single run of text, so these
 * toggles apply to the whole focused block — still very usable for
 * "make this line a heading-style callout" or "highlight this paragraph".
 */
export default function BlockFormatToolbar({
  block,
  tint,
  panelBg,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleHighlight,
  onCycleAlign,
  onDelete,
}) {
  const { isRTL } = useLanguage();
  const align = block.align || (isRTL ? 'right' : 'left');

  const press = (fn) => () => {
    Haptics.selectionAsync();
    fn && fn();
  };

  return (
    <View style={[styles.wrap, { backgroundColor: panelBg }, isRTL && { flexDirection: 'row-reverse' }]}>
      <View style={[styles.group, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity
          onPress={press(onToggleBold)}
          style={[styles.btn, block.bold && { backgroundColor: tint + '33' }]}
        >
          <Ionicons name="text" size={13} color={tint} style={{ fontWeight: '900' }} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={press(onToggleItalic)}
          style={[styles.btn, block.italic && { backgroundColor: tint + '33' }]}
        >
          <Ionicons name="italic" size={14} color={tint} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={press(onToggleUnderline)}
          style={[styles.btn, block.underline && { backgroundColor: tint + '33' }]}
        >
          <Ionicons name="text" size={13} color={tint} style={{ textDecorationLine: 'underline' }} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={press(onToggleHighlight)}
          style={[styles.btn, block.highlight && { backgroundColor: tint + '33' }]}
        >
          <Ionicons name="color-fill-outline" size={14} color={tint} />
        </TouchableOpacity>
        <TouchableOpacity onPress={press(onCycleAlign)} style={styles.btn}>
          <Ionicons name={ALIGN_ICON[align]} size={14} color={tint} />
        </TouchableOpacity>
      </View>

      {!!onDelete && (
        <TouchableOpacity onPress={press(onDelete)} style={styles.btn} hitSlop={6}>
          <Ionicons name="trash-outline" size={14} color={tint} style={{ opacity: 0.75 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 10,
    marginTop: -4,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  btn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
