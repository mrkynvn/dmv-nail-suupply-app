// Shopify product detail route, keyed by product handle (M41S2E1/E3, M41S6E,
// M41S6E-FIX1).
//
// The sole product detail route in the app. Reached from every product surface
// (Home, Search, Promotions, Favorites, Recently Viewed, category listing). It
// hydrates from the catalogue cache, refreshes via fetchProductByHandle, and
// renders an explicit variant selector whenever the product has more than one
// variant (defaulting to the resolved default variant). Add to Cart adds a
// fully denormalized line for the SELECTED variant to the LOCAL Shopify cart
// via CartContext.addShopifyLine — no Shopify Cart API, checkout, or payment
// here. The button enables only for an available selected variant. A
// successful resolve records Recently Viewed (v2) and the header favorite
// toggles by product GID.

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  fetchProductByHandle,
  getCachedProductByHandle,
} from '../../../src/shopify';
import type {
  CatalogueProduct,
  Money,
  ProductImage,
  ProductVariant,
} from '../../../src/shopify';
import { LoadingState, ErrorState } from '../../../components/ui/AsyncStates';
import { useCart } from '../../../src/cart/CartContext';
import type { ShopifyCartLineInput } from '../../../src/cart/CartContext';
import { useFavorites } from '../../../src/favorites/FavoritesContext';
import { useRecentlyViewed } from '../../../src/recentlyViewed/RecentlyViewedContext';

const PINK = '#D81B60';

// A variant's chosen option values, keyed by option name (e.g. { Size: '8oz' }).
type SelectedOptions = Record<string, string>;

function variantSelectedOptions(v: ProductVariant): SelectedOptions {
  const out: SelectedOptions = {};
  for (const o of v.selectedOptions) out[o.name] = o.value;
  return out;
}

function variantMatchesSelection(v: ProductVariant, selection: SelectedOptions): boolean {
  return v.selectedOptions.every((o) => selection[o.name] === o.value);
}

// One entry per option name that actually varies across this product's
// variants (e.g. "Size", "Color"), in first-seen order, with every distinct
// value observed. Option names with only one possible value are omitted —
// there is nothing to choose.
function buildOptionGroups(variants: ProductVariant[]): { name: string; values: string[] }[] {
  const order: string[] = [];
  const valuesByName = new Map<string, string[]>();
  for (const v of variants) {
    for (const o of v.selectedOptions) {
      if (!valuesByName.has(o.name)) {
        valuesByName.set(o.name, []);
        order.push(o.name);
      }
      const values = valuesByName.get(o.name)!;
      if (!values.includes(o.value)) values.push(o.value);
    }
  }
  return order
    .map((name) => ({ name, values: valuesByName.get(name)! }))
    .filter((g) => g.values.length > 1);
}

// Currency-aware price string. USD (the store's currency) reads as "$12.00";
// anything else falls back to "12.00 EUR" so the code is never dropped silently.
function formatMoney(m: Money): string {
  const amount = m.amount.toFixed(2);
  return m.currencyCode === 'USD' ? `$${amount}` : `${amount} ${m.currencyCode}`;
}

