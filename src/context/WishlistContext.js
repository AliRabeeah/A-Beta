import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleWishlistReminder, cancelWishlistReminder } from '../utils/notifications';
import { addToTrash, removeFromTrash } from './TrashContext';
import { emitUndo } from '../utils/undoBus';
import { DEFAULT_WISHLIST_TAGS } from '../constants/wishlistOptions';

const ITEMS_STORAGE_KEY = 'a_wishlist_v1';
const TAGS_STORAGE_KEY = 'a_wishlist_tags_v1';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [rawItems, rawTags] = await Promise.all([
          AsyncStorage.getItem(ITEMS_STORAGE_KEY),
          AsyncStorage.getItem(TAGS_STORAGE_KEY),
        ]);
        if (rawItems) setItems(JSON.parse(rawItems));
        if (rawTags) setCustomTags(JSON.parse(rawTags));
      } catch (e) {
        console.error('Error loading wishlist:', e);
      }
      setLoaded(true);
    })();
  }, []);

  const persistItems = useCallback(async (next) => {
    setItems(next);
    await AsyncStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const persistTags = useCallback(async (next) => {
    setCustomTags(next);
    await AsyncStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  // Built-in presets + whatever the user has added, merged into one list
  // every screen can render/filter against without caring which is which.
  const tags = useMemo(() => [...DEFAULT_WISHLIST_TAGS, ...customTags], [customTags]);

  /** Adds a new custom tag (emoji + label). Returns the created tag. */
  const addCustomTag = useCallback(
    async (emoji, label) => {
      const trimmed = (label || '').trim();
      if (!trimmed) return null;
      const newTag = { id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, emoji: emoji || '🏷️', label: trimmed };
      await persistTags([...customTags, newTag]);
      return newTag;
    },
    [customTags, persistTags]
  );

  /** Removes a user-created tag (built-in presets can't be removed) and un-tags any item that had it. */
  const deleteCustomTag = useCallback(
    async (tagId) => {
      await persistTags(customTags.filter((tg) => tg.id !== tagId));
      const next = items.map((it) => (it.tagIds?.includes(tagId) ? { ...it, tagIds: it.tagIds.filter((id) => id !== tagId) } : it));
      await persistItems(next);
    },
    [customTags, items, persistTags, persistItems]
  );

  /** Creates a new wishlist item. */
  const addItem = useCallback(
    async (itemData) => {
      let reminderId = null;
      if (itemData.reminderAt) {
        reminderId = await scheduleWishlistReminder(itemData);
      }

      const newItem = {
        id: `wl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: (itemData.title || '').trim(),
        description: (itemData.description || '').trim(),
        imageUrl: itemData.imageUrl || null,
        tagIds: itemData.tagIds || [],
        reminderAt: itemData.reminderAt || null,
        reminderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await persistItems([newItem, ...items]);
      return newItem;
    },
    [items, persistItems]
  );

  /** Updates an existing wishlist item. */
  const updateItem = useCallback(
    async (id, updates) => {
      const existing = items.find((it) => it.id === id);
      if (!existing) return;

      let reminderId = existing.reminderId;
      if (updates.reminderAt !== undefined && updates.reminderAt !== existing.reminderAt) {
        if (existing.reminderId) await cancelWishlistReminder(existing.reminderId);
        reminderId = updates.reminderAt ? await scheduleWishlistReminder({ ...existing, ...updates }) : null;
      }

      const next = items.map((it) =>
        it.id === id ? { ...it, ...updates, reminderId, updatedAt: new Date().toISOString() } : it
      );
      await persistItems(next);
    },
    [items, persistItems]
  );

  /** Re-adds a previously trashed item (used by Undo and by the Trash screen). */
  const restoreItem = useCallback(async (itemData) => {
    setItems((prev) => {
      if (prev.some((it) => it.id === itemData.id)) return prev;
      const next = [itemData, ...prev];
      AsyncStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /** Soft-delete: moves the item to Trash (recoverable for 30 days) instead of erasing it. */
  const deleteItem = useCallback(
    async (id) => {
      const existing = items.find((it) => it.id === id);
      if (!existing) return;
      if (existing.reminderId) await cancelWishlistReminder(existing.reminderId);
      await persistItems(items.filter((it) => it.id !== id));
      const trashId = await addToTrash('wishlist', existing);
      emitUndo({
        onUndo: async () => {
          await removeFromTrash(trashId);
          await restoreItem(existing);
        },
      });
    },
    [items, persistItems, restoreItem]
  );

  /** Replaces all local wishlist data with an imported/restored set (cloud sync / backup restore). */
  const replaceAllWishlist = useCallback(
    async (importedItems, importedTags) => {
      for (const it of items) {
        if (it.reminderId) await cancelWishlistReminder(it.reminderId);
      }
      const rehydrated = [];
      for (const it of importedItems || []) {
        let reminderId = null;
        if (it.reminderAt) reminderId = await scheduleWishlistReminder(it);
        rehydrated.push({ ...it, reminderId });
      }
      await persistItems(rehydrated);
      if (importedTags) await persistTags(importedTags);
    },
    [items, persistItems, persistTags]
  );

  const value = useMemo(
    () => ({
      items,
      tags,
      customTags,
      loaded,
      addItem,
      updateItem,
      deleteItem,
      restoreItem,
      replaceAllWishlist,
      addCustomTag,
      deleteCustomTag,
    }),
    [items, tags, customTags, loaded, addItem, updateItem, deleteItem, restoreItem, replaceAllWishlist, addCustomTag, deleteCustomTag]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
