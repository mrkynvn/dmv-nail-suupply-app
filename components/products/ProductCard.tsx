import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ProductCardModel } from './productCardModel';

// Pure presentation product card (M41S6E).
//
// It renders a neutral ProductCardModel and delegates every action through
// callbacks. It imports no data layer, no favorites/cart context, and no
// GraphQL shapes — the ShopifyProductCard wrapper wires those in. Quick-add
// behavior is driven entirely by `model.quickAdd.kind`.

const PINK = '#D81B60';

type ProductCardProps = {
  model: ProductCardModel;
  // Optional so a card can be a deliberate no-op (e.g. missing a valid handle):
  // with no handler the Pressable renders but does not navigate.
  onPress?: () => void;
  showFavorite?: boolean;
  favorited?: boolean;
  onToggleFavorite?: () => void;
  showQuickAdd?: boolean;
  // Invoked when the quick-add control is pressed for an `add` or `openDetail`
  // descriptor. Never called for a `disabled` descriptor.
  onQuickAdd?: () => void;
  categoryLabel?: string;
  imageHeight?: number;
  style?: StyleProp<ViewStyle>;
};

function formatPrice(amount: number, currencyCode: string): string {
  return currencyCode === 'USD' ? `$${amount.toFixed(2)}` : `${amount.toFixed(2)} ${currencyCode}`;
}

export function ProductCard({
  model,
  onPress,
  showFavorite = false,
  favorited = false,
  onToggleFavorite,
  showQuickAdd = true,
  onQuickAdd,
  categoryLabel,
  imageHeight = 150,
  style,
}: ProductCardProps) {
  const outOfStock = !model.available;

  // Track the URI that failed to load (rather than a bare boolean) so a card
  // recycled by a list for a different product doesn't inherit a stale error.
  const [erroredUri, setErroredUri] = useState<string | null>(null);
  const imageUri = model.imageUrl ?? '';
  const isRemoteImage = /^https?:\/\//i.test(imageUri);
  const showImage = isRemoteImage && erroredUri !== imageUri;
  const imageLabel =
    model.imageAltText && model.imageAltText.trim().length > 0 ? model.imageAltText : model.name;

  const quickAddKind = model.quickAdd.kind;
  const showFav = showFavorite && !!onToggleFavorite;
  const showAdd = showQuickAdd;
  // The quick-add control is inert for a `disabled` descriptor or when out of
  // stock. `add`/`openDetail` invoke the provided callback.
  const quickAddDisabled = quickAddKind === 'disabled' || outOfStock;

  return (
    <Pressable
      style={[styles.card, outOfStock && styles.cardOutOfStock, style]}
      onPress={onPress}
    >
      {/* Image area */}
      <View style={[styles.imageArea, { height: imageHeight }]}>
        {/* Real product image (remote URLs only); on error or when Shopify has no
            image the colored area shows through. */}
        {showImage && (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setErroredUri(imageUri)}
            accessible
            accessibilityRole="image"
            accessibilityLabel={imageLabel}
          />
        )}

        {/* Bottom-left: Sale badge (no automatic New badge — owner decision). */}
        <View style={styles.badgesRow}>
          {model.isOnSale && (
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
            onPress={onToggleFavorite}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              favorited
                ? `Remove ${model.name} from favorites`
                : `Add ${model.name} to favorites`
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
        {model.brand.trim().length > 0 ? (
          <Text style={styles.brand} numberOfLines={1}>{model.brand}</Text>
        ) : null}
        <Text style={styles.name} numberOfLines={2}>{model.name}</Text>

        {/* Footer: price (left) + quick-add button (right) */}
        <View style={styles.footerRow}>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{formatPrice(model.price, model.currencyCode)}</Text>
            {model.compareAtPrice != null && (
              <Text style={styles.originalPrice}>
                {formatPrice(model.compareAtPrice, model.currencyCode)}
              </Text>
            )}
          </View>

          {showAdd && (
            <Pressable
              style={[styles.addBtn, quickAddDisabled && styles.addBtnDisabled]}
              onPress={quickAddDisabled ? undefined : onQuickAdd}
              disabled={quickAddDisabled}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={
                quickAddDisabled
                  ? `${model.name} is out of stock`
                  : quickAddKind === 'openDetail'
                    ? `Choose options for ${model.name}`
                    : `Add ${model.name} to cart`
              }
              accessibilityState={{ disabled: quickAddDisabled }}
            >
              {quickAddDisabled ? (
                <Text style={styles.addBtnOosText}>Out</Text>
              ) : (
                <Ionicons
                  name={quickAddKind === 'openDetail' ? 'ellipsis-horizontal' : 'add'}
                  size={18}
                  color="#fff"
                />
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

  // Image area. The colored background shows through when Shopify has no image
  // or a remote image fails; a real <Image> fills it edge-to-edge when present.
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
