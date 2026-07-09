// Category-grid collection filtering (M41S2B2).
//
// Owner decision M41S2B2: the main category grid prioritizes product-type
// collections and does NOT intentionally include brand collections. The Shopify
// Storefront API exposes no product-type flag on a Collection, so — per the
// approved fallback — this uses a conservative, temporary exact-handle denylist
// of known non-product-type / utility collections rather than a broad fuzzy
// brand-detection heuristic.
//
// Refinement path: `logCollectionFilter` prints every included/excluded handle
// in dev. Brand or other non-product-type collections observed there should be
// added to DENY_HANDLES in M41S2C. This never inspects tokens or request
// internals — only public collection handles/titles.

import type { CatalogueCollection } from '../../src/shopify';

// Exact, lowercased handles to keep out of the category grid. All entries are
// either generic storefront/utility handles or handles observed directly in
// M41S2B2 live QA against the real store — none are guessed. Grouped by reason
// so future edits stay principled; extend from observed logs as the catalogue
// changes.
const DENY_HANDLES = new Set<string>([
  // Generic storefront / utility collections.
  'frontpage',
  'front-page',
  'home',
  'home-page',
  'homepage',
  'all',
  'all-products',
  // Brand (vendor) collections — the grid prioritizes product types, not brands
  // (owner decision M41S2B2). Observed in live QA.
  'brands',
  'apres',
  'billionaire',
  'chaun-legend',
  'chisel',
  'cnd',
  'codi',
  'cre8tion',
  'dch',
  'dnd',
  'dnd-dc',
  'dnd-diva',
  'glam-n-glits',
  'not-polish',
  // Promo / merchandising / personalized collections (not product types).
  // Observed in live QA.
  'buy-again',
  'featured',
  'new-arrival',
  'pallet-deals',
  'promotion',
]);

export interface CollectionFilterResult {
  included: CatalogueCollection[];
  excluded: CatalogueCollection[];
}

export function filterCategoryCollections(
  collections: CatalogueCollection[]
): CollectionFilterResult {
  const included: CatalogueCollection[] = [];
  const excluded: CatalogueCollection[] = [];
  for (const c of collections) {
    if (DENY_HANDLES.has(c.handle.toLowerCase())) {
      excluded.push(c);
    } else {
      included.push(c);
    }
  }
  return { included, excluded };
}

// Dev-only visibility so the owner can move brand / non-product-type collections
// into DENY_HANDLES for M41S2C.
export function logCollectionFilter(result: CollectionFilterResult): void {
  if (!__DEV__) return;
  const fmt = (c: CatalogueCollection) => `  ${c.handle} — ${c.title}`;
  console.log(
    `[M41S2B2] category collections included (${result.included.length}):\n` +
      (result.included.map(fmt).join('\n') || '  (none)')
  );
  console.log(
    `[M41S2B2] category collections excluded (${result.excluded.length}):\n` +
      (result.excluded.map(fmt).join('\n') || '  (none)')
  );
}
