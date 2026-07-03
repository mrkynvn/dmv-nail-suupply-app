import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@dmv_nail_supply/recently_viewed_product_ids';
const MAX_RECENT = 10;

type RecentlyViewedContextValue = {
  recentProductIds: string[];
  recordRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;
  hydrated: boolean;
};

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted IDs on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const validIds = parsed.filter(
              (id): id is string => typeof id === 'string' && id.length > 0,
            );
            setRecentProductIds(validIds);
          }
        }
      } catch {
        // Malformed JSON, storage read error — fall back to empty list.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Serial write queue: chain each setItem onto the previous so that rapid
  // state changes never allow a stale promise to overwrite a newer write.
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = recentProductIds;
    writeChainRef.current = writeChainRef.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)))
      .catch(() => {});
  }, [hydrated, recentProductIds]);

  const recordRecentlyViewed = useCallback((productId: string) => {
    if (!productId) return;
    setRecentProductIds((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      return [productId, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentProductIds([]);
  }, []);

  return (
    <RecentlyViewedContext.Provider
      value={{
        recentProductIds,
        recordRecentlyViewed,
        clearRecentlyViewed,
        hydrated,
      }}
    >
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed(): RecentlyViewedContextValue {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error('useRecentlyViewed must be used inside RecentlyViewedProvider');
  return ctx;
}
