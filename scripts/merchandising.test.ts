// Home merchandising contract tests (M41S8-FIX1).
//
// Guards the sale/featured collection handles, the Home rail order, and the
// invariant that "featured" makes no discount claim. Same style as
// purity.test.ts: Node's built-in runner, no framework, source-level assertions
// for the wiring that cannot be exercised without a React renderer.
//
// Run: node --test scripts/merchandising.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const home = read('app/(tabs)/index.tsx');
const promotions = read('app/promotions.tsx');
const shopifyIndex = read('src/shopify/index.ts');
const catalogue = read('src/shopify/catalogue.ts');
const categoryScreen = read('app/category/[categoryId].tsx');

// catalogue.ts cannot be imported here: it pulls in ./client at runtime, whose
// extensionless specifier Node's ESM resolver rejects (same reason purity.test.ts
// only imports type-erased modules). Read the exported literals from source.
function exportedConst(name: string): string {
  const m = catalogue.match(new RegExp(`export const ${name} = '([^']*)'`));
  assert.ok(m, `${name} must be an exported string literal in catalogue.ts`);
  return m[1];
}

// ── Central handles ──────────────────────────────────────────────────────────

test('sale collection handle is the live DC `promotion` collection', () => {
  assert.equal(exportedConst('SALE_COLLECTION_HANDLE'), 'promotion');
});

test('featured collection handle is `featured`', () => {
  assert.equal(exportedConst('FEATURED_COLLECTION_HANDLE'), 'featured');
});

test('both handles are exported from the public src/shopify boundary', () => {
  assert.match(shopifyIndex, /SALE_COLLECTION_HANDLE/);
  assert.match(shopifyIndex, /FEATURED_COLLECTION_HANDLE/);
});

