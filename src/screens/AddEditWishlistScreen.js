import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import { ensurePermission } from '../utils/notifications';
import WishlistTagPickerRow from '../components/WishlistTagPickerRow';
import NoteReminderModal from '../components/notes/NoteReminderModal';

export default function AddEditWishlistScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { items, tags, addItem, updateItem, addCustomTag } = useWishlist();

  const wishlistId = route.params?.wishlistId;
  const existing = useMemo(() => items.find((it) => it.id === wishlistId), [items, wishlistId]);

  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl || '');
  const [tagIds, setTagIds] = useState(existing?.tagIds || []);
  const [reminderAt, setReminderAt] = useState(existing?.reminderAt || null);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const textAlign = isRTL ? 'right' : 'left';
  const trimmedImageUrl = imageUrl.trim();

  const handleToggleTag = (tagId) => {
    setTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const handleSaveReminder = async (date) => {
    if (date.getTime() <= Date.now()) {
      Alert.alert(t('reminderButtonLabel'), t('reminderPast'));
      return;
    }
    const granted = await ensurePermission();
    if (!granted) {
      Alert.alert(t('reminderButtonLabel'), t('reminderPermissionDenied'));
      return;
    }
    setReminderAt(date.toISOString());
    setReminderModalVisible(false);
  };

  const handleRemoveReminder = () => {
    setReminderAt(null);
    setReminderModalVisible(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert(t('wishlistPleaseEnterTitle'));

    const payload = {
      title: title.trim(),
      description: description.trim(),
      imageUrl: trimmedImageUrl || null,
      tagIds,
      reminderAt,
    };

    if (existing) {
      await updateItem(existing.id, payload);
    } else {
      await addItem(payload);
    }
    navigation.goBack();
  };

  const reminderLabel = reminderAt
    ? new Date(reminderAt).toLocaleString(isRTL ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('wishlistThumbnailLabel')}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary, textAlign }]}>{t('wishlistThumbnailHint')}</Text>
      <View style={[styles.imageRow, isRTL && { flexDirection: 'row-reverse' }]}>
        {!!trimmedImageUrl && !imageLoadFailed && (
          <Image
            source={{ uri: trimmedImageUrl }}
            style={styles.thumbPreview}
            resizeMode="cover"
            onError={() => setImageLoadFailed(true)}
            onLoad={() => setImageLoadFailed(false)}
          />
        )}
        <TextInput
          value={imageUrl}
          onChangeText={(v) => {
            setImageUrl(v);
            setImageLoadFailed(false);
          }}
          placeholder={t('wishlistImageUrlPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[
            styles.input,
            { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign },
          ]}
        />
        {!!imageUrl && (
          <TouchableOpacity onPress={() => setImageUrl('')} hitSlop={8} style={styles.clearImageBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {imageLoadFailed && !!trimmedImageUrl && (
        <Text style={[styles.error, { color: colors.danger, textAlign }]}>{t('wishlistImageUrlInvalid')}</Text>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('wishlistTitleLabel')}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('wishlistTitlePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign }]}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('wishlistDescriptionLabel')}</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t('wishlistDescriptionPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
        style={[
          styles.input,
          styles.textArea,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign },
        ]}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('wishlistTagsLabel')}</Text>
      <WishlistTagPickerRow tags={tags} selectedIds={tagIds} onToggle={handleToggleTag} onCreateTag={addCustomTag} />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('reminderButtonLabel')}</Text>
      <TouchableOpacity
        onPress={() => setReminderModalVisible(true)}
        style={[styles.reminderBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Ionicons name={reminderAt ? 'notifications' : 'notifications-outline'} size={18} color={reminderAt ? colors.primary : colors.textSecondary} />
        <Text style={{ color: reminderAt ? colors.primary : colors.textSecondary, fontWeight: '600', fontSize: 13.5 }}>
          {reminderLabel || t('reminderButtonLabel')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>
          {existing ? t('saveChanges') : t('wishlistCreate')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('cancel')}</Text>
      </TouchableOpacity>

      <NoteReminderModal
        visible={reminderModalVisible}
        initialDate={reminderAt ? new Date(reminderAt) : null}
        hasReminder={!!reminderAt}
        onClose={() => setReminderModalVisible(false)}
        onSave={handleSaveReminder}
        onRemove={handleRemoveReminder}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 8, letterSpacing: 0.5 },
  hint: { fontSize: 11.5, lineHeight: 16, marginBottom: 10, marginTop: -4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbPreview: { width: 46, height: 46, borderRadius: 10 },
  clearImageBtn: { padding: 4 },
  error: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  saveBtn: { marginTop: 32, padding: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { fontWeight: '700', fontSize: 16 },
  cancelBtn: { marginTop: 12, padding: 14, alignItems: 'center' },
});
