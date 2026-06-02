import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Product } from '../../src/data/types';
import { useFavorites } from '../../src/favorites/FavoritesContext';

const PINK = '#D81B60';

type ProductCardProps = {
  product: Product;
  onPress: () => void;
  showFavorite?: boolean;
  categoryLabel?: string;
  imageHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProductCard({
  product,
  onPress,
  showFavorite = false,
  categoryLabel,
  imageHeight = 150,
  style,
}: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(product.id);
  const outOfStock = !product.inStock;

  return (
    <Pressable
      style={[styles.card, outOfStock && styles.cardOutOfStock, style]}
      onPress={onPress}
    >
      {/* Image area */}
      <View style={[styles.imageArea, { height: imageHeight }]}>
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

        {/* Bottom-right: Out of Stock */}
        {outOfStock && (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText}>Out of Stock</Text>
          </View>
        )}

        {/* Top-right: Heart button */}
        {showFavorite && (
          <Pressable
            style={styles.heartBtn}
            onPress={() => toggleFavorite(product.id)}
            hitSlop={8}
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
        <View style={styles.priceRow}>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          {product.originalPrice != null && (
            <Text style={styles.originalPrice}>
              ${product.originalPrice.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  cardOutOfStock: {
    opacity: 0.6,
  },

  // Image placeholder area
  imageArea: {
    width: '100%',
    backgroundColor: '#F0EFF4',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 8,
  },
  badgesRow: {
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
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: 5,
  },

  // Content
  content: {
    padding: 10,
    gap: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#7B1FA2',
    fontWeight: '500',
  },
  brand: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  originalPrice: {
    fontSize: 12,
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },
});
