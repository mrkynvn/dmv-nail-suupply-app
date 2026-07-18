// Pure/static unit tests for the Shopify-only migration (M41S6E).
//
// No test framework dependency: uses Node's built-in test runner + native TS
// type-stripping. The modules under test import only types at runtime (erased),
// so they load directly by path.
//
// Run: node --test scripts/purity.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { catalogueProductToCardModel } from '../components/products/productCardModel.ts';
import {
  representativeSaleCompareAt,
  adaptProductNodes,
  adaptProductCard,
} from '../src/shopify/catalogueAdapters.ts';
import { NEW_ARRIVALS_QUERY } from '../src/shopify/catalogueQueries.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const usd = (n) => ({ amount: n, currencyCode: 'USD' });

function makeRV(over = {}) {
  return {
    id: 'gid://shopify/ProductVariant/1',
    title: 'Default Title',
    availableForSale: true,
    price: usd(10),
    compareAtPrice: null,
    ...over,
  };
}

function makeProduct(over = {}) {
  return {
    id: 'gid://shopify/Product/1',
    handle: 'test-handle',
    title: 'Test Product',
    description: '',
    brand: 'Test Brand',
    productType: 'Gel',
    tags: [],
    featuredImage: { url: 'https://cdn.example/x.png', altText: 'alt', width: 100, height: 100 },
    images: [],
    minPrice: usd(10),
    maxPrice: usd(10),
    compareAtPrice: null,
    isOnSale: false,
    availableForSale: true,
    createdAt: '2026-07-14T00:00:00Z',
    variantCount: 1,
    variantCountExact: true,
    representativeVariant: makeRV(),
    variants: [],
    hasVariantDetail: false,
    defaultVariantId: null,
    updatedAt: null,
    ...over,
  };
}

function makeRawCard(id, handle, over = {}) {
  return {
    id,
    handle,
    title: `T ${handle}`,
    description: '',
    vendor: 'V',
    productType: 'Gel',
    tags: [],
    availableForSale: true,
    createdAt: '2026-07-14T00:00:00Z',
    updatedAt: '2026-07-14T00:00:00Z',
    featuredImage: null,
    variantsCount: { count: 1, precision: 'EXACT' },
    selectedOrFirstAvailableVariant: {
      id: `${id}/v1`,
      title: 'Default Title',
      availableForSale: true,
      price: usd(5),
      compareAtPrice: null,
    },
    priceRange: { minVariantPrice: usd(5), maxVariantPrice: usd(5) },
    compareAtPriceRange: { minVariantPrice: usd(0), maxVariantPrice: usd(0) },
    ...over,
  };
}

// ── Quick Add eligibility ─────────────────────────────────────────────────────

test('exact single available variant → Quick Add adds', () => {
  const m = catalogueProductToCardModel(makeProduct());
  assert.equal(m.quickAdd.kind, 'add');
  if (m.quickAdd.kind === 'add') {
    assert.equal(m.quickAdd.line.variantId, 'gid://shopify/ProductVariant/1');
    assert.equal(m.quickAdd.line.unitPrice, 10);
    assert.equal(m.quickAdd.line.currencyCode, 'USD');
  }
});

test('multi-variant (exact count 2) → open detail', () => {
  const m = catalogueProductToCardModel(
    makeProduct({ variantCount: 2, variantCountExact: true }),
  );
  assert.equal(m.quickAdd.kind, 'openDetail');
});

test('uncertain variant count (AT_LEAST) → open detail, never add', () => {
  const m = catalogueProductToCardModel(
    makeProduct({ variantCount: 1, variantCountExact: false }),
  );
  assert.equal(m.quickAdd.kind, 'openDetail');
});

test('unavailable representative variant → disabled', () => {
  const m = catalogueProductToCardModel(
    makeProduct({ representativeVariant: makeRV({ availableForSale: false }) }),
  );
  assert.equal(m.quickAdd.kind, 'disabled');
});

test('no representative variant → disabled', () => {
  const m = catalogueProductToCardModel(makeProduct({ representativeVariant: null }));
  assert.equal(m.quickAdd.kind, 'disabled');
});

// ── Sale semantics (same-variant only) ────────────────────────────────────────

test('same-variant valid sale is detected', () => {
  const r = representativeSaleCompareAt(makeRV({ price: usd(4.5), compareAtPrice: usd(6.5) }));
  assert.deepEqual(r, usd(6.5));
});

test('compare-at null → not on sale', () => {
  assert.equal(representativeSaleCompareAt(makeRV({ compareAtPrice: null })), null);
});

test('compare-at <= price → not on sale', () => {
  assert.equal(representativeSaleCompareAt(makeRV({ price: usd(5), compareAtPrice: usd(5) })), null);
  assert.equal(representativeSaleCompareAt(makeRV({ price: usd(5), compareAtPrice: usd(4) })), null);
});

test('currency mismatch → not on sale (safety)', () => {
  const r = representativeSaleCompareAt(
    makeRV({ price: usd(5), compareAtPrice: { amount: 9, currencyCode: 'EUR' } }),
  );
  assert.equal(r, null);
});

test('range-based false sale is NOT used (adapter)', () => {
  // Range would falsely flag a sale (compareAt min 10 > price min 5) but the
  // representative variant has no compare-at, so isOnSale must be false.
  const p = adaptProductCard(
    makeRawCard('gid://shopify/Product/9', 'range-trap', {
      compareAtPriceRange: { minVariantPrice: usd(10), maxVariantPrice: usd(30) },
    }),
  );
  assert.equal(p.isOnSale, false);
  assert.equal(p.compareAtPrice, null);
});

// ── Bulk GID resolution ───────────────────────────────────────────────────────

test('deleted / non-Product GIDs resolve as missing, order preserved', () => {
  const ids = ['gid://shopify/Product/1', 'gid://shopify/Product/2', 'gid://shopify/Product/3'];
  const nodes = [
    { __typename: 'Product', ...makeRawCard('gid://shopify/Product/1', 'handle-1') },
    null, // deleted
    { __typename: 'Collection' }, // wrong type
  ];
  const res = adaptProductNodes(ids, nodes);
  assert.equal(res.length, 3);
  assert.deepEqual(res.map((r) => r.gid), ids);
  assert.equal(res[0].product?.handle, 'handle-1');
  assert.equal(res[1].product, null);
  assert.equal(res[2].product, null);
});

// ── New Arrivals ordering contract ────────────────────────────────────────────

test('New Arrivals query fixes CREATED_AT desc ordering', () => {
  assert.match(NEW_ARRIVALS_QUERY, /sortKey:\s*CREATED_AT/);
  assert.match(NEW_ARRIVALS_QUERY, /reverse:\s*true/);
});

// ── ProductCard presentation purity ───────────────────────────────────────────

test('ProductCard imports no data layer, favorites, or cart', () => {
  const src = readFileSync(join(repoRoot, 'components/products/ProductCard.tsx'), 'utf8');
  assert.doesNotMatch(src, /src\/data/, 'ProductCard must not import src/data');
  assert.doesNotMatch(src, /useFavorites/, 'ProductCard must not use useFavorites');
  assert.doesNotMatch(src, /useCart/, 'ProductCard must not use useCart');
});
