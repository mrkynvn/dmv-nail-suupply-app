// Hand-written Storefront cart GraphQL mutation and its raw response typings
// (M41S3B).
//
// Like catalogueQueries.ts, this milestone avoids codegen: the operation is a
// hand-written string and its response is typed by hand. All GraphQL detail is
// confined to this module — callers use the helper in cart.ts and never see a
// mutation string.
//
// This module only creates a Storefront cart (to obtain a checkoutUrl). It never
// touches any privileged back-office API, places orders, or requests payment.

// A single cart line to create. `merchandiseId` is the Storefront variant GID.
export interface RawCartLineInput {
  merchandiseId: string;
  quantity: number;
}

// `cartCreate` builds a cart from initial lines in one round-trip and returns the
// hosted `checkoutUrl`. We select only the minimal safe fields the app needs.
export const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

// --- Raw response typings -----------------------------------------------------
// Mirror the selection above exactly. These describe what Storefront returns.

export interface RawCartUserError {
  field: string[] | null;
  message: string;
  code: string | null;
}

export interface CartCreateData {
  cartCreate: {
    cart: {
      id: string;
      checkoutUrl: string;
    } | null;
    userErrors: RawCartUserError[];
  };
}

export interface CartCreateVars {
  lines: RawCartLineInput[];
}
