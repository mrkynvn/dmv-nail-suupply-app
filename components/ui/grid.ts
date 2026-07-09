// Responsive grid math for touched catalogue screens (M41S2B2).
//
// Column counts scale with window width so phones, large phones, and iPad all
// get sensible layouts. `gridItemWidth` returns a fixed per-item width for an
// evenly-spaced wrap/grid, so trailing rows do not stretch their items.

// Product-type collection tiles on the Categories tab and product cards on the
// category detail grid share the same breakpoints.
export function categoryTileColumns(width: number): number {
  if (width >= 900) return 4;
  if (width >= 600) return 3;
  return 2;
}

export function productGridColumns(width: number): number {
  if (width >= 900) return 4;
  if (width >= 600) return 3;
  return 2;
}

// The compact Home "Shop by Category" row packs more tiles per row.
export function homeCategoryColumns(width: number): number {
  if (width >= 900) return 8;
  if (width >= 600) return 6;
  return 4;
}

export function gridItemWidth(
  containerWidth: number,
  columns: number,
  horizontalPadding: number,
  gap: number
): number {
  const available = containerWidth - horizontalPadding * 2 - gap * (columns - 1);
  return Math.floor(available / columns);
}
