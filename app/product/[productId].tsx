import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { categories, getProductById } from '../../src/data';
import { useCart } from '../../src/cart/CartContext';
import { useFavorites } from '../../src/favorites/FavoritesContext';
import { useRecentlyViewed } from '../../src/recentlyViewed/RecentlyViewedContext';

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const product = getProductById(productId);
  const { addToCart, getItemQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { recordRecentlyViewed } = useRecentlyViewed();

  const [qty, setQty] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Record this product view once when a valid product is opened.
  useEffect(() => {
    if (typeof productId === 'string' && productId.length > 0 && product) {
      recordRecentlyViewed(productId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Product not found</Text>
          <Pressable style={styles.notFoundBack} onPress={() => router.back()}>
            <Text style={styles.notFoundBackText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const outOfStock = !product.inStock;
  const quantityInCart = getItemQuantity(product.id);

  const handleAddToCart = () => {
    addToCart(product.id, qty);
    setShowConfirm(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setShowConfirm(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          // Icon is visually small; extend the touch target toward 44pt
          // (matches the category screen back button).
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={PINK} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <Pressable
          style={styles.heartBtn}
          onPress={() => toggleFavorite(product.id)}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite(product.id)
              ? `Remove ${product.name} from favorites`
              : `Add ${product.name} to favorites`
          }
          accessibilityState={{ selected: isFavorite(product.id) }}
        >
          <Ionicons
            name={isFavorite(product.id) ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite(product.id) ? PINK : '#999'}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image placeholder */}
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderLabel}>{product.id}</Text>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
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
          {outOfStock && (
            <View style={styles.badgeOutOfStock}>
              <Text style={styles.badgeOutOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Identity */}
        <View style={styles.identitySection}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>
          {category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {category.icon} {category.name}
              </Text>
            </View>
          )}
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, product.isOnSale && styles.priceSale]}>
              ${product.price.toFixed(2)}
            </Text>
            {product.originalPrice != null && (
              <Text style={styles.originalPrice}>
                ${product.originalPrice.toFixed(2)}
              </Text>
            )}
          </View>
          {product.inStock ? (
            <Text style={styles.inStock}>In Stock</Text>
          ) : (
            <Text style={styles.outOfStockLabel}>Out of Stock</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
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

      {/* Add to Cart bar */}
      <View style={styles.cartBar}>
        {/* Quantity selector */}
        <View style={styles.quantityRow}>
          <Pressable
            style={[styles.qtyBtn, (qty <= 1 || outOfStock) && styles.qtyBtnDisabled]}
            onPress={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1 || outOfStock}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
            accessibilityState={{ disabled: qty <= 1 || outOfStock }}
          >
            <Text style={[styles.qtyBtnText, (qty <= 1 || outOfStock) && styles.qtyBtnTextDisabled]}>
              −
            </Text>
          </Pressable>
          <Text style={styles.qtyValue}>{qty}</Text>
          <Pressable
            style={[styles.qtyBtn, outOfStock && styles.qtyBtnDisabled]}
            onPress={() => setQty((q) => q + 1)}
            disabled={outOfStock}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            accessibilityState={{ disabled: outOfStock }}
          >
            <Text style={[styles.qtyBtnText, outOfStock && styles.qtyBtnTextDisabled]}>
              +
            </Text>
          </Pressable>
        </View>

        {/* Add to Cart button */}
        <Pressable
          style={[styles.cartButton, outOfStock && styles.cartButtonDisabled]}
          disabled={outOfStock}
          onPress={handleAddToCart}
          accessibilityRole="button"
          accessibilityState={{ disabled: outOfStock }}
        >
          <Text style={styles.cartButtonText}>
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </Pressable>

        {/* Confirmation / View Cart */}
        {showConfirm ? (
          <Text style={styles.confirmLabel}>Added {qty} to cart</Text>
        ) : quantityInCart > 0 && !outOfStock ? (
          <Pressable onPress={() => router.push('/(tabs)/cart')}>
            <Text style={styles.viewCartLabel}>View Cart ({quantityInCart})</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const PINK = '#D81B60';

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

  // Image placeholder
  imagePlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#F0EFF4',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 12,
  },
  imagePlaceholderLabel: {
    fontSize: 11,
    color: '#BBBBBE',
    fontWeight: '500',
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  badgeNew: {
    backgroundColor: '#FCE4EC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeNewText: {
    fontSize: 11,
    fontWeight: '700',
    color: PINK,
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
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7B1FA2',
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
    gap: 10,
  },

  // Quantity selector
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
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

  // Add to Cart button
  cartButton: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cartButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  cartButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Confirmation / View Cart
  confirmLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#388E3C',
  },
  viewCartLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: PINK,
    textDecorationLine: 'underline',
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