// One gallery image with its own load-error fallback, so a broken URL shows the
// neutral placeholder instead of a blank frame. Sized to the screen width by
// the parent gallery.
function GalleryImage({
  image,
  width,
  height,
}: {
  image: ProductImage;
  width: number;
  height: number;
}) {
  const [errored, setErrored] = useState(false);
  const label =
    image.altText && image.altText.trim().length > 0 ? image.altText : 'Product image';

  if (errored) {
    return <View style={[styles.imagePlaceholder, { width, height }]} />;
  }
  return (
    <Image
      source={{ uri: image.url }}
      style={[styles.galleryImage, { width, height }]}
      resizeMode="cover"
      onError={() => setErrored(true)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    />
  );
}

export default function ShopifyProductDetailScreen() {
  // Route key is the Shopify product *handle* (see app/category/[categoryId].tsx).
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { width } = useWindowDimensions();
  const { addShopifyLine } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { recordRecentlyViewed } = useRecentlyViewed();

  // Local quantity (never below 1) and a transient "added" confirmation.
  const [qty, setQty] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    []
  );

  // Hydrate immediately from the in-memory catalogue cache (populated when the
  // category grid rendered this product's card), then refresh with full detail.
  const [product, setProduct] = useState<CatalogueProduct | null>(
    () => (handle ? getCachedProductByHandle(handle) ?? null : null)
  );
  const [loading, setLoading] = useState(() => !product);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  // Bumped by Retry to re-run the fetch effect.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!handle) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setError(null);
    setNotFound(false);
    (async () => {
      try {
        const fetched = await fetchProductByHandle(handle);
        if (cancelled) return;
        if (!fetched) {
          setNotFound(true);
        } else {
          setProduct(fetched);
          // Record in Recently Viewed only after a successful Shopify resolve,
          // using the fresh GID + handle (Recently Viewed v2 identity).
          recordRecentlyViewed({ gid: fetched.id, handle: fetched.handle });
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, reloadKey]);

  const retry = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // Which variant is currently chosen, by option name/value. Re-initialized to
  // the default variant's own options whenever `product` is (re)set — the
  // cache-hydrated product (no variant detail yet) yields an empty selection,
  // then the full-detail fetch replaces it with the real default.
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});
  useEffect(() => {
    if (!product) return;
    const initial =
      product.hasVariantDetail && product.defaultVariantId
        ? product.variants.find((v) => v.id === product.defaultVariantId) ?? product.variants[0]
        : product.variants[0];
    setSelectedOptions(initial ? variantSelectedOptions(initial) : {});
  }, [product]);

  // Header shared by the fallback states so Back is always available. Matches the
  // category header (icon + hitSlop).
  const header = (title: string) => (
    <View style={styles.header}>
      <Pressable
        style={styles.backBtn}
        onPress={() => router.back()}
        // Icon is visually small; extend the touch target toward 44pt
        // (matches the category screen).
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={PINK} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );

  // Fallback states — only when there is nothing cached to show. If a cached
  // copy exists we keep rendering it even if a refresh fails (stale but usable).
  if (!product) {
    if (loading) {
      return (
        <SafeAreaView style={styles.safeArea}>
          {header('Loading…')}
          <LoadingState label="Loading product…" />
        </SafeAreaView>
      );
    }
    if (error) {
      return (
        <SafeAreaView style={styles.safeArea}>
          {header('Product')}
          <ErrorState message={error} onRetry={retry} />
        </SafeAreaView>
      );
    }
    // notFound, or a missing handle.
    return (
      <SafeAreaView style={styles.safeArea}>
        {header('Product')}
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Product not found</Text>
          <Pressable style={styles.notFoundBack} onPress={() => router.back()}>
            <Text style={styles.notFoundBackText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // The variant matching the current option selection. Present once detail has
  // been fetched and the selection resolves to a real variant; null during the
  // brief cache-only window, or if the chosen combination has no matching
  // variant (only possible for stores with a sparse, non-full option matrix).
  const selectedVariant = product.hasVariantDetail
    ? product.variants.find((v) => variantMatchesSelection(v, selectedOptions)) ?? null
    : null;

  // Option groups to present as a picker — only for products with more than one
  // real variant. Single-variant products (incl. Shopify's implicit "Default
  // Title" variant) never render a picker.
  const optionGroups =
    product.hasVariantDetail && product.variants.length > 1
      ? buildOptionGroups(product.variants)
      : [];

  // Availability keys off the selected variant once detail is loaded; before the
  // refresh completes (or for an unmatched combination) we fall back to the
  // card-level flag / treat as out of stock.
  const outOfStock = product.hasVariantDetail
    ? !(selectedVariant?.availableForSale ?? false)
    : !product.availableForSale;

  // Prefer the selected variant's own price; fall back to the product's min
  // price for the brief cache-only window before detail arrives.
  const price = selectedVariant?.price ?? product.minPrice;
  const compareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const showCompare = compareAt != null && compareAt.amount > price.amount;

  const gallery = product.images.length > 0 ? product.images : [];
  const imageWidth = width;
  const imageHeight = 320;

  // Add to Cart is enabled only when a purchasable variant is selected. No
  // matched variant (incl. the brief cache-only window, or an unavailable
  // option combination) or an unavailable one keeps it disabled.
  const canAddToCart = selectedVariant != null && selectedVariant.availableForSale;

  // Image for the cart line: prefer the selected variant's own image, then the
  // product's featured image, then the first gallery image.
  const lineImageUrl =
    selectedVariant?.image?.url ??
    product.featuredImage?.url ??
    gallery[0]?.url ??
    undefined;

  // Shopify's implicit single variant is titled "Default Title"; only surface a
  // variant title when it carries real option info.
  const variantTitle =
    selectedVariant && selectedVariant.title.trim().length > 0 &&
    selectedVariant.title !== 'Default Title'
      ? selectedVariant.title
      : undefined;

  const handleAddToCart = () => {
    if (!canAddToCart || !selectedVariant) return;
    const line: ShopifyCartLineInput = {
      variantId: selectedVariant.id,
      productId: product.id,
      handle: product.handle,
      title: product.title,
      unitPrice: selectedVariant.price.amount,
      currencyCode: selectedVariant.price.currencyCode,
      availableForSale: selectedVariant.availableForSale,
      ...(product.brand.trim().length > 0 ? { vendor: product.brand } : {}),
      ...(lineImageUrl ? { imageUrl: lineImageUrl } : {}),
      ...(variantTitle ? { variantTitle } : {}),
    };
    addShopifyLine(line, qty);
    setShowConfirm(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setShowConfirm(false), 2000);
  };

  const favorited = isFavorite(product.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Content header: back + title + favorite (by Shopify GID). */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={PINK} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.title}
        </Text>
        <Pressable
          style={styles.heartBtn}
          onPress={() => toggleFavorite({ gid: product.id, handle: product.handle })}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={
            favorited
              ? `Remove ${product.title} from favorites`
              : `Add ${product.title} to favorites`
          }
          accessibilityState={{ selected: favorited }}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={24}
            color={favorited ? PINK : '#999'}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image gallery — horizontal paging when more than one image. */}
        {gallery.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled={gallery.length > 1}
            showsHorizontalScrollIndicator={false}
          >
            {gallery.map((img, i) => (
              <GalleryImage
                key={`${img.url}-${i}`}
                image={img}
                width={imageWidth}
                height={imageHeight}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.imagePlaceholder, { width: imageWidth, height: imageHeight }]} />
        )}

        {/* Badges */}
        <View style={styles.badgeRow}>
          {product.isOnSale && (
            <View style={styles.badgeSale}>
              <Text style={styles.badgeSaleText}>Sale</Text>
            </View>
          )}
          {outOfStock && (
            <View style={styles.badgeOutOfStock}>
              <Text style={styles.badgeOutOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Identity */}
        <View style={styles.identitySection}>
          {product.brand.trim().length > 0 && (
            <Text style={styles.brand}>{product.brand}</Text>
          )}
          <Text style={styles.name}>{product.title}</Text>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, showCompare && styles.priceSale]}>
              {formatMoney(price)}
            </Text>
            {showCompare && compareAt != null && (
              <Text style={styles.originalPrice}>{formatMoney(compareAt)}</Text>
            )}
          </View>
          {outOfStock ? (
            <Text style={styles.outOfStockLabel}>Out of Stock</Text>
          ) : (
            <Text style={styles.inStock}>In Stock</Text>
          )}
        </View>

        {/* Variant selector — only for products with more than one real
            variant. Selecting an option updates price/availability/Add to Cart
            above and below via `selectedVariant`. */}
        {optionGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options</Text>
            {optionGroups.map((group) => (
              <View key={group.name} style={styles.optionGroup}>
                <Text style={styles.optionGroupLabel}>{group.name}</Text>
                <View style={styles.optionChipsRow}>
                  {group.values.map((value) => {
                    const active = selectedOptions[group.name] === value;
                    return (
                      <Pressable
                        key={value}
                        style={[styles.optionChip, active && styles.optionChipActive]}
                        onPress={() =>
                          setSelectedOptions((prev) => ({ ...prev, [group.name]: value }))
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${group.name}: ${value}`}
                        accessibilityState={{ selected: active }}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            active && styles.optionChipTextActive,
                          ]}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            {!selectedVariant && (
              <Text style={styles.optionUnavailableText}>
                This combination is unavailable.
              </Text>
            )}
          </View>
        )}

        {/* Description */}
        {product.description.trim().length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsRow}>
              {product.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.buttonSpacer} />
      </ScrollView>

      {/* Add to Cart bar (M41S2E3, M41S6E-FIX1). Adds a denormalized line to
          the LOCAL cart via CartContext.addShopifyLine — no Shopify Cart API
          or checkout. Only enabled for an available selected variant. */}
      <View style={styles.cartBar}>
        {/* Quantity selector */}
        <View style={styles.quantityRow}>
          <Pressable
            style={[styles.qtyBtn, (qty <= 1 || !canAddToCart) && styles.qtyBtnDisabled]}
            onPress={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1 || !canAddToCart}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
            accessibilityState={{ disabled: qty <= 1 || !canAddToCart }}
          >
            <Text
              style={[
                styles.qtyBtnText,
                (qty <= 1 || !canAddToCart) && styles.qtyBtnTextDisabled,
              ]}
            >
              −
            </Text>
          </Pressable>
          <Text style={styles.qtyValue}>{qty}</Text>
          <Pressable
            style={[styles.qtyBtn, !canAddToCart && styles.qtyBtnDisabled]}
            onPress={() => setQty((q) => q + 1)}
            disabled={!canAddToCart}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            accessibilityState={{ disabled: !canAddToCart }}
          >
            <Text style={[styles.qtyBtnText, !canAddToCart && styles.qtyBtnTextDisabled]}>
              +
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.cartButton, !canAddToCart && styles.cartButtonDisabled]}
          disabled={!canAddToCart}
          onPress={handleAddToCart}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAddToCart }}
          accessibilityLabel={outOfStock ? 'Out of stock' : 'Add to cart'}
        >
          <Text style={styles.cartButtonText}>
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </Pressable>

        {/* Transient "added" confirmation; the Cart tab holds the line. */}
        {showConfirm ? (
          <Text style={styles.confirmLabel}>Added {qty} to cart</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  heartBtn: {
    padding: 4,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Image gallery
  galleryImage: {
    backgroundColor: '#F0EFF4',
  },
  imagePlaceholder: {
    backgroundColor: '#F0EFF4',
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  badgeSale: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSaleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E65100',
  },
  badgeOutOfStock: {
    backgroundColor: '#EEEEEE',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOutOfStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },

  // Identity
  identitySection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 6,
  },
  brand: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    lineHeight: 28,
  },

  // Generic section
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  priceSale: {
    color: PINK,
  },
  originalPrice: {
    fontSize: 17,
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },
  inStock: {
    fontSize: 13,
    fontWeight: '600',
    color: '#388E3C',
  },
  outOfStockLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D32F2F',
  },

  // Variant selector
  optionGroup: {
    gap: 8,
  },
  optionGroupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  optionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  optionChipActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  optionChipTextActive: {
    color: '#fff',
  },
  optionUnavailableText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D32F2F',
  },

  // Description
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  tagText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },

  // Cart bar
  buttonSpacer: {
    height: 16,
  },
  cartBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  // Quantity selector.
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 12,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: PINK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    borderColor: '#DDDDDD',
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: PINK,
    lineHeight: 24,
  },
  qtyBtnTextDisabled: {
    color: '#CCCCCC',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    minWidth: 28,
    textAlign: 'center',
  },
  cartButton: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  // Disabled when there is no available default variant (incl. OOS).
  cartButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  cartButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  confirmLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#388E3C',
    paddingTop: 10,
  },

  // Not found
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
  },
  notFoundBack: {
    backgroundColor: PINK,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  notFoundBackText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
