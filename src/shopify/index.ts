// Public surface of the Shopify Storefront boundary (M41S1).
// Consumers import from 'src/shopify' rather than reaching into individual files.

export { SHOPIFY_API_VERSION, getShopifyConfig } from './config';
export type { ShopifyConfig } from './config';

export { getStorefrontClient } from './client';

export { SHOP_INFO_QUERY } from './queries';
export type { ShopInfoQueryData } from './queries';

export { fetchShopInfo } from './shopInfo';
export type { ShopInfo } from './shopInfo';

// Catalogue foundation (M41S2A). App-facing types, read helpers, and cache.
// Raw GraphQL operations stay internal to catalogueQueries.ts.
export {
  fetchCollections,
  fetchCollectionProducts,
  fetchProductByHandle,
  fetchNewArrivals,
  resolveProductsByGids,
  searchCatalogueProducts,
  SALE_COLLECTION_HANDLE,
  FEATURED_COLLECTION_HANDLE,
} from './catalogue';
export type { ResolvedProductNode } from './catalogue';
export type {
  Money,
  ProductImage,
  ProductVariant,
  RepresentativeVariant,
  CatalogueProduct,
  CatalogueCollection,
  CollectionSortOption,
  PageInfo,
  Paginated,
  CollectionProductsPage,
} from './catalogueTypes';
export {
  cacheProduct,
  cacheProducts,
  getCachedProductByHandle,
  getCachedProductByGid,
  getCachedVariant,
  clearCatalogueCache,
} from './catalogueCache';

// Cart / checkout write boundary (M41S3B). Creates a Storefront cart and returns
// its checkoutUrl. Raw GraphQL mutation stays internal to cartMutations.ts. This
// boundary does not open checkout, persist the cart, or use any back-office API.
export { createShopifyCheckout } from './cart';
export { ShopifyCartError } from './cartTypes';
export type { ShopifyCheckoutLineInput, ShopifyCheckoutResult } from './cartTypes';
