// Local category icon registry for collection tiles (M41S5A).
//
// Maps live Shopify collection HANDLES (not localized titles) to bundled
// PNG icons from the DMV Nail Supply Category Icon System (assets/png/).
//
// Bundle rule: only the icons actually used by the live collection mappings
// (plus one generic fallback) are require()d here. The rest of the 49-icon
// library stays versioned in Git for future use but is NOT referenced by
// runtime code, so Metro will not bundle it. All require() calls must stay
// LITERAL static paths — no dynamic/interpolated requires.
//
// SVG sources in assets/category-icons/ are design masters only; the app
// renders the 512x512 transparent PNGs (no SVG runtime dependency).

import type { ImageRequireSource } from 'react-native';

// Icons required at runtime (13 of 49). Keys are icon-library file names.
const ICONS = {
  acrylic: require('../../assets/png/acrylic.png'),
  buffer: require('../../assets/png/buffer.png'),
  'builder-gel': require('../../assets/png/builder-gel.png'),
  'dip-powder': require('../../assets/png/dip-powder.png'),
  disposable: require('../../assets/png/disposable.png'),
  essentials: require('../../assets/png/essentials.png'),
  'gel-polish': require('../../assets/png/gel-polish.png'),
  'gel-x': require('../../assets/png/gel-x.png'),
  'led-lamp': require('../../assets/png/led-lamp.png'),
  'nail-tips': require('../../assets/png/nail-tips.png'),
  pedicure: require('../../assets/png/pedicure.png'),
  primer: require('../../assets/png/primer.png'),
  towels: require('../../assets/png/towels.png'),
} as const satisfies Record<string, ImageRequireSource>;

type IconKey = keyof typeof ICONS;

// Live Shopify collection handle -> icon key. Handles are the exact strings
// returned by the Storefront API (including the real store typo
// "diposables" — do not "fix" it here or the mapping breaks).
const HANDLE_TO_ICON: Record<string, IconKey> = {
  // Specific icons
  'gel-polish': 'gel-polish',
  'gel-x': 'gel-x',
  towels: 'towels',
  'acrylic-liquid': 'acrylic',
  'builder-gels': 'builder-gel',
  dipping: 'dip-powder',
  diposables: 'disposable',
  'buffers-files-pumices': 'buffer',
  'base-top-bonder-primer': 'primer',
  'nail-tips-glue': 'nail-tips',
  'pedicure-paraffin': 'pedicure',
  'nail-machines-lamps': 'led-lamp',
  'glove-mask': 'disposable',
  // Generic (essentials) icon
  'accessories-books-charts': 'essentials',
  eyelashes: 'essentials',
  'fullset-4-in-1': 'essentials',
  'nail-tools': 'essentials',
  treatments: 'essentials',
  waxing: 'essentials',
};

// Neutral fallback for unmapped, unknown, or blank handles.
export const DEFAULT_CATEGORY_ICON: ImageRequireSource = ICONS.essentials;

// Resolve a collection handle to a bundled icon. Never throws; unknown or
// blank handles get the neutral fallback. Handles are trimmed and lowercased
// defensively (Shopify handles are already lowercase kebab-case).
export function getLocalCategoryIcon(handle: string): ImageRequireSource {
  const normalized = typeof handle === 'string' ? handle.trim().toLowerCase() : '';
  if (!normalized) {
    return DEFAULT_CATEGORY_ICON;
  }
  const iconKey = HANDLE_TO_ICON[normalized];
  return iconKey ? ICONS[iconKey] : DEFAULT_CATEGORY_ICON;
}
