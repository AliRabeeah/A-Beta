import * as SecureStore from 'expo-secure-store';

// The TMDb key is the user's own personal API key -> SecureStore (Keychain /
// Keystore), same pattern used for the GitHub backup token in githubBackup.js.
const API_KEY_STORAGE_KEY = 'a_tmdb_api_key_v1';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export async function saveTmdbApiKey(key) {
  const trimmed = (key || '').trim();
  if (!trimmed) return;
  await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, trimmed);
}

export async function getTmdbApiKey() {
  try {
    return await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export async function clearTmdbApiKey() {
  try {
    await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * Pulls { mediaType, id } out of a TMDb page URL. Accepts movie or tv links,
 * with or without the trailing "-slug", with or without a scheme/www.
 *   https://www.themoviedb.org/movie/27205-inception  -> { mediaType: 'movie', id: '27205' }
 *   themoviedb.org/tv/1399                             -> { mediaType: 'tv',    id: '1399'  }
 * Returns null if the text doesn't look like a TMDb movie/tv URL.
 */
export function parseTmdbUrl(input) {
  if (!input) return null;
  const match = input.trim().match(/themoviedb\.org\/(movie|tv)\/(\d+)/i);
  if (!match) return null;
  return { mediaType: match[1].toLowerCase() === 'tv' ? 'tv' : 'movie', id: match[2] };
}

/**
 * Fetches poster/title/rating/year/overview for a TMDb movie or tv id.
 * `language` is a TMDb locale code such as 'ar' or 'en-US'.
 *
 * Throws Error with a `code` of 'INVALID_API_KEY' | 'NOT_FOUND' | 'NETWORK_ERROR'
 * so the UI can show a tailored message.
 */
export async function fetchTmdbItem({ mediaType, id, apiKey, language }) {
  const lang = language || 'en-US';
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${encodeURIComponent(
    apiKey
  )}&language=${encodeURIComponent(lang)}`;

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    const err = new Error('Network request failed');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (res.status === 401) {
    const err = new Error('Invalid TMDb API key');
    err.code = 'INVALID_API_KEY';
    throw err;
  }
  if (res.status === 404) {
    const err = new Error('Not found on TMDb');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`TMDb request failed (${res.status})`);
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  const data = await res.json();

  // Some locales return an empty overview for less-popular titles — fall
  // back to the English one instead of leaving the note blank.
  let overview = data.overview || '';
  if (!overview && !lang.startsWith('en')) {
    try {
      const fallbackRes = await fetch(
        `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${encodeURIComponent(apiKey)}&language=en-US`
      );
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        overview = fallbackData.overview || '';
      }
    } catch (e) {
      // Keep whatever we already had — this fallback is best-effort.
    }
  }

  const dateStr = mediaType === 'tv' ? data.first_air_date : data.release_date;
  const year = dateStr ? dateStr.slice(0, 4) : '';
  const voteAverage = typeof data.vote_average === 'number' ? data.vote_average : null;

  return {
    title: (mediaType === 'tv' ? data.name : data.title) || '',
    posterUrl: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : null,
    voteAverage,
    // TMDb rates out of 10 -> convert to the app's 5-star scale.
    rating: voteAverage ? Math.max(0, Math.min(5, Math.round(voteAverage / 2))) : 0,
    year,
    overview,
  };
}
