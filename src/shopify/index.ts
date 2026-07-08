// Public surface of the Shopify Storefront boundary (M41S1).
// Consumers import from 'src/shopify' rather than reaching into individual files.

export { SHOPIFY_API_VERSION, getShopifyConfig } from './config';
export type { ShopifyConfig } from './config';

export { getStorefrontClient } from './client';

export { SHOP_INFO_QUERY } from './queries';
export type { ShopInfoQueryData } from './queries';

export { fetchShopInfo } from './shopInfo';
export type { ShopInfo } from './shopInfo';
