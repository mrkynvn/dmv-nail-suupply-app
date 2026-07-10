# DMV Nail Supply — Category Icon System

**Version 1.0**

A single, cohesive icon family built for the DMV Nail Supply iOS app (iPhone + iPad).
Designed as one flat, line-based system — one stroke weight, one corner radius, one
optical rhythm — so it reads cleanly beside Apple SF Symbols.

---

## Contents

- **49 icons** total
  - Products — 20
  - Tools — 13
  - Salon — 6
  - Shop — 10

### Folder structure

```
DMV-Nail-Supply-Icon-System/
├── SVG/          49 vector icons (scalable, editable)
├── PNG-512/      49 transparent PNGs, 512 × 512
├── Preview/
│   ├── icon-system-light.png
│   ├── icon-system-dark.png
│   └── icon-system.pdf
└── README.md
```

---

## Naming convention

All files use **kebab-case**, matched exactly across the SVG and PNG folders:

```
acrylic.svg            /  acrylic.png
gel-polish.svg         /  gel-polish.png
builder-gel.svg        /  builder-gel.png
professional-only.svg  /  professional-only.png
```

Recommended in-code token: `icon.<name>` (e.g. `icon.gel-polish`). New icons
should follow the same pattern so the system stays predictable.

---

## Color palette

| Role            | Name      | Hex       | Usage |
|-----------------|-----------|-----------|-------|
| Primary         | DMV Navy  | `#0B1F4B` | All icon linework (monochrome by default) |
| Accent          | DMV Gold  | `#D4AF37` | Sparingly — a single highlight per icon where it adds meaning |
| Dark-mode ink   | Warm White| `#EDEBE4` | Icon linework on dark surfaces |

Most icons are fully monochrome. Gold appears only where it earns attention
(e.g. Base Coat indicator, Top Coat shine, Best Seller star, Gift Card bow,
LED Lamp diodes).

---

## Icon specifications

- **Canvas:** 512 × 512, transparent background
- **Safe area:** ~70% of the canvas, centered
- **Stroke:** 22px, `round` caps and joins, single consistent weight
- **Style:** flat vector — no gradients, shadows, bevels, or 3D
- **Perspective:** front view only

---

## Recommended usage

- **Minimum size:** legible at 24px; render targets of 32–48px recommended for
  category tiles and list rows.
- **Color:** apply via `currentColor` or template tint — the SVGs default to
  DMV Navy; swap the stroke to `#EDEBE4` for dark mode. Keep gold accents intact.
- **Spacing:** preserve the built-in safe-area padding; do not crop to the artwork.
- **Do not:** re-color into multiple hues, add shadows/gradients, rotate, or mix
  with icons from other families.
- **Extending the set:** reuse the 512 grid, 22px round stroke, and the same
  corner radii. Introduce gold only as a single functional highlight.

---

## License

© 2026 DMV Nail Supply. Proprietary — for use within DMV Nail Supply digital
products and marketing only. Not for redistribution or resale as a standalone
icon pack.

---

*Category Icon System v1.0 — one designer, one visual language.*
