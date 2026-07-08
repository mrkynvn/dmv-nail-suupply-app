// Typed Shopify Storefront API client (M41S1).
//
// Wraps the official @shopify/storefront-api-client. The client is built lazily
// on first use and cached, so simply importing this module never reads the
// environment or constructs a network client — it only happens when a caller
// actually issues a request. The public access token flows straight from the
// config boundary into the client and is never logged here.

import {
  createStorefrontApiClient,
  type StorefrontApiClient,
} from '@shopify/storefront-api-client';

import { getShopifyConfig } from './config';

let client: StorefrontApiClient | null = null;

// Build (once) and return the Storefront client. Throws via getShopifyConfig()
// if the local environment is not configured.
export function getStorefrontClient(): StorefrontApiClient {
  if (client) return client;

  const config = getShopifyConfig();
  client = createStorefrontApiClient({
    storeDomain: config.storeDomain,
    apiVersion: config.apiVersion,
    publicAccessToken: config.storefrontAccessToken,
  });
  return client;
}
