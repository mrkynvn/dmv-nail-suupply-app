// Static no-mock proof (M41S6E / Gate C7).
//
// Fails (exit 1) if any customer-facing app/ or components/ source still
// references the removed mock product system. Runtime-only scan of .ts/.tsx.
//
// Run: node scripts/check-no-mock.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['app', 'components'];

// Each rule flags a line that matches `test` (unless `allow` also matches it).
const RULES = [
  { name: 'placeholder-sentinel', test: /placeholder:/ },
  { name: 'mock-product-id', test: /\bp-0\d{2}\b/ },
  { name: 'source-eq-mock', test: /source\s*===\s*['"]mock['"]/ },
  { name: 'source-literal-mock', test: /source\s*:\s*['"]mock['"]/ },
  { name: 'MockCartItem', test: /\bMockCartItem\b/ },
  { name: 'mock-line-key', test: /['"]mock:/ },
  { name: 'getProductById', test: /\bgetProductById\b/ },
  { name: 'getFeaturedProducts', test: /\bgetFeaturedProducts\b/ },
  { name: 'getOnSaleProducts', test: /\bgetOnSaleProducts\b/ },
  { name: 'searchProducts (mock)', test: /\bsearchProducts\b/ },
  { name: 'src/data import', test: /from\s+['"][^'"]*src\/data/ },
  // Mock deep link: /product/${...} that is NOT the Shopify handle route.
  { name: 'mock-product-route', test: /\/product\/\$\{/, allow: /shopify/ },
  { name: 'mock-product-route-literal', test: /\/product\/p-/, allow: /shopify/ },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];
for (const d of SCAN_DIRS) {
  for (const file of walk(join(repoRoot, d))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const rule of RULES) {
        if (rule.test.test(line) && !(rule.allow && rule.allow.test(line))) {
          violations.push(`${relative(repoRoot, file)}:${i + 1} [${rule.name}] ${line.trim()}`);
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`NO-MOCK PROOF FAILED — ${violations.length} violation(s):`);
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
}
console.log('NO-MOCK PROOF PASSED — no mock product references in app/ or components/.');
