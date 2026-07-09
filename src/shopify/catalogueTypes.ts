// App-facing catalogue model (M41S2A).
//
// These are the normalized shapes the rest of the app will consume once screens
// are wired to Shopify. They are deliberately decoupled from both the raw
// Storefront GraphQL responses (see catalogueQueries.ts) and the legacy mock
// `Product`/`Category` types in src/data — the adapters in catalogueAdapters.ts
// translate raw Storefront data into these. No UI imports these yet.
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
  // Inventory state. `quantityAvailable` is null when the Storefront token lacks
  // the inventory scope or the shop hides it; treat null as "unknown", not zero.
  quantityAvailable: number | null;
  currentlyNotInStock: boolean;
  selectedOptions: { name: string; value: string }[];
  image: ProductImage | null;
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
  // Effective compare-at price when the product is discounted, else null.
  compareAtPrice: Money | null;
  isOnSale: boolean;
  availableForSale: boolean;
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
}

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
