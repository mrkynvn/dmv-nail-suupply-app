// Neutral, UI-layer product-card model (M41S6E).
//
// The single shape every product surface (Home, Search, Promotions, Favorites,
// Recently Viewed, category listing) renders and acts on. It is deliberately
// decoupled from:
//   - raw Storefront/GraphQL types (it consumes the already-normalized
//     CatalogueProduct), and
//   - the removed legacy mock `Product` type.
//
// Both imports below are TYPE-ONLY, so this module has no runtime imports and is
// a pure, directly unit-testable function.

import type { CatalogueProduct } from '../../src/shopify';
import type { ShopifyCartLineInput } from '../../src/cart/CartContext';

// What the quick-add control should do for this product:
//   - add:        exactly one proven-available variant — add it straight to the
//                 Shopify cart using the denormalized line.
//   - openDetail: multiple or uncertain variant count — send the shopper to the
//                 product detail screen to choose.
//   - disabled:   no available variant (out of stock) — control is inert/OOS.
export type QuickAddDescriptor =
  | { kind: 'add'; line: ShopifyCartLineInput }
  | { kind: 'openDetail' }
  | { kind: 'disabled' };

// Everything a card needs to render and act, with no Shopify/GraphQL/mock
// coupling.
export interface ProductCardModel {
  gid: string;
  handle: string;
  name: string;
  brand: string;
  productType: string;
  imageUrl: string | null;
  imageAltText: string | null;
  // Current selling price of the representative variant (falls back to the
  // product min price only if there is no representative variant).
  price: number;
  currencyCode: string;
  // Exact same-variant compare-at price to strike through, or null when the
  // product is not provably on sale.
  compareAtPrice: number | null;
  available: boolean;
  isOnSale: boolean;
  representativeVariantId: string | null;
  quickAdd: QuickAddDescriptor;
}

// Shopify's implicit single variant is titled "Default Title"; only surface a
// variant title when it carries real option info.
function meaningfulVariantTitle(title: string): string | undefined {
  const trimmed = title.trim();
  return trimmed.length > 0 && trimmed !== 'Default Title' ? trimmed : undefined;
}

// Decide the quick-add behavior. Precedence (per owner rules):
//   1. no representative variant OR it is unavailable            -> disabled
//   2. exactly one variant, proven by EXACT precision            -> add
//   3. otherwise (multiple / AT_LEAST / uncertain count)         -> openDetail
// AT_LEAST precision is never treated as "exactly one".
function buildQuickAdd(product: CatalogueProduct): QuickAddDescriptor {
  const rv = product.representativeVariant;
  if (!rv || !rv.availableForSale) return { kind: 'disabled' };

  const provenSingleVariant = product.variantCountExact && product.variantCount === 1;
  if (!provenSingleVariant) return { kind: 'openDetail' };

  const variantTitle = meaningfulVariantTitle(rv.title);
  const line: ShopifyCartLineInput = {
    variantId: rv.id,
    productId: product.id,
    handle: product.handle,
    title: product.title,
    unitPrice: rv.price.amount,
    currencyCode: rv.price.currencyCode,
    availableForSale: rv.availableForSale,
    ...(product.brand.trim().length > 0 ? { vendor: product.brand } : {}),
    ...(product.featuredImage?.url ? { imageUrl: product.featuredImage.url } : {}),
    ...(variantTitle ? { variantTitle } : {}),
  };
  return { kind: 'add', line };
}

// Pure builder: CatalogueProduct -> ProductCardModel.
export function catalogueProductToCardModel(product: CatalogueProduct): ProductCardModel {
  const rv = product.representativeVariant;
  const price = rv ? rv.price.amount : product.minPrice.amount;
  const currencyCode = rv ? rv.price.currencyCode : product.minPrice.currencyCode;

  return {
    gid: product.id,
    handle: product.handle,
    name: product.title,
    brand: product.brand,
    productType: product.productType,
    imageUrl: product.featuredImage?.url ?? null,
    imageAltText: product.featuredImage?.altText ?? null,
    price,
    currencyCode,
    compareAtPrice: product.compareAtPrice ? product.compareAtPrice.amount : null,
    available: product.availableForSale,
    isOnSale: product.isOnSale,
    representativeVariantId: rv?.id ?? null,
    quickAdd: buildQuickAdd(product),
  };
}
