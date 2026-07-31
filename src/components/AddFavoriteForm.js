import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { FAVORITE_TYPES } from '../context/FavoriteContext';

/**
 * Pure, reusable form UI for creating/editing a favorite. Holds no state or
 * persistence logic of its own — the parent screen owns the values and
 * passes them down, so this component can be reused anywhere (inline,
 * modal, bottom sheet) without change.
 */
export default function AddFavoriteForm({
  type,
  onChangeType,
  title,
  onChangeTitle,
  note,
  onChangeNote,
  rating,
  onChangeRating,
  imageUrl,
  onChangeImageUrl,
  onSave,
  onCancel,
  saveLabel,
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const [imageError, setImageError] = useState(false);
  const trimmedImageUrl = (imageUrl || '').trim();
  const showPreview = trimmedImageUrl.length > 0 && !imageError;

  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('favTypeLabel')}</Text>
      <View style={[styles.rowWrap, isRTL && { flexDirection: 'row-reverse' }]}>
        {FAVORITE_TYPES.map((typeInfo) => {
          const active = type === typeInfo.id;
          return (
            <TouchableOpacity
              key={typeInfo.id}
              onPress={() => onChangeType(typeInfo.id)}
              style={[
                styles.typeChip,
                {
                  backgroundColor: active ? withAlpha(typeInfo.color, 0.2) : colors.surface,
                  borderColor: active ? typeInfo.color : colors.border,
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>{typeInfo.icon}</Text>
              <Text style={{ color: active ? typeInfo.color : colors.text, fontWeight: '600', fontSize: 13 }}>
                {t(typeInfo.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('favTitleLabel')}</Text>
      <TextInput
        value={title}
        onChangeText={onChangeTitle}
        placeholder={t('favTitlePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign }]}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('favRatingLabel')}</Text>
      <View style={[styles.starsRow, isRTL && { flexDirection: 'row-reverse' }]}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => onChangeRating(rating === n ? 0 : n)} hitSlop={6}>
            <Ionicons
              name={n <= rating ? 'star' : 'star-outline'}
              size={28}
              color={n <= rating ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('favImageLabel')}</Text>
      <View style={[styles.imageRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <TextInput
          value={imageUrl}
          onChangeText={(v) => {
            setImageError(false);
            onChangeImageUrl(v);
          }}
          placeholder={t('favImagePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[
            styles.input,
            styles.imageInput,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign },
          ]}
        />
        {showPreview && (
          <Image
            source={{ uri: trimmedImageUrl }}
            style={[styles.imagePreview, { borderColor: colors.border }]}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
      </View>
      <Text style={[styles.helperText, { color: colors.textSecondary }]}>{t('favImageHelper')}</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('favNoteLabel')}</Text>
      <TextInput
        value={note}
        onChangeText={onChangeNote}
        placeholder={t('favNotePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        style={[
          styles.input,
          styles.textArea,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign },
        ]}
      />

      <TouchableOpacity onPress={onSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>{saveLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 8, letterSpacing: 0.5 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  imageInput: { flex: 1 },
  imagePreview: { width: 46, height: 46, borderRadius: 10, borderWidth: 1 },
  helperText: { fontSize: 11, marginTop: 6, lineHeight: 15 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  starsRow: { flexDirection: 'row', gap: 10 },
  saveBtn: { marginTop: 32, padding: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { fontWeight: '700', fontSize: 16 },
  cancelBtn: { marginTop: 12, padding: 14, alignItems: 'center' },
});
