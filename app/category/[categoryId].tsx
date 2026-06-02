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
import { categories, getProductsByCategory, Product } from '../../src/data';

// ── Product grid card ─────────────────────────────────────────────────────────

function GridCard({ product }: { product: Product }) {
  const outOfStock = !product.inStock;

  return (
    <Pressable
      style={[styles.card, outOfStock && styles.cardOutOfStock]}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={styles.cardImage}>
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
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardBrand} numberOfLines={1}>{product.brand}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>${product.price.toFixed(2)}</Text>
          {product.originalPrice != null && (
            <Text style={styles.cardOriginalPrice}>
              ${product.originalPrice.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Category screen ───────────────────────────────────────────────────────────

export default function CategoryScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();

  const category = categories.find((c) => c.id === categoryId);

  if (!category) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Category not found</Text>
          <Pressable style={styles.notFoundBack} onPress={() => router.back()}>
            <Text style={styles.notFoundBackText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const categoryProducts = getProductsByCategory(categoryId);
  const count = categoryProducts.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={PINK} />
        </Pressable>
        <View style={styles.headerBody}>
          <Text style={styles.headerIcon}>{category.icon}</Text>
          <View>
            <Text style={styles.headerTitle}>{category.name}</Text>
            <Text style={styles.headerCount}>
              {count} {count === 1 ? 'product' : 'products'}
            </Text>
          </View>
        </View>
      </View>

      {/* Product grid */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {count === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products in this category yet.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {categoryProducts.map((product) => (
              <GridCard key={product.id} product={product} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  headerCount: {
    fontSize: 13,
    color: '#888',
    marginTop: 1,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Product grid (2 columns)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Product card
  card: {
    // Each card takes just under half the container so two fit per row with the gap
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '50%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  cardOutOfStock: {
    opacity: 0.6,
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F0EFF4',
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 8,
  },
  cardContent: {
    padding: 10,
    gap: 4,
  },
  cardBrand: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    lineHeight: 18,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  cardOriginalPrice: {
    fontSize: 12,
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },

  // Badges
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
  outOfStockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
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

  // Empty state
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
  },
});
