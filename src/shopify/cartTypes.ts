// App-facing types for the Shopify cart/checkout boundary (M41S3B).
//
// These stay independent of the app cart module (src/cart) so the Shopify
// boundary never depends back on the app. Callers denormalize their own cart
// lines down to `ShopifyCheckoutLineInput` before calling createShopifyCheckout.

// The minimal input a caller supplies per Shopify line: which variant, how many.
export interface ShopifyCheckoutLineInput {
  /** Storefront variant GID (becomes the cart line `merchandiseId`). */
  variantId: string;
  quantity: number;
}

// The only fields the app consumes from a created cart. `cartId` is returned for
// internal use only; it is never persisted, displayed, or logged.
export interface ShopifyCheckoutResult {
  checkoutUrl: string;
  cartId?: string;
}

// Typed error for every failure path in createShopifyCheckout: empty input,
// invalid line, Storefront userErrors, or a missing checkoutUrl. Message text
// never includes tokens, the checkoutUrl, or the cart id.
export class ShopifyCartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShopifyCartError';
  }
}
