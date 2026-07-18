// Hand-written Storefront catalogue GraphQL operations and their raw response
// typings (M41S2A).
//
// Like queries.ts, this milestone avoids codegen: the operations are composed
// from small string fragments and typed by hand. All GraphQL detail is confined
// to this module — callers use the helpers in catalogue.ts and never see a
// query string. Nothing here is wired to UI in this sub-step.

// --- Fragments ---------------------------------------------------------------
// Reusable selections. Each operation appends exactly the fragments it uses
// (see `op()` below) so every composed document defines each fragment once.

const MONEY_FRAGMENT = `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

const IMAGE_FRAGMENT = `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

const VARIANT_FRAGMENT = `
  fragment ProductVariantFields on ProductVariant {
    id
    title
    sku
    availableForSale
    currentlyNotInStock
    price { ...MoneyFields }
    compareAtPrice { ...MoneyFields }
    selectedOptions { name value }
    image { ...ImageFields }
  }
`;

// Fields sufficient to render a product card / list tile without querying every
// variant.
//
// Sale state and Quick-Add eligibility are proven from a single representative
// variant — `selectedOrFirstAvailableVariant` — NOT from priceRange vs
// compareAtPriceRange (which can falsely flag a sale when *different* variants
// hold the min price and the min compare-at). `variantsCount { count precision }`
// gives an exact/at-least count so a card only offers direct add when it can
// prove there is exactly one variant. `createdAt` backs deterministic
// New Arrivals ordering. (M41S6E)
const PRODUCT_CARD_FRAGMENT = `
  fragment ProductCardFields on Product {
    id
    handle
    title
    description
    vendor
    productType
    tags
    availableForSale
    createdAt
    updatedAt
    featuredImage { ...ImageFields }
    variantsCount {
      count
      precision
    }
    selectedOrFirstAvailableVariant {
      id
      title
      availableForSale
      price { ...MoneyFields }
      compareAtPrice { ...MoneyFields }
    }
    priceRange {
      minVariantPrice { ...MoneyFields }
      maxVariantPrice { ...MoneyFields }
    }
    compareAtPriceRange {
      minVariantPrice { ...MoneyFields }
      maxVariantPrice { ...MoneyFields }
    }
  }
`;

// Product-detail selection: card fields plus the image gallery and variants.
const PRODUCT_DETAIL_FRAGMENT = `
  fragment ProductDetailFields on Product {
    ...ProductCardFields
    images(first: 10) { nodes { ...ImageFields } }
    variants(first: 50) { nodes { ...ProductVariantFields } }
  }
`;

const COLLECTION_FRAGMENT = `
  fragment CollectionFields on Collection {
    id
    handle
    title
    description
    image { ...ImageFields }
    appIcon: metafield(namespace: "custom", key: "app_icon") {
      reference {
        ... on MediaImage {
          image { ...ImageFields }
        }
      }
    }
  }
`;

// Join an operation body with the (unique) fragments it references. Fragment
// order does not matter to GraphQL; each must appear at most once per document.
function op(operation: string, ...fragments: string[]): string {
  return [operation, ...fragments].join('\n');
}

// --- Operations --------------------------------------------------------------

export const COLLECTIONS_QUERY = op(
  `
    query Collections($first: Int!, $after: String) {
      collections(first: $first, after: $after, sortKey: TITLE) {
        nodes { ...CollectionFields }
        pageInfo { hasNextPage endCursor }
      }
    }
  `,
  COLLECTION_FRAGMENT,
  IMAGE_FRAGMENT
);

// `$sortKey`/`$reverse` default to the collection's own order (COLLECTION_DEFAULT,
// not reversed), so omitting them is identical to the pre-sort query — callers
// that pass no sort get unchanged behavior.
export const COLLECTION_PRODUCTS_QUERY = op(
  `
    query CollectionProducts(
      $handle: String!
      $first: Int!
      $after: String
      $sortKey: ProductCollectionSortKeys = COLLECTION_DEFAULT
      $reverse: Boolean = false
    ) {
      collection(handle: $handle) {
        ...CollectionFields
        products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
          nodes { ...ProductCardFields }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `,
  COLLECTION_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
  IMAGE_FRAGMENT,
  MONEY_FRAGMENT
);

export const PRODUCT_BY_HANDLE_QUERY = op(
  `
    query ProductByHandle($handle: String!) {
      product(handle: $handle) { ...ProductDetailFields }
    }
  `,
  PRODUCT_DETAIL_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
  VARIANT_FRAGMENT,
  IMAGE_FRAGMENT,
  MONEY_FRAGMENT
);

export const PRODUCT_SEARCH_QUERY = op(
  `
    query ProductSearch($query: String!, $first: Int!, $after: String) {
      products(first: $first, after: $after, query: $query) {
        nodes { ...ProductCardFields }
        pageInfo { hasNextPage endCursor }
      }
    }
  `,
  PRODUCT_CARD_FRAGMENT,
  IMAGE_FRAGMENT,
  MONEY_FRAGMENT
);

