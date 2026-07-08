// Central configuration boundary for the Shopify Storefront connection (M41S1).
//
// This module is the ONLY place that reads Shopify environment variables. Expo
// statically inlines variables prefixed with EXPO_PUBLIC_ at build time, so each
// one is accessed by its literal name (never a computed key) for inlining to
// work. Nothing here logs, prints, or otherwise exposes the access token.
//
// Resolution is lazy and cached: importing this module never touches the
// environment, so a normal app boot or `tsc --noEmit` succeeds even when no
// local env file is present. Configuration is only required — and only fails
// fast — at the moment a caller actually needs the Storefront client.

// The Storefront API version this app is pinned to. Bumping it is a deliberate,
// reviewed change; the runtime env var must match this value exactly.
export const SHOPIFY_API_VERSION = '2026-07';

export interface ShopifyConfig {
  storeDomain: string;
  storefrontAccessToken: string;
  apiVersion: string;
}

// Return a trimmed, non-empty env value or throw with an actionable message.
// The token's VALUE is never included in any error text.
function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing required Shopify env var ${name}. ` +
        'Copy .env.example to .env and fill in your local values.'
    );
  }
  return trimmed;
}

let cached: ShopifyConfig | null = null;

// Resolve and validate the Shopify configuration once, then reuse it. Fails fast
// if any variable is missing/blank, or if the API version drifts from the pin.
export function getShopifyConfig(): ShopifyConfig {
  if (cached) return cached;

  const storeDomain = requireEnv(
    'EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN',
    process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN
  );
  const storefrontAccessToken = requireEnv(
    'EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN',
    process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
  );
  const apiVersion = requireEnv(
    'EXPO_PUBLIC_SHOPIFY_API_VERSION',
    process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION
  );

  if (apiVersion !== SHOPIFY_API_VERSION) {
    throw new Error(
      `EXPO_PUBLIC_SHOPIFY_API_VERSION must be pinned to ${SHOPIFY_API_VERSION} ` +
        `(got ${apiVersion}).`
    );
  }

  cached = { storeDomain, storefrontAccessToken, apiVersion };
  return cached;
}
