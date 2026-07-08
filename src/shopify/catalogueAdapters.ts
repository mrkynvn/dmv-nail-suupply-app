// Raw-Storefront → app-model normalizers (M41S2A).
//
// Pure functions: no network, no cache, no side effects. They convert the raw
// GraphQL shapes in catalogueQueries.ts into the app-facing catalogue types.
// Keeping this layer pure makes the fetch helpers in catalogue.ts trivial and
// keeps GraphQL-specific quirks (string money, price ranges) out of the app.

import type {
  RawCollection,
  RawImage,
  RawMoney,
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
    quantityAvailable: raw.quantityAvailable,
    currentlyNotInStock: raw.currentlyNotInStock,
    selectedOptions: raw.selectedOptions.map((o) => ({ name: o.name, value: o.value })),
    image: adaptImage(raw.image),
  };
}

// Shared normalization of the fields common to card and detail products.
// `variants`/`hasVariantDetail` are filled in by the specific adapters.
function adaptProductBase(raw: RawProductCard): Omit<CatalogueProduct, 'variants' | 'hasVariantDetail' | 'defaultVariantId' | 'images'> {
  const minPrice = parseMoney(raw.priceRange.minVariantPrice);
  const compareAtMin = parseMoney(raw.compareAtPriceRange.minVariantPrice);
  // A genuine discount: a compare-at price that exceeds the selling price.
  // Shopify returns 0 for compare-at when none is set, so `>` guards both cases.
  const isOnSale = compareAtMin.amount > minPrice.amount;

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
    compareAtPrice: isOnSale ? compareAtMin : null,
    isOnSale,
    availableForSale: raw.availableForSale,
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

export function adaptCollection(raw: RawCollection): CatalogueCollection {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description,
    image: adaptImage(raw.image),
  };
}
