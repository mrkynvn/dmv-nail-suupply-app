// Connectivity proof helper for the Shopify Storefront foundation (M41S1).
//
// fetchShopInfo() is the single, safe way to verify that the Storefront
// connection works end-to-end. It issues the read-only SHOP_INFO_QUERY and
// returns only the shop's public name and primary domain URL. It exposes no
// token and creates no cart or checkout. It can only succeed when a local
// (gitignored) env file supplies the required variables; otherwise the config
// boundary throws before any network call is made.
//
// This helper is intentionally NOT wired into any screen or navigation — the
// milestone adds no visible UI. Connectivity is verified by calling this
// function from a developer context that has the local env present.

import { getStorefrontClient } from './client';
import { SHOP_INFO_QUERY, type ShopInfoQueryData } from './queries';

export interface ShopInfo {
  name: string;
  primaryDomainUrl: string;
}

// Run the shop-info probe. Throws with a non-sensitive message on transport,
// GraphQL, or empty-response failures.
export async function fetchShopInfo(): Promise<ShopInfo> {
  const client = getStorefrontClient();
  const { data, errors } = await client.request<ShopInfoQueryData>(SHOP_INFO_QUERY);

  if (errors) {
    throw new Error(
      `Shopify shop-info query failed: ${errors.message ?? 'unknown Storefront error'}`
    );
  }
  if (!data?.shop) {
    throw new Error('Shopify shop-info query returned no shop data.');
  }

  return {
    name: data.shop.name,
    primaryDomainUrl: data.shop.primaryDomain.url,
  };
}
