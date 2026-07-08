// Lightweight in-memory catalogue cache (M41S2A).
//
// A process-lifetime cache of normalized products, indexed for the lookups
// later screens and the local cart will need. It holds no network state and
// persists nothing to disk. Populated by the fetch helpers in catalogue.ts.
//
// The variant lookup here is deliberate groundwork for the future M41S2E
// bridge, which will read cached variant pricing to display a local cart total.
// Per owner decision M41S2 (item 3), that bridge must remain read-only: it
// creates no Shopify cart, checkout URL, or checkout session. This module makes
// no network calls of any kind.

import type { CatalogueProduct, ProductVariant } from './catalogueTypes';

const productsByHandle = new Map<string, CatalogueProduct>();
const productsByGid = new Map<string, CatalogueProduct>();
// variant GID -> the variant and the product that owns it, for local pricing.
const variantIndex = new Map<string, { product: CatalogueProduct; variant: ProductVariant }>();

// Store a product and index it by handle, product GID, and each variant GID.
// A later, richer copy of the same product (e.g. detail after a card) overwrites
// the earlier one, so variant detail is never lost once fetched.
export function cacheProduct(product: CatalogueProduct): void {
  productsByHandle.set(product.handle, product);
  productsByGid.set(product.id, product);
  for (const variant of product.variants) {
    variantIndex.set(variant.id, { product, variant });
  }
}

export function cacheProducts(products: CatalogueProduct[]): void {
  for (const product of products) cacheProduct(product);
}

export function getCachedProductByHandle(handle: string): CatalogueProduct | undefined {
  return productsByHandle.get(handle);
}

export function getCachedProductByGid(gid: string): CatalogueProduct | undefined {
  return productsByGid.get(gid);
}

// Read-only variant lookup for local price display (M41S2E prep). Returns the
// variant and its owning product, or undefined if not yet fetched with detail.
export function getCachedVariant(
  variantGid: string
): { product: CatalogueProduct; variant: ProductVariant } | undefined {
  return variantIndex.get(variantGid);
}

// Drop all cached catalogue state. Useful for tests and future cache-busting.
export function clearCatalogueCache(): void {
  productsByHandle.clear();
  productsByGid.clear();
  variantIndex.clear();
}
