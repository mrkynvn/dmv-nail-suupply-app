// Bridge: Shopify catalogue product (app model) → legacy ProductCard `Product`.
//
// Pure, no side effects. Lets the existing mock-driven ProductCard render
// Shopify-backed catalogue products without the card knowing about Shopify.
// It deliberately lives in the UI layer (not src/shopify) so the Storefront
// boundary stays decoupled from the legacy src/data `Product` model — this
// adapter consumes only the already-normalized CatalogueProduct, never raw
// Storefront/GraphQL shapes.

import type { CatalogueProduct } from '../../src/shopify';
import type { Product } from '../../src/data/types';

export function catalogueProductToCardProduct(cp: CatalogueProduct): Product {
  return {
    id: cp.id,
    name: cp.title,
    brand: cp.brand,
    // No category navigation for Shopify cards in this milestone; productType is
    // the closest available grouping key and is unused by ProductCard rendering.
    categoryId: cp.productType,
    price: cp.minPrice.amount,
    originalPrice: cp.compareAtPrice ? cp.compareAtPrice.amount : undefined,
    // Remote Storefront image URL, or empty when Shopify has no featured image —
    // in which case ProductCard falls back to its placeholder treatment.
    imageUrl: cp.featuredImage?.url ?? '',
    description: cp.description,
    inStock: cp.availableForSale,
    isOnSale: cp.isOnSale,
    tags: [...cp.tags],
  };
}
