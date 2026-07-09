// Cursor-paged fetch hook for Shopify-backed list screens (M41S2C1).
//
// Extends the single-shot useAsyncData model with cursor pagination: it loads
// the first page, appends subsequent pages via a caller-supplied cursor, and
// keeps first-page vs next-page loading/error state separate so a page-load
// failure never discards already-loaded items. Deliberately generic (no Shopify
// imports) — the screen adapts its fetch into the small PagedFetchResult shape.

import { useCallback, useEffect, useRef, useState } from 'react';

// One page as the hook needs it: the items, whether more remain, the cursor to
// pass for the next page, and optional list metadata (e.g. a collection title)
// captured from the first successful page.
export interface PagedFetchResult<T, M> {
  items: T[];
  hasNextPage: boolean;
  endCursor: string | null;
  meta: M | null;
}

// Fetch one page. `cursor` is null for the first page, otherwise the previous
// page's endCursor.
export type PagedFetcher<T, M> = (cursor: string | null) => Promise<PagedFetchResult<T, M>>;

export interface PagedData<T, M> {
  items: T[];
  meta: M | null;
  loading: boolean; // first-page load in progress
  error: string | null; // first-page load failed (no items shown)
  loadingMore: boolean; // next-page load in progress
  pageError: string | null; // next-page load failed (existing items preserved)
  hasMore: boolean;
  reload: () => void; // retry from the first page
  loadMore: () => void; // fetch the next page if one exists (safe to over-call)
  retryLoadMore: () => void; // clear a page error and re-request the same page
}

export function usePagedData<T, M = unknown>(
  fetcher: PagedFetcher<T, M>,
  deps: unknown[]
): PagedData<T, M> {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<M | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Bumped by reload() to re-run the first-page effect.
  const [nonce, setNonce] = useState(0);

  // Refs mirror the values loadMore reads so it stays a stable callback that
  // never closes over stale state:
  //   cursorRef      — cursor for the next page (unchanged on error → retry
  //                    re-requests the same page)
  //   hasMoreRef     — gates load-more once the list is exhausted
  //   loadingMoreRef — synchronous in-flight guard so FlatList's repeated
  //                    onEndReached firing collapses into one request
  //   pageErrorRef   — blocks auto load-more after a failure until the user
  //                    explicitly retries (prevents onEndReached retry storms)
  //   fetcherRef     — always the latest fetcher closure
  //   genRef         — generation token; a settled request from an old
  //                    generation is ignored, so stale/aborted responses can't
  //                    overwrite current state
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const pageErrorRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const genRef = useRef(0);

  // First-page load / reload. Resets all paging state, then fetches page one.
  useEffect(() => {
    const gen = ++genRef.current;
    loadingMoreRef.current = false;
    pageErrorRef.current = false;
    cursorRef.current = null;
    hasMoreRef.current = false;

    setLoading(true);
    setError(null);
    setPageError(null);
    setLoadingMore(false);
    setItems([]);
    setHasMore(false);

    fetcherRef
      .current(null)
      .then((page) => {
        if (gen !== genRef.current) return;
        setItems(page.items);
        setMeta(page.meta);
        cursorRef.current = page.endCursor;
        hasMoreRef.current = page.hasNextPage;
        setHasMore(page.hasNextPage);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (gen !== genRef.current) return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setLoading(false);
      });

    return () => {
      // Invalidate any in-flight first-page request on deps change / unmount.
      genRef.current++;
    };
    // `fetcher` is read through fetcherRef; re-runs are driven by deps/reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const loadMore = useCallback(() => {
    // Guards, in order: a page fetch is already running; a prior page failed and
    // is awaiting an explicit retry; the list is exhausted; or no cursor yet
    // (first page not settled). loadingMoreRef is set synchronously so bursts of
    // onEndReached in one tick issue a single request.
    if (loadingMoreRef.current) return;
    if (pageErrorRef.current) return;
    if (!hasMoreRef.current) return;
    if (!cursorRef.current) return;

    loadingMoreRef.current = true;
    const gen = genRef.current;
    setLoadingMore(true);
    setPageError(null);

    fetcherRef
      .current(cursorRef.current)
      .then((page) => {
        if (gen !== genRef.current) {
          loadingMoreRef.current = false;
          return;
        }
        // Append — already-loaded items are kept intact.
        setItems((prev) => [...prev, ...page.items]);
        cursorRef.current = page.endCursor;
        hasMoreRef.current = page.hasNextPage;
        setHasMore(page.hasNextPage);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      })
      .catch((err: unknown) => {
        loadingMoreRef.current = false;
        if (gen !== genRef.current) return;
        // Keep loaded items; surface a footer error. Cursor is left unchanged so
        // retry re-requests the same page.
        pageErrorRef.current = true;
        setPageError(err instanceof Error ? err.message : 'Couldn’t load more.');
        setLoadingMore(false);
      });
  }, []);

  const retryLoadMore = useCallback(() => {
    pageErrorRef.current = false;
    setPageError(null);
    loadMore();
  }, [loadMore]);

  return {
    items,
    meta,
    loading,
    error,
    loadingMore,
    pageError,
    hasMore,
    reload,
    loadMore,
    retryLoadMore,
  };
}
