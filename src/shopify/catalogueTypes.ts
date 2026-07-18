// App-facing catalogue model (M41S2A).
//
// These are the normalized shapes the app consumes for every product surface.
// They are deliberately decoupled from the raw Storefront GraphQL responses (see
// catalogueQueries.ts); the adapters in catalogueAdapters.ts translate raw
// Storefront data into these, and the UI-layer ProductCardModel adapts them for
// rendering.
//
// Identity conventions (owner decision M41S2, item 2):
//   - `handle` is the stable, human-readable key persisted for favorites and
//     recently-viewed.
//   - `id` (product) and variant `id` are Shopify GIDs, retained for
//     product/cart/variant operations.

// A monetary amount with its ISO currency code. Storefront returns the amount as
// a decimal string; adapters parse it into a number here for app use.
export interface Money {
  amount: number;
  currencyCode: string;
}

// A product/variant image. Dimensions are nullable because Shopify does not
// always expose them.
export interface ProductImage {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

// A single purchasable variant of a product. `id` is the variant GID used for
// cart/checkout in later milestones.
export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
  // Inventory state. `currentlyNotInStock` reflects whether the variant is
  // oversellable while at zero stock; exact remaining counts are omitted because
  // the app's access credentials lack the inventory scope. Availability for v1
  // is driven by `availableForSale`.
  currentlyNotInStock: boolean;
  selectedOptions: { name: string; value: string }[];
  image: ProductImage | null;
}

// The single representative variant a card/list product exposes:
// Storefront's `selectedOrFirstAvailableVariant`. It is the ONLY basis for
// proving sale state and single-variant Quick Add — never priceRange minima.
// Present whenever the product has at least one variant (an out-of-stock product
// still yields one, with `availableForSale: false`).
export interface RepresentativeVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
}

// A catalogue product in app-model form. Products fetched from list/search
// queries carry an empty `variants` array (variants are only queried on the
// product-by-handle detail fetch); `hasVariantDetail` distinguishes the two.
export interface CatalogueProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  brand: string;
  productType: string;
  tags: string[];
  featuredImage: ProductImage | null;
  images: ProductImage[];
  // Price span across variants (equal min/max for single-price products).
  minPrice: Money;
  maxPrice: Money;
  // Effective compare-at price when the product is discounted, else null. Proven
  // from `representativeVariant` (same-variant compare-at > price), NOT from the
  // compare-at price *range* — so it is a true, displayable discount.
  compareAtPrice: Money | null;
  isOnSale: boolean;
  availableForSale: boolean;
  // Creation timestamp (ISO); backs deterministic New Arrivals ordering. Null
  // only if Storefront omitted it.
  createdAt: string | null;
  // Variant count and whether it is exact. `variantCountExact === false` means
  // the store reports "at least N" (AT_LEAST precision) and the count is a floor,
  // so single-variant Quick Add is never offered on it.
  variantCount: number;
  variantCountExact: boolean;
  // The representative variant (see above), or null if the product has no
  // variant at all (never expected for a real published product).
  representativeVariant: RepresentativeVariant | null;
  variants: ProductVariant[];
  hasVariantDetail: boolean;
  defaultVariantId: string | null;
  updatedAt: string | null;
}

// A storefront collection. In v1 these back the main product-type category grid
// (owner decision M41S2, item 1); brand rails come later.
export interface CatalogueCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ProductImage | null;
  // Optional remote category icon from the Shopify Collection metafield
  // custom.app_icon (M41S5B). Present only when the collection has a valid
  // HTTPS MediaImage configured; null/absent otherwise, in which case the tile
  // falls back to the local icon registry.
  appIcon?: ProductImage | null;
}

// App-facing sort options for products within a collection (M41S2C2A).
//
// A narrow, user-meaningful menu — decoupled from the Storefront
// `ProductCollectionSortKeys` enum, which the catalogue helpers translate this
// into (sort key + reverse). `'featured'` is the default and maps to the
// collection's own configured order, i.e. the behavior when no sort is passed.
// No UI consumes this yet; the sort sheet lands in M41S2C2B.
export type CollectionSortOption =
  | 'featured'
  | 'newest'
  | 'price-low-high'
  | 'price-high-low'
  | 'title-az';

// Relay-style cursor pagination info, normalized for app use.
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

// A page of results plus its pagination cursor.
export interface Paginated<T> {
  items: T[];
  pageInfo: PageInfo;
}

// A page of products within a collection, plus the collection's own metadata.
// Extends the plain product page with `collection` so callers can render the
// real collection title without a second request. `collection` is null when the
// handle matches no collection (same empty-page semantics as Paginated).
export interface CollectionProductsPage extends Paginated<CatalogueProduct> {
  collection: CatalogueCollection | null;
}
