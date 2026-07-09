// Non-UI Shopify cart helper (M41S3B).
//
// Converts denormalized app cart lines into a Storefront cart via `cartCreate`
// and returns the hosted `checkoutUrl`. This is the app-facing write boundary for
// checkout; it mirrors catalogue.ts's structure (a local runMutation plus a thin
// typed helper).
//
// This helper only creates a Storefront cart to obtain a checkoutUrl. It does not
// open the checkout, persist the cart id, use any privileged back-office API,
// place orders, or take payment. It never logs the checkoutUrl, cart id, token,
// or line data.

import { getStorefrontClient } from './client';
import {
  CART_CREATE_MUTATION,
  type CartCreateData,
  type RawCartLineInput,
} from './cartMutations';
import {
  ShopifyCartError,
  type ShopifyCheckoutLineInput,
  type ShopifyCheckoutResult,
} from './cartTypes';

// Run a cart mutation and return its data, mirroring catalogue.ts's runQuery
// error handling. Message text never includes the variables or the token.
async function runMutation<TData>(
  operation: string,
  variables: Record<string, unknown>
): Promise<TData> {
  const client = getStorefrontClient();
  const { data, errors } = await client.request<TData>(operation, { variables });

  if (errors) {
    throw new ShopifyCartError(
      `Shopify cart mutation failed: ${errors.message ?? 'unknown Storefront error'}`
    );
  }
  if (!data) {
    throw new ShopifyCartError('Shopify cart mutation returned no data.');
  }
  return data;
}

// Validate and normalize caller lines into Storefront cart line inputs. Rejects an
// empty set, non-positive quantities, and missing variant ids with a typed error.
function toCartLineInputs(lines: ShopifyCheckoutLineInput[]): RawCartLineInput[] {
  if (lines.length === 0) {
    throw new ShopifyCartError('Cannot create a Shopify checkout from an empty cart.');
  }

  return lines.map((line, index) => {
    const variantId = line.variantId?.trim();
    if (!variantId) {
      throw new ShopifyCartError(`Shopify cart line ${index} is missing a variant id.`);
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new ShopifyCartError(
        `Shopify cart line ${index} has an invalid quantity (must be a positive integer).`
      );
    }
    return { merchandiseId: variantId, quantity: line.quantity };
  });
}

// Create a Storefront cart from the given Shopify lines and return its
// checkoutUrl (plus the cart id for internal, non-persisted use).
export async function createShopifyCheckout(
  lines: ShopifyCheckoutLineInput[]
): Promise<ShopifyCheckoutResult> {
  const cartLines = toCartLineInputs(lines);

  const data = await runMutation<CartCreateData>(CART_CREATE_MUTATION, { lines: cartLines });
  const { cart, userErrors } = data.cartCreate;

  if (userErrors.length > 0) {
    // Surface Storefront's own messages, which describe the problem (e.g. a sold-out
    // variant) without exposing tokens or ids.
    const detail = userErrors.map((e) => e.message).join('; ');
    throw new ShopifyCartError(`Shopify could not create the cart: ${detail}`);
  }
  if (!cart?.checkoutUrl) {
    throw new ShopifyCartError('Shopify returned no checkout URL for this cart.');
  }

  return { checkoutUrl: cart.checkoutUrl, cartId: cart.id };
}
