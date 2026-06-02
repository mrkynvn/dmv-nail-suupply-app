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

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const product = getProductById(productId);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={PINK} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
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
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
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

      {/* Add to Cart */}
      <View style={styles.cartBar}>
        <Pressable
          style={[styles.cartButton, outOfStock && styles.cartButtonDisabled]}
          disabled={outOfStock}
          onPress={() => console.log(`Add to cart: ${product.id}`)}
        >
          <Text style={styles.cartButtonText}>
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </Pressable>
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
    paddingVertical: 14,
  },
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
