import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { parseTmdbUrl, fetchTmdbItem, getTmdbApiKey, saveTmdbApiKey } from '../utils/tmdb';

/**
 * Optional extra alongside the regular manual form: paste a themoviedb.org
 * movie/show link and this fetches poster, title, rating, year and plot,
 * then hands them to the parent via onImport() to fill the normal fields.
 * Entirely self-contained — its own collapsed/expanded state, its own TMDb
 * API key (saved once via SecureStore), independent of the favorite's data.
 */
export default function TmdbImportBox({ onImport }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';

  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState(null); // null = not loaded yet
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [editingApiKey, setEditingApiKey] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // last successful import, for a small confirmation

  useEffect(() => {
    (async () => {
      const stored = await getTmdbApiKey();
      setApiKey(stored || '');
      setEditingApiKey(!stored);
    })();
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    await saveTmdbApiKey(apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setEditingApiKey(false);
    setApiKeyInput('');
  };

  const handleFetch = async () => {
    setError(null);
    const parsed = parseTmdbUrl(url);
    if (!parsed) {
      setError(t('tmdbInvalidUrl'));
      return;
    }
    if (!apiKey) {
      setError(t('tmdbNeedApiKey'));
      return;
    }
    setLoading(true);
    try {
      const data = await fetchTmdbItem({
        mediaType: parsed.mediaType,
        id: parsed.id,
        apiKey,
        language: language === 'ar' ? 'ar' : 'en-US',
      });
      if (!data.title) {
        setError(t('tmdbNotFound'));
        return;
      }
      const mappedType = parsed.mediaType === 'tv' ? 'series' : 'movie';
      onImport({ ...data, type: mappedType });
      setPreview(data);
    } catch (e) {
      if (e.code === 'INVALID_API_KEY') {
        setError(t('tmdbInvalidKey'));
        // Let them fix it without hunting for a "change key" link.
        setEditingApiKey(true);
      } else if (e.code === 'NOT_FOUND') {
        setError(t('tmdbNotFound'));
      } else {
        setError(t('tmdbNetworkError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}
        activeOpacity={0.7}
      >
        <View style={[styles.headerLeft, isRTL && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="film-outline" size={16} color={colors.primary} />
          <Text style={[styles.headerText, { color: colors.text }]}>{t('tmdbImportTitle')}</Text>
          <View style={[styles.optionalPill, { backgroundColor: withAlpha(colors.textSecondary, 0.15) }]}>
            <Text style={[styles.optionalPillText, { color: colors.textSecondary }]}>{t('optional')}</Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {editingApiKey ? (
            <>
              <Text style={[styles.hint, { color: colors.textSecondary, textAlign }]}>{t('tmdbApiKeyHint')}</Text>
              <View style={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}>
                <TextInput
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  placeholder={t('tmdbApiKeyPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  style={[
                    styles.input,
                    { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlign },
                  ]}
                />
                <TouchableOpacity
                  onPress={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  style={[styles.smallBtn, { backgroundColor: colors.primary, opacity: apiKeyInput.trim() ? 1 : 0.5 }]}
                >
                  <Text style={[styles.smallBtnText, { color: colors.onPrimary }]}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder={t('tmdbUrlPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[
                    styles.input,
                    { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlign },
                  ]}
                />
                <TouchableOpacity
                  onPress={handleFetch}
                  disabled={loading || !url.trim()}
                  style={[styles.smallBtn, { backgroundColor: colors.primary, opacity: loading || !url.trim() ? 0.5 : 1 }]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={[styles.smallBtnText, { color: colors.onPrimary }]}>{t('tmdbFetchBtn')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setEditingApiKey(true)} hitSlop={6}>
                <Text style={[styles.changeKeyLink, { color: colors.textSecondary }]}>{t('tmdbChangeApiKey')}</Text>
              </TouchableOpacity>
            </>
          )}

          {!!error && <Text style={[styles.error, { color: '#FF453A', textAlign }]}>{error}</Text>}

          {!!preview && !error && (
            <View style={[styles.previewRow, isRTL && { flexDirection: 'row-reverse' }]}>
              {!!preview.posterUrl && (
                <Image source={{ uri: preview.posterUrl }} style={styles.previewPoster} resizeMode="cover" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewTitle, { color: colors.text, textAlign }]} numberOfLines={2}>
                  {preview.title} {preview.year ? `(${preview.year})` : ''}
                </Text>
                <Text style={[styles.previewApplied, { color: colors.primary, textAlign }]}>{t('tmdbApplied')}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 14, marginTop: 18, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 13, fontWeight: '700' },
  optionalPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  optionalPillText: { fontSize: 10, fontWeight: '700' },
  body: { paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  hint: { fontSize: 11.5, lineHeight: 16 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { fontWeight: '700', fontSize: 13 },
  changeKeyLink: { fontSize: 11, fontWeight: '600', textDecorationLine: 'underline', marginTop: 2 },
  error: { fontSize: 12, fontWeight: '600' },
  previewRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  previewPoster: { width: 40, height: 60, borderRadius: 6 },
  previewTitle: { fontSize: 13, fontWeight: '700' },
  previewApplied: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
