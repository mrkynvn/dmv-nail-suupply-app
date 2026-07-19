// Non-UI catalogue fetch helpers (M41S2A).
//
// The app-facing read API for Shopify catalogue data. Each helper issues one
// hand-written Storefront query, normalizes the response via catalogueAdapters,
// populates the in-memory cache, and returns app-model types. No screen imports
// these yet — wiring lands in later sub-steps (M41S2B+).
//
// These helpers only read catalogue data. They never create a Shopify cart,
// request a checkout URL, or use the Admin API.

import { getStorefrontClient } from './client';
import {
  adaptCollection,
  adaptPageInfo,
  adaptProductCard,
  adaptProductDetail,
  adaptProductNodes,
  type ResolvedProductNode,
} from './catalogueAdapters';
import { cacheProduct, cacheProducts } from './catalogueCache';
import {
  COLLECTION_PRODUCTS_QUERY,
  COLLECTIONS_QUERY,
  NEW_ARRIVALS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_NODES_QUERY,
  PRODUCT_SEARCH_QUERY,
  type CollectionProductsQueryData,
  type CollectionsQueryData,
  type NewArrivalsQueryData,
  type ProductByHandleQueryData,
  type ProductCollectionSortKey,
  type ProductNodesQueryData,
  type ProductSearchQueryData,
} from './catalogueQueries';
import type {
  CatalogueCollection,
  CatalogueProduct,
  CollectionProductsPage,
  CollectionSortOption,
  Paginated,
} from './catalogueTypes';

export type { ResolvedProductNode } from './catalogueAdapters';

// How many New Arrivals the app requests (Home shows the first 10).
const NEW_ARRIVALS_COUNT = 10;

// The sole approved source of sale candidates (owner decision M41S6E): a
// Shopify collection. Membership does NOT by itself prove a discount — callers
// still apply the exact same-variant sale guard (CatalogueProduct.isOnSale) and
// omit products that are not provably discounted.
//
// M41S8-FIX1: the DC store publishes this as `promotion`; the previous
// `app-on-sale` handle does not exist there, so the collection resolved null and
// every sale surface rendered empty. The sale guard below is unchanged.
export const SALE_COLLECTION_HANDLE = 'promotion';

// Source of the Home "Featured Products" rail (M41S8-FIX1). This is a curated
// merchandising collection: its order is the merchandiser's, so callers preserve
// Shopify's default ordering and must NOT apply the sale guard — being featured
// is not a discount claim.
export const FEATURED_COLLECTION_HANDLE = 'featured';

// Default page size for list/search queries when a caller does not specify one.
const DEFAULT_PAGE_SIZE = 24;

interface PageOpts {
  first?: number;
  after?: string | null;
}

// Options for fetchCollectionProducts: a page window plus an optional sort.
// Omitting `sort` leaves the collection's default order untouched.
interface CollectionProductsOpts extends PageOpts {
  sort?: CollectionSortOption;
}

// Translate an app-facing sort option into Storefront (sortKey, reverse). The
// `'featured'` case is absent on purpose: it means "collection default", so
// callers omit sort entirely and the query defaults handle it (see
// COLLECTION_PRODUCTS_QUERY) — keeping the no-sort request byte-identical.
const COLLECTION_SORT_MAP: Record<
  Exclude<CollectionSortOption, 'featured'>,
  { sortKey: ProductCollectionSortKey; reverse: boolean }
> = {
  newest: { sortKey: 'CREATED', reverse: true },
  'price-low-high': { sortKey: 'PRICE', reverse: false },
  'price-high-low': { sortKey: 'PRICE', reverse: true },
  'title-az': { sortKey: 'TITLE', reverse: false },
};

// Run a catalogue query and return its data, mirroring fetchShopInfo's error
// handling. Message text never includes the query variables or the token.
async function runQuery<TData>(
  operation: string,
  variables: Record<string, unknown>
): Promise<TData> {
  const client = getStorefrontClient();
  const { data, errors } = await client.request<TData>(operation, { variables });

  if (errors) {
    throw new Error(
      `Shopify catalogue query failed: ${errors.message ?? 'unknown Storefront error'}`
    );
  }
  if (!data) {
    throw new Error('Shopify catalogue query returned no data.');
  }
  return data;
}

