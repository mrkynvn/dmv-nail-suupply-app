// Hand-written Storefront GraphQL operations (M41S1).
//
// This milestone deliberately avoids codegen: a single, minimal shop-info query
// is enough to prove connectivity without introducing a .graphqlrc /
// introspection toolchain. Response typing lives alongside each operation.

// Minimal, read-only connectivity probe. Returns nothing sensitive — only the
// shop's public name and primary domain — so it is a safe way to confirm that
// the store domain, API version, and access token are wired correctly.
export const SHOP_INFO_QUERY = `
  query ShopInfo {
    shop {
      name
      primaryDomain {
        url
      }
    }
  }
` as const;

// Shape of the data returned by SHOP_INFO_QUERY.
export interface ShopInfoQueryData {
  shop: {
    name: string;
    primaryDomain: {
      url: string;
    };
  };
}
