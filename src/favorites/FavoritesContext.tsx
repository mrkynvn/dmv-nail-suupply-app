import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Versioned Shopify favorites store (M41S6E / Favorites v2).
//
// Favorites persist Shopify product identities — { gid, handle, addedAt } — not
// mock p-xxx ids. The legacy mock key is discarded (never migrated) and removed
// on hydration. Identity is the product GID; the handle is stored so navigation
// can use a reasonable value immediately, though screens prefer the fresh handle
// returned by a live resolve.

const STORAGE_KEY = '@dmv_nail_supply/favorites_v2';
// Legacy mock favorites key (list of p-xxx ids). Discarded, not migrated.
const LEGACY_KEY = '@dmv_nail_supply/favorite_product_ids';
const STORE_VERSION = 2;

export interface FavoriteItem {
  gid: string;
  handle: string;
  addedAt: number;
}

// The minimal identity a caller supplies to toggle a favorite.
export interface FavoriteRef {
  gid: string;
  handle: string;
}

interface FavoritesEnvelope {
  version: number;
  items: FavoriteItem[];
}

type FavoritesContextValue = {
  favorites: FavoriteItem[];
  isFavorite: (gid: string) => boolean;
  toggleFavorite: (ref: FavoriteRef) => void;
  favoriteCount: number;
  clearFavorites: () => void;
  // Drop favorites whose GID is not in `keepGids`. Call ONLY after a successful
  // bulk resolve identified deleted/unpublished products — never on a network
  // failure (which can't distinguish "deleted" from "unreachable").
  pruneFavorites: (keepGids: string[]) => void;
  hydrated: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

// Safely parse a persisted envelope. Anything malformed (bad JSON, wrong version,
// non-array items, missing string fields) yields an empty list rather than
// throwing. Non-numeric addedAt is coerced to 0 so ordering never breaks.
function parseEnvelope(raw: string | null): FavoriteItem[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as FavoritesEnvelope).version !== STORE_VERSION ||
      !Array.isArray((parsed as FavoritesEnvelope).items)
    ) {
      return [];
    }
    const seen = new Set<string>();
    const items: FavoriteItem[] = [];
    for (const entry of (parsed as FavoritesEnvelope).items) {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.gid === 'string' &&
        entry.gid.length > 0 &&
        typeof entry.handle === 'string' &&
        !seen.has(entry.gid)
      ) {
        seen.add(entry.gid);
        items.push({
          gid: entry.gid,
          handle: entry.handle,
          addedAt: typeof entry.addedAt === 'number' && Number.isFinite(entry.addedAt) ? entry.addedAt : 0,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted favorites on mount, and drop the legacy mock key.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setFavorites(parseEnvelope(raw));
      } catch {
        // Storage read error — start empty.
      } finally {
        setHydrated(true);
      }
      // Best-effort discard of the legacy mock favorites (not migrated).
      AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
    })();
  }, []);

  // Serialized write queue: chain each setItem so rapid toggles never let a stale
  // promise overwrite a newer write.
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!hydrated) return;
    const envelope: FavoritesEnvelope = { version: STORE_VERSION, items: favorites };
    const payload = JSON.stringify(envelope);
    writeChainRef.current = writeChainRef.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, payload))
      .catch(() => {});
  }, [hydrated, favorites]);

  const isFavorite = useCallback(
    (gid: string) => favorites.some((f) => f.gid === gid),
    [favorites],
  );

  // Optimistic local toggle, keyed/deduped by GID. New favorites go to the front.
  const toggleFavorite = useCallback((ref: FavoriteRef) => {
    if (!ref.gid) return;
    setFavorites((prev) => {
      if (prev.some((f) => f.gid === ref.gid)) {
        return prev.filter((f) => f.gid !== ref.gid);
      }
      return [{ gid: ref.gid, handle: ref.handle, addedAt: Date.now() }, ...prev];
    });
  }, []);

  const clearFavorites = useCallback(() => setFavorites([]), []);

  const pruneFavorites = useCallback((keepGids: string[]) => {
    const keep = new Set(keepGids);
    setFavorites((prev) => {
      if (prev.every((f) => keep.has(f.gid))) return prev; // no change → no write
      return prev.filter((f) => keep.has(f.gid));
    });
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        favoriteCount: favorites.length,
        clearFavorites,
        pruneFavorites,
        hydrated,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
