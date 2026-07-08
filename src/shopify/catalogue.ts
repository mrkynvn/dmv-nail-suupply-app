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
import { adaptCollection, adaptPageInfo, adaptProductCard, adaptProductDetail } from './catalogueAdapters';
import { cacheProduct, cacheProducts } from './catalogueCache';
import {
  COLLECTION_PRODUCTS_QUERY,
  COLLECTIONS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_SEARCH_QUERY,
  type CollectionProductsQueryData,
  type CollectionsQueryData,
  type ProductByHandleQueryData,
  type ProductSearchQueryData,
} from './catalogueQueries';
import type { CatalogueCollection, CatalogueProduct, Paginated } from './catalogueTypes';

// Default page size for list/search queries when a caller does not specify one.
const DEFAULT_PAGE_SIZE = 24;

interface PageOpts {
  first?: number;
  after?: string | null;
}

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
// an empty page if the handle matches no collection.
export async function fetchCollectionProducts(
  handle: string,
  opts: PageOpts = {}
): Promise<Paginated<CatalogueProduct>> {
  const data = await runQuery<CollectionProductsQueryData>(COLLECTION_PRODUCTS_QUERY, {
    handle,
    first: opts.first ?? DEFAULT_PAGE_SIZE,
    after: opts.after ?? null,
  });

  if (!data.collection) {
    return { items: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  const items = data.collection.products.nodes.map(adaptProductCard);
  cacheProducts(items);
  return { items, pageInfo: adaptPageInfo(data.collection.products.pageInfo) };
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
