import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Versioned Shopify recently-viewed store (M41S6E / Recently Viewed v2).
//
// Persists Shopify product identities — { gid, handle, viewedAt } — recorded only
// after a Shopify product detail successfully resolves. The legacy mock key
// (list of p-xxx ids) is discarded, not migrated, and removed on hydration.
// Newest first, deduped by GID, capped at 10.

const STORAGE_KEY = '@dmv_nail_supply/recently_viewed_v2';
const LEGACY_KEY = '@dmv_nail_supply/recently_viewed_product_ids';
const STORE_VERSION = 2;
const MAX_RECENT = 10;

export interface RecentItem {
  gid: string;
  handle: string;
  viewedAt: number;
}

export interface RecentRef {
  gid: string;
  handle: string;
}

interface RecentEnvelope {
  version: number;
  items: RecentItem[];
}

type RecentlyViewedContextValue = {
  recent: RecentItem[];
  recordRecentlyViewed: (ref: RecentRef) => void;
  clearRecentlyViewed: () => void;
  // Drop recents whose GID is not in `keepGids`. Call ONLY after a successful
  // bulk resolve identified deleted/unpublished products — never on a network
  // failure.
  pruneRecentlyViewed: (keepGids: string[]) => void;
  hydrated: boolean;
};

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);

function parseEnvelope(raw: string | null): RecentItem[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as RecentEnvelope).version !== STORE_VERSION ||
      !Array.isArray((parsed as RecentEnvelope).items)
    ) {
      return [];
    }
    const seen = new Set<string>();
    const items: RecentItem[] = [];
    for (const entry of (parsed as RecentEnvelope).items) {
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
          viewedAt: typeof entry.viewedAt === 'number' && Number.isFinite(entry.viewedAt) ? entry.viewedAt : 0,
        });
      }
      if (items.length >= MAX_RECENT) break;
    }
    return items;
  } catch {
    return [];
  }
}

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setRecent(parseEnvelope(raw));
      } catch {
        // Storage read error — start empty.
      } finally {
        setHydrated(true);
      }
      AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
    })();
  }, []);

  // Serialized write queue.
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!hydrated) return;
    const envelope: RecentEnvelope = { version: STORE_VERSION, items: recent };
    const payload = JSON.stringify(envelope);
    writeChainRef.current = writeChainRef.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, payload))
      .catch(() => {});
  }, [hydrated, recent]);

  // Move-to-front, deduped by GID, capped at MAX_RECENT.
  const recordRecentlyViewed = useCallback((ref: RecentRef) => {
    if (!ref.gid) return;
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.gid !== ref.gid);
      return [{ gid: ref.gid, handle: ref.handle, viewedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => setRecent([]), []);

  const pruneRecentlyViewed = useCallback((keepGids: string[]) => {
    const keep = new Set(keepGids);
    setRecent((prev) => {
      if (prev.every((r) => keep.has(r.gid))) return prev; // no change → no write
      return prev.filter((r) => keep.has(r.gid));
    });
  }, []);

  return (
    <RecentlyViewedContext.Provider
      value={{ recent, recordRecentlyViewed, clearRecentlyViewed, pruneRecentlyViewed, hydrated }}
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
