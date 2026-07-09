import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Product } from '../../src/data/types';
import { useFavorites } from '../../src/favorites/FavoritesContext';
import { useCart } from '../../src/cart/CartContext';

const PINK = '#D81B60';

type ProductCardProps = {
  product: Product;
  // Optional so a card can be a deliberate no-op (e.g. a Shopify card missing a
  // valid handle): with no handler the Pressable renders but does not navigate.
  onPress?: () => void;
  showFavorite?: boolean;
  showQuickAdd?: boolean;
  categoryLabel?: string;
  imageHeight?: number;
  style?: StyleProp<ViewStyle>;
  // Explicit alt text for the product image; falls back to the product name.
  imageAltText?: string;
  // Display-only mode for Shopify-backed cards: suppresses the favorite and
  // quick-add controls so such cards never write to cart/favorites (those
  // stores are still mock-id based until a later migration milestone).
  displayOnly?: boolean;
};

export function ProductCard({
  product,
  onPress,
  showFavorite = false,
  showQuickAdd = true,
  categoryLabel,
  imageHeight = 150,
  style,
  imageAltText,
  displayOnly = false,
}: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const favorited = isFavorite(product.id);
  const outOfStock = !product.inStock;

  // Track the URI that failed to load (rather than a bare boolean) so a card
  // recycled by a list for a different product doesn't inherit a stale error.
  const [erroredUri, setErroredUri] = useState<string | null>(null);
  const isRemoteImage = /^https?:\/\//i.test(product.imageUrl);
  const showImage = isRemoteImage && erroredUri !== product.imageUrl;
  const imageLabel =
    imageAltText && imageAltText.trim().length > 0 ? imageAltText : product.name;

  // Display-only Shopify cards render neither control regardless of caller flags.
  const showFav = showFavorite && !displayOnly;
  const showAdd = showQuickAdd && !displayOnly;

  return (
    <Pressable
      style={[styles.card, outOfStock && styles.cardOutOfStock, style]}
      onPress={onPress}
    >
      {/* Image area */}
      <View style={[styles.imageArea, { height: imageHeight }]}>
        {/* Real product image (remote URLs only); on error or for mock
            `placeholder:*` values it is omitted and the colored area shows. */}
        {showImage && (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setErroredUri(product.imageUrl)}
            accessible
            accessibilityRole="image"
            accessibilityLabel={imageLabel}
          />
        )}

        {/* Bottom-left: New / Sale badges */}
        <View style={styles.badgesRow}>
          {product.isNew && (
            <View style={styles.badgeNew}>
              <Text style={styles.badgeNewText}>New</Text>
            </View>
          )}
          {product.isOnSale && (
            <View style={styles.badgeSale}>
              <Text style={styles.badgeSaleText}>Sale</Text>
            </View>
          )}
        </View>

        {/* Bottom-right: Out of Stock label */}
        {outOfStock && (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText}>Out of Stock</Text>
          </View>
        )}

        {/* Top-right: Heart button */}
        {showFav && (
          <Pressable
            style={styles.heartBtn}
            onPress={() => toggleFavorite(product.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              favorited
                ? `Remove ${product.name} from favorites`
                : `Add ${product.name} to favorites`
            }
            accessibilityState={{ selected: favorited }}
          >
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={20}
              color={favorited ? PINK : '#999'}
            />
          </Pressable>
        )}
      </View>

      {/* Text content */}
      <View style={styles.content}>
        {categoryLabel ? (
          <Text style={styles.categoryLabel}>{categoryLabel}</Text>
        ) : null}
        <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        {/* Footer: price (left) + quick-add button (right) */}
        <View style={styles.footerRow}>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            {product.originalPrice != null && (
              <Text style={styles.originalPrice}>
                ${product.originalPrice.toFixed(2)}
              </Text>
            )}
          </View>

          {showAdd && (
            <Pressable
              style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
              onPress={() => addToCart(product.id)}
              disabled={outOfStock}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Add ${product.name} to cart`}
              accessibilityState={{ disabled: outOfStock }}
            >
              {outOfStock ? (
                <Text style={styles.addBtnOosText}>Out</Text>
              ) : (
                <Ionicons name="add" size={18} color="#fff" />
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  cardOutOfStock: {
    opacity: 0.65,
  },

  // Image area. The colored background is the placeholder shown for mock
  // `placeholder:*` products and as the fallback when a remote image fails; a
  // real <Image> (styles.image) fills it edge-to-edge when present. Overlays
  // (badges, out-of-stock, heart) are absolutely positioned so they sit above
  // the image without relying on container padding.
  imageArea: {
    width: '100%',
    backgroundColor: '#EEEDF4',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  badgesRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badgeNew: {
    backgroundColor: '#FCE4EC',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '700',
    color: PINK,
  },
  badgeSale: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeSaleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E65100',
  },
  oosOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  oosText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderRadius: 16,
    padding: 5,
  },

  // Content
  content: {
    padding: 10,
    gap: 3,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#7B1FA2',
    fontWeight: '500',
  },
  brand: {
    fontSize: 10,
    color: '#AAAAAA',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 18,
  },

  // Footer row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  priceBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  originalPrice: {
    fontSize: 11,
    color: '#BBBBBB',
    textDecorationLine: 'line-through',
  },

  // Quick-add button
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PINK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#EBEBEB',
  },
  addBtnOosText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 0.2,
  },
});
