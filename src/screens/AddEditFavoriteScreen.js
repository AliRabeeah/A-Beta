import React, { useMemo, useState } from 'react';
import { ScrollView, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useFavorites } from '../context/FavoriteContext';
import AddFavoriteForm from '../components/AddFavoriteForm';

export default function AddEditFavoriteScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { favorites, addFavorite, updateFavorite } = useFavorites();

  const favoriteId = route.params?.favoriteId;
  const existing = useMemo(() => favorites.find((f) => f.id === favoriteId), [favorites, favoriteId]);

  const [type, setType] = useState(existing?.type || 'movie');
  const [title, setTitle] = useState(existing?.title || '');
  const [note, setNote] = useState(existing?.note || '');
  const [rating, setRating] = useState(existing?.rating || 0);
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl || '');

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert(t('pleaseEnterFavoriteTitle'));

    if (existing) {
      await updateFavorite(existing.id, {
        type,
        title: title.trim(),
        note: note.trim(),
        rating,
        imageUrl: imageUrl.trim(),
      });
    } else {
      await addFavorite({ type, title, note, rating, imageUrl });
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <AddFavoriteForm
        type={type}
        onChangeType={setType}
        title={title}
        onChangeTitle={setTitle}
        note={note}
        onChangeNote={setNote}
        rating={rating}
        onChangeRating={setRating}
        imageUrl={imageUrl}
        onChangeImageUrl={setImageUrl}
        onSave={handleSave}
        onCancel={() => navigation.goBack()}
        saveLabel={existing ? t('saveChanges') : t('createFavorite')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
});
