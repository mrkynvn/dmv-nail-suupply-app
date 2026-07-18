// Raw-Storefront → app-model normalizers (M41S2A).
//
// Pure functions: no network, no cache, no side effects. They convert the raw
// GraphQL shapes in catalogueQueries.ts into the app-facing catalogue types.
// Keeping this layer pure makes the fetch helpers in catalogue.ts trivial and
// keeps GraphQL-specific quirks (string money, price ranges) out of the app.

import type {
  RawCardVariant,
  RawCollection,
  RawImage,
  RawMoney,
  RawNode,
  RawPageInfo,
  RawProductCard,
  RawProductDetail,
  RawVariant,
} from './catalogueQueries';
import type {
  CatalogueCollection,
  CatalogueProduct,
  Money,
  PageInfo,
  ProductImage,
  ProductVariant,
  RepresentativeVariant,
} from './catalogueTypes';

// Parse a Storefront decimal-string amount into a number, defaulting a missing
// or malformed value to 0 so downstream math never yields NaN.
export function parseMoney(raw: RawMoney): Money {
  const amount = Number(raw.amount);
  return {
    amount: Number.isFinite(amount) ? amount : 0,
    currencyCode: raw.currencyCode,
  };
}

export function adaptImage(raw: RawImage | null): ProductImage | null {
  if (!raw) return null;
  return {
    url: raw.url,
    altText: raw.altText,
    width: raw.width,
    height: raw.height,
  };
}

export function adaptPageInfo(raw: RawPageInfo): PageInfo {
  return { hasNextPage: raw.hasNextPage, endCursor: raw.endCursor };
}

export function adaptVariant(raw: RawVariant): ProductVariant {
  return {
    id: raw.id,
    title: raw.title,
    sku: raw.sku,
    availableForSale: raw.availableForSale,
    price: parseMoney(raw.price),
    compareAtPrice: raw.compareAtPrice ? parseMoney(raw.compareAtPrice) : null,
    currentlyNotInStock: raw.currentlyNotInStock,
    selectedOptions: raw.selectedOptions.map((o) => ({ name: o.name, value: o.value })),
    image: adaptImage(raw.image),
  };
}

// Normalize the representative variant (selectedOrFirstAvailableVariant), or
// null when the product has no variant at all.
export function adaptRepresentativeVariant(
  raw: RawCardVariant | null
): RepresentativeVariant | null {
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.title,
    availableForSale: raw.availableForSale,
    price: parseMoney(raw.price),
    compareAtPrice: raw.compareAtPrice ? parseMoney(raw.compareAtPrice) : null,
  };
}

// Provable, displayable discount from a SINGLE variant: the representative
// variant's compare-at must exist, strictly exceed its own price, and share the
// same currency. This never uses priceRange vs compareAtPriceRange minima (which
// can come from different variants and falsely flag a sale). Returns the
// compare-at Money to display when on sale, else null.
export function representativeSaleCompareAt(
  rv: RepresentativeVariant | null
): Money | null {
  if (!rv || !rv.compareAtPrice) return null;
  const coherent = rv.compareAtPrice.currencyCode === rv.price.currencyCode;
  if (!coherent) return null;
  return rv.compareAtPrice.amount > rv.price.amount ? rv.compareAtPrice : null;
}

// Shared normalization of the fields common to card and detail products.
// `variants`/`hasVariantDetail` are filled in by the specific adapters.
function adaptProductBase(raw: RawProductCard): Omit<CatalogueProduct, 'variants' | 'hasVariantDetail' | 'defaultVariantId' | 'images'> {
  const minPrice = parseMoney(raw.priceRange.minVariantPrice);
  const representativeVariant = adaptRepresentativeVariant(raw.selectedOrFirstAvailableVariant);
  // Sale is proven from the representative variant only (same-variant, currency
  // coherent) — NOT from priceRange/compareAtPriceRange minima.
  const compareAtPrice = representativeSaleCompareAt(representativeVariant);
  const isOnSale = compareAtPrice !== null;

  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description,
    brand: raw.vendor,
    productType: raw.productType,
    tags: [...raw.tags],
    featuredImage: adaptImage(raw.featuredImage),
    minPrice,
    maxPrice: parseMoney(raw.priceRange.maxVariantPrice),
    compareAtPrice,
    isOnSale,
    availableForSale: raw.availableForSale,
    createdAt: raw.createdAt ?? null,
    // A count is trustworthy only at EXACT precision; AT_LEAST is a floor.
    variantCount: raw.variantsCount?.count ?? 0,
    variantCountExact: raw.variantsCount?.precision === 'EXACT',
    representativeVariant,
    updatedAt: raw.updatedAt ?? null,
  };
}

// List/search product: no per-variant detail queried.
export function adaptProductCard(raw: RawProductCard): CatalogueProduct {
  const base = adaptProductBase(raw);
  return {
    ...base,
    images: base.featuredImage ? [base.featuredImage] : [],
    variants: [],
    hasVariantDetail: false,
    defaultVariantId: null,
  };
}

// Product-detail: includes the image gallery and full variant list.
export function adaptProductDetail(raw: RawProductDetail): CatalogueProduct {
  const base = adaptProductBase(raw);
  const variants = raw.variants.nodes.map(adaptVariant);
  const images = raw.images.nodes.map(adaptImage).filter((i): i is ProductImage => i !== null);
  return {
    ...base,
    images: images.length > 0 ? images : base.featuredImage ? [base.featuredImage] : [],
    variants,
    hasVariantDetail: true,
    defaultVariantId: variants[0]?.id ?? null,
  };
}

// Normalize the custom.app_icon collection metafield into an app icon image, or
// null when it is unset/misconfigured. A valid remote icon requires a present
// MediaImage node with a non-empty HTTPS URL; anything else (missing metafield,
// null reference, non-MediaImage reference, blank or non-HTTPS URL) yields null
// so the tile falls back to the local icon registry. Never throws.
function adaptCollectionAppIcon(raw: RawCollection['appIcon']): ProductImage | null {
  const image = raw?.reference?.image;
  if (!image) return null;
  const url = typeof image.url === 'string' ? image.url.trim() : '';
  if (!/^https:\/\//i.test(url)) return null;
  return {
    url,
    altText: image.altText ?? null,
    width: image.width ?? null,
    height: image.height ?? null,
  };
}

// One resolved entry from a bulk GID lookup: the requested gid and its product,
// or null when the id was deleted/unpublished/not a Product. Callers use the
// null to prune stale persisted identities.
export interface ResolvedProductNode {
  gid: string;
  product: CatalogueProduct | null;
}

// Narrow a Node union member to a real Product node (has __typename 'Product'
// and the card fields). The `'handle' in node` check discriminates a Product
// from a bare `{ __typename }` element the union permits.
function isProductNode(node: RawNode): node is RawProductCard & { __typename: 'Product' } {
  return node !== null && node.__typename === 'Product' && 'handle' in node;
}

// Adapt a `nodes(ids:)` response, positionally aligned with the requested ids so
// the caller's order is preserved. Non-Product / null nodes become { product:
// null }. Never throws on a null element.
export function adaptProductNodes(
  ids: string[],
  nodes: RawNode[]
): ResolvedProductNode[] {
  return ids.map((gid, i) => {
    const node = nodes[i];
    if (isProductNode(node)) {
      return { gid, product: adaptProductCard(node) };
    }
    return { gid, product: null };
  });
}

export function adaptCollection(raw: RawCollection): CatalogueCollection {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description,
    image: adaptImage(raw.image),
    appIcon: adaptCollectionAppIcon(raw.appIcon),
  };
}
