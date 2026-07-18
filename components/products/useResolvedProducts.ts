// Resolve a persisted, ordered list of Shopify product GIDs into live catalogue
// products in ONE request (M41S6E). Shared by the Favorites tab and the Home
// "Recently Viewed" rail, which both persist { gid, handle } identities.
//
// Behavior:
//   - preserves the requested order,
//   - prunes deleted/unpublished ids ONLY after a successful resolve (never on a
//     network failure — which can't tell "deleted" from "unreachable"),
//   - surfaces a distinct error state so callers can hide the rail safely.

import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveProductsByGids } from '../../src/shopify';
import type { CatalogueProduct } from '../../src/shopify';

export type ResolveState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; products: CatalogueProduct[] };

export function useResolvedProducts(
  gids: string[],
  onPrune?: (keepGids: string[]) => void,
): { state: ResolveState; reload: () => void } {
  const [state, setState] = useState<ResolveState>(
    gids.length === 0 ? { status: 'ready', products: [] } : { status: 'loading' },
  );
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Stable dependency key from the ordered gids.
  const key = gids.join(',');
  const onPruneRef = useRef(onPrune);
  onPruneRef.current = onPrune;

  useEffect(() => {
    let cancelled = false;
    if (gids.length === 0) {
      setState({ status: 'ready', products: [] });
      return;
    }
    setState({ status: 'loading' });
    resolveProductsByGids(gids)
      .then((resolved) => {
        if (cancelled) return;
        const products = resolved
          .map((r) => r.product)
          .filter((p): p is CatalogueProduct => p !== null);
        // Prune stale identities only when the resolve succeeded AND some ids
        // came back missing (product === null).
        const keepGids = resolved.filter((r) => r.product !== null).map((r) => r.gid);
        if (keepGids.length < gids.length) onPruneRef.current?.(keepGids);
        setState({ status: 'ready', products });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
    // `key` captures the ordered gids; `nonce` drives manual retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return { state, reload };
}