// Fetch storefront collections (product-type collections back the main category
// grid in v1; see owner decision M41S2, item 1).
export async function fetchCollections(opts: PageOpts = {}): Promise<Paginated<CatalogueCollection>> {
  const data = await runQuery<CollectionsQueryData>(COLLECTIONS_QUERY, {
    first: opts.first ?? DEFAULT_PAGE_SIZE,
    after: opts.after ?? null,
  });
  return {
    items: data.collections.nodes.map(adaptCollection),
    pageInfo: adaptPageInfo(data.collections.pageInfo),
  };
}

// Fetch a page of products within a collection, by collection handle. Returns
// an empty page (with `collection: null`) if the handle matches no collection.
// The query already selects the collection's own fields, so the title/handle are
// returned alongside the products for the caller's header — no extra request.
export async function fetchCollectionProducts(
  handle: string,
  opts: CollectionProductsOpts = {}
): Promise<CollectionProductsPage> {
  // Include sortKey/reverse only when a non-default sort is requested; otherwise
  // omit them so the query's defaults preserve the collection's own order.
  const sort = opts.sort && opts.sort !== 'featured' ? COLLECTION_SORT_MAP[opts.sort] : undefined;
  const data = await runQuery<CollectionProductsQueryData>(COLLECTION_PRODUCTS_QUERY, {
    handle,
    first: opts.first ?? DEFAULT_PAGE_SIZE,
    after: opts.after ?? null,
    ...(sort ?? {}),
  });

  if (!data.collection) {
    return { items: [], pageInfo: { hasNextPage: false, endCursor: null }, collection: null };
  }

  const items = data.collection.products.nodes.map(adaptProductCard);
  cacheProducts(items);
  return {
    items,
    pageInfo: adaptPageInfo(data.collection.products.pageInfo),
    collection: adaptCollection(data.collection),
  };
}

// Fetch a single product with full variant/image detail by handle, or null if
// no such product exists.
export async function fetchProductByHandle(handle: string): Promise<CatalogueProduct | null> {
  const data = await runQuery<ProductByHandleQueryData>(PRODUCT_BY_HANDLE_QUERY, { handle });
  if (!data.product) return null;

  const product = adaptProductDetail(data.product);
  cacheProduct(product);
  return product;
}

// Search products via the Storefront search syntax. An empty/whitespace query
// short-circuits to an empty page rather than issuing a request.
export async function searchCatalogueProducts(
  query: string,
  opts: PageOpts = {}
): Promise<Paginated<CatalogueProduct>> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { items: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  const data = await runQuery<ProductSearchQueryData>(PRODUCT_SEARCH_QUERY, {
    query: trimmed,
    first: opts.first ?? DEFAULT_PAGE_SIZE,
    after: opts.after ?? null,
  });

  const items = data.products.nodes.map(adaptProductCard);
  cacheProducts(items);
  return { items, pageInfo: adaptPageInfo(data.products.pageInfo) };
}

// Fetch the newest products (CREATED_AT descending) for the Home "New Arrivals"
// rail. The sort is fixed in the query, so ordering is deterministic. Returns up
// to `count` (default 10) normalized products.
export async function fetchNewArrivals(count: number = NEW_ARRIVALS_COUNT): Promise<CatalogueProduct[]> {
  const data = await runQuery<NewArrivalsQueryData>(NEW_ARRIVALS_QUERY, { first: count });
  const items = data.products.nodes.map(adaptProductCard);
  cacheProducts(items);
  return items;
}

// Resolve a set of product GIDs (persisted by Favorites / Recently Viewed) to
// products in ONE request, preserving the requested order. Each entry carries
// its gid and either the product or null (deleted/unpublished/non-Product) so
// callers can prune stale identities. An empty input short-circuits with no
// request. Never throws because one node is null.
export async function resolveProductsByGids(gids: string[]): Promise<ResolvedProductNode[]> {
  if (gids.length === 0) return [];
  const data = await runQuery<ProductNodesQueryData>(PRODUCT_NODES_QUERY, { ids: gids });
  const resolved = adaptProductNodes(gids, data.nodes);
  cacheProducts(
    resolved
      .map((r) => r.product)
      .filter((p): p is CatalogueProduct => p !== null)
  );
  return resolved;
}