test('no production reference to the dead `app-on-sale` handle remains', () => {
  for (const [name, src] of [
    ['catalogue.ts', catalogue],
    ['home', home],
    ['promotions', promotions],
  ] as const) {
    assert.doesNotMatch(
      src.replace(/^\s*\/\/.*$/gm, ''), // comments may narrate the migration
      /['"]app-on-sale['"]/,
      `${name} must not reference the app-on-sale handle`,
    );
  }
});

test('screens use the central constants, not duplicated string literals', () => {
  const stripComments = (s: string) => s.replace(/^\s*\/\/.*$/gm, '');
  for (const [name, src] of [['home', home], ['promotions', promotions]] as const) {
    assert.doesNotMatch(
      stripComments(src),
      /fetchCollectionProducts\(\s*['"]/,
      `${name} must pass a central handle constant, not a literal`,
    );
  }
  assert.match(home, /FEATURED_COLLECTION_HANDLE/);
  assert.match(home, /SALE_COLLECTION_HANDLE/);
  assert.match(promotions, /SALE_COLLECTION_HANDLE/);
});

// ── Home section order ───────────────────────────────────────────────────────

test('Home rails render in order: New Arrivals, Featured Products, On Sale, Recently Viewed', () => {
  const order = ['New Arrivals', 'Featured Products', 'On Sale', 'Recently Viewed'].map((t) => ({
    title: t,
    at: home.indexOf(`title="${t}"`),
  }));
  for (const o of order) {
    assert.ok(o.at > 0, `Home must render a rail titled "${o.title}"`);
  }
  for (let i = 1; i < order.length; i++) {
    assert.ok(
      order[i - 1].at < order[i].at,
      `"${order[i - 1].title}" must render before "${order[i].title}"`,
    );
  }
});

test('Recently Viewed stays conditional on hydrated, resolved, non-empty history', () => {
  assert.match(home, /showRecent\s*&&\s*<ProductRail title="Recently Viewed"/);
  assert.match(home, /recentHydrated\s*&&/);
});

// ── Featured rail semantics ──────────────────────────────────────────────────

test('Featured rail fetches the featured collection via the central handle', () => {
  assert.match(home, /fetchCollectionProducts\(\s*FEATURED_COLLECTION_HANDLE/);
});

// Isolate the featured loader so assertions cannot accidentally read the On Sale
// block that follows it.
const featuredStart = home.indexOf('// Featured Products');
const featuredEnd = home.indexOf('// On Sale');
const featuredBlock = home.slice(featuredStart, featuredEnd);

test('Featured rail does not apply the sale guard (featured is not a discount claim)', () => {
  assert.ok(featuredStart >= 0 && featuredEnd > featuredStart, 'featured loader block must be locatable');
  assert.doesNotMatch(featuredBlock, /isOnSale/);
});

test('Featured rail preserves Shopify collection order — no local sort', () => {
  assert.doesNotMatch(featuredBlock, /\.sort\(/);
  assert.doesNotMatch(featuredBlock, /\.reverse\(/);
  assert.match(featuredBlock, /return page\.items;/);
});

test('Featured rail has no mock or New Arrivals fallback', () => {
  assert.doesNotMatch(featuredBlock, /fetchNewArrivals/);
  assert.doesNotMatch(featuredBlock, /mock|MOCK|placeholder/);
  assert.doesNotMatch(featuredBlock, /\?\?\s*\[/); // no silent substitute list
});

test('Featured "See All" routes to the featured category page', () => {
  const seeAll = home.slice(home.indexOf('title="Featured Products"'), home.indexOf('{/* On sale */}'));
  assert.match(seeAll, /pathname:\s*'\/category\/\[categoryId\]'/);
  assert.match(seeAll, /categoryId:\s*FEATURED_COLLECTION_HANDLE/);
});

// ── Sale guard still enforced everywhere ─────────────────────────────────────

test('Home On Sale still applies the isOnSale guard', () => {
  const saleBlock = home.slice(home.indexOf('// On Sale'), home.indexOf('const columns'));
  assert.match(saleBlock, /\.filter\(\(p\)\s*=>\s*p\.isOnSale\)/);
});

test('Promotions still applies the isOnSale guard', () => {
  assert.match(promotions, /\.filter\(\(p\)\s*=>\s*p\.isOnSale\)/);
});

test('Home On Sale slices to the rail limit rather than capping the fetch', () => {
  assert.match(home, /SALE_FETCH_COUNT\s*=\s*30/);
  assert.match(home, /slice\(0,\s*SALE_RAIL_COUNT\)/);
});

// ── Pagination not regressed ─────────────────────────────────────────────────

test('Promotions keeps cursor pagination and product-type filters', () => {
  assert.match(promotions, /usePagedData</);
  assert.match(promotions, /after:\s*cursor/);
  assert.match(promotions, /hasNextPage:\s*page\.pageInfo\.hasNextPage/);
  assert.match(promotions, /p\.productType === activeFilter/);
});

test('Category screen keeps 24-per-page cursor paging and sort-driven reset', () => {
  assert.match(categoryScreen, /PAGE_SIZE\s*=\s*24/);
  assert.match(categoryScreen, /after:\s*cursor/);
  // `sort` in the deps array is what resets items+cursor on a sort change.
  assert.match(categoryScreen, /\}, \[handle, sort\]\)/);
});

test('Home requests collections well past the 20 it displays (no first-page cap)', () => {
  assert.match(home, /fetchCollections\(\{\s*first:\s*50\s*\}\)/);
});

test('category count text reports loaded items, not a Shopify total', () => {
  assert.match(categoryScreen, /const count = items\.length/);
});

// ── No regressions in identity, data source, or branding ─────────────────────

test('no mock catalogue fallback is introduced on merchandising screens', () => {
  for (const [name, src] of [['home', home], ['promotions', promotions]] as const) {
    assert.doesNotMatch(src, /src\/data/, `${name} must not import mock data`);
  }
});

test('no old DMV Shopify domain is referenced in source', () => {
  for (const [name, src] of [
    ['home', home],
    ['promotions', promotions],
    ['catalogue.ts', catalogue],
    ['src/shopify/index.ts', shopifyIndex],
  ] as const) {
    assert.doesNotMatch(src, /dmvnailsupply/i, `${name} must not reference the DMV store domain`);
  }
});

test('merchandising collections stay out of Shop by Category', () => {
  const filter = read('components/collections/collectionFilter.ts');
  for (const handle of ['featured', 'promotion', 'new-arrival', 'all-products']) {
    assert.match(filter, new RegExp(`'${handle}'`), `${handle} must remain denylisted`);
  }
});
