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
  searchCatalogueProducts,
} from './catalogue';
export type {
  Money,
  ProductImage,
  ProductVariant,
  CatalogueProduct,
  CatalogueCollection,
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