// New Arrivals (M41S6E): newest products first. The sort key/direction are fixed
// in the query text — CREATED_AT descending — so ordering is deterministic and
// cannot drift from a caller-supplied argument. No "New" time-window badge is
// derived from this (owner decision).
export const NEW_ARRIVALS_QUERY = op(
  `
    query NewArrivals($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        nodes { ...ProductCardFields }
      }
    }
  `,
  PRODUCT_CARD_FRAGMENT,
  IMAGE_FRAGMENT,
  MONEY_FRAGMENT
);

// Bulk product resolution by GID (M41S6E) for Favorites / Recently Viewed, which
// persist Shopify product GIDs. `nodes(ids:)` returns results positionally
// aligned with the input ids; a deleted/unpublished/non-Product id yields null
// (or a non-Product node), which callers prune. `__typename` guards the union so
// only real Product nodes are adapted.
export const PRODUCT_NODES_QUERY = op(
  `
    query ProductNodes($ids: [ID!]!) {
      nodes(ids: $ids) {
        __typename
        ... on Product { ...ProductCardFields }
      }
    }
  `,
  PRODUCT_CARD_FRAGMENT,
  IMAGE_FRAGMENT,
  MONEY_FRAGMENT
);

// --- Raw response typings ----------------------------------------------------
// Mirror the selections above exactly. These describe what Storefront returns,
// before normalization by catalogueAdapters.ts.

export interface RawMoney {
  amount: string;
  currencyCode: string;
}

export interface RawImage {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface RawVariant {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  currentlyNotInStock: boolean;
  price: RawMoney;
  compareAtPrice: RawMoney | null;
  selectedOptions: { name: string; value: string }[];
  image: RawImage | null;
}

export interface RawPriceRange {
  minVariantPrice: RawMoney;
  maxVariantPrice: RawMoney;
}

// Storefront `ProductVariantsCountPrecision`. EXACT means `count` is the true
// number of variants; AT_LEAST means the store has more variants than the API
// will count precisely (so the count is a floor, never proof of "exactly one").
export type RawVariantsCountPrecision = 'EXACT' | 'AT_LEAST';

export interface RawVariantsCount {
  count: number;
  precision: RawVariantsCountPrecision;
}

// The representative variant used to prove sale state and single-variant Quick
// Add: `selectedOrFirstAvailableVariant`. Present for any product with at least
// one variant (it falls back to the first variant when none are available, so an
// out-of-stock product still returns a variant with availableForSale=false).
export interface RawCardVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: RawMoney;
  compareAtPrice: RawMoney | null;
}

export interface RawProductCard {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  createdAt: string;
  updatedAt: string;
  featuredImage: RawImage | null;
  variantsCount: RawVariantsCount | null;
  selectedOrFirstAvailableVariant: RawCardVariant | null;
  priceRange: RawPriceRange;
  compareAtPriceRange: RawPriceRange;
}

export interface RawProductDetail extends RawProductCard {
  images: { nodes: RawImage[] };
  variants: { nodes: RawVariant[] };
}

// The `custom.app_icon` collection metafield, aliased to `appIcon` in the query.
// `reference` is null when unset and may be a non-MediaImage reference (in which
// case `image` is absent), so both levels are optional/nullable.
export interface RawCollectionAppIcon {
  reference: { image?: RawImage | null } | null;
}

export interface RawCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: RawImage | null;
  appIcon: RawCollectionAppIcon | null;
}

export interface RawPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface CollectionsQueryData {
  collections: {
    nodes: RawCollection[];
    pageInfo: RawPageInfo;
  };
}

export interface CollectionsQueryVars {
  first: number;
  after?: string | null;
}

export interface CollectionProductsQueryData {
  collection:
    | (RawCollection & {
        products: {
          nodes: RawProductCard[];
          pageInfo: RawPageInfo;
        };
      })
    | null;
}

// The subset of Storefront `ProductCollectionSortKeys` the app maps its
// `CollectionSortOption`s onto (M41S2C2A). GraphQL enum knowledge stays here.
export type ProductCollectionSortKey =
  | 'COLLECTION_DEFAULT'
  | 'CREATED'
  | 'PRICE'
  | 'TITLE';

export interface CollectionProductsQueryVars {
  handle: string;
  first: number;
  after?: string | null;
  // Omitted → query defaults (COLLECTION_DEFAULT / not reversed) apply.
  sortKey?: ProductCollectionSortKey;
  reverse?: boolean;
}

export interface ProductByHandleQueryData {
  product: RawProductDetail | null;
}

export interface ProductByHandleQueryVars {
  handle: string;
}

export interface ProductSearchQueryData {
  products: {
    nodes: RawProductCard[];
    pageInfo: RawPageInfo;
  };
}

export interface ProductSearchQueryVars {
  query: string;
  first: number;
  after?: string | null;
}

export interface NewArrivalsQueryData {
  products: {
    nodes: RawProductCard[];
  };
}

export interface NewArrivalsQueryVars {
  first: number;
}

// `nodes(ids:)` returns Node interface members. Each element is a Product node
// (carrying ProductCardFields plus __typename), null (deleted/unknown id), or a
// non-Product node (only __typename resolves). Typed as a permissive union the
// adapter narrows on `__typename`.
export type RawNode =
  | (RawProductCard & { __typename: 'Product' })
  | { __typename: string }
  | null;

export interface ProductNodesQueryData {
  nodes: RawNode[];
}

export interface ProductNodesQueryVars {
  ids: string[];
}
