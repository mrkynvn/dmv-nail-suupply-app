// Minimal async-fetch hook for Shopify-backed screens (M41S2B2).
//
// Owns the loading / error / data / retry lifecycle so each screen renders the
// shared AsyncStates without repeating effect boilerplate. Guards against state
// updates after unmount and re-runs when `deps` change or `reload()` is called.

import { useCallback, useEffect, useState } from 'react';

export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this forces the effect to re-run for a manual retry.
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `fetcher` is intentionally excluded; callers pass an inline closure and
    // control re-runs through `deps` and `reload()`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload };
}
