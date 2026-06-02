import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { products } from '../../src/data';
import { Product } from '../../src/data';
import { useFavorites } from '../../src/favorites/FavoritesContext';

const PINK = '#D81B60';
const CARD_WIDTH = 165;

// ── Product card (favorites grid) ────────────────────────────────────────────

function FavoriteCard({ product }: { product: Product }) {
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

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color="#DDDDDD" />
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the heart on a product to save it here.
      </Text>
      <Pressable
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)/')}
      >
        <Text style={styles.browseButtonText}>Browse products</Text>
      </Pressable>
    </View>
  );
}

// ── Favorites screen ──────────────────────────────────────────────────────────

export default function FavoritesScreen() {
  const { favoriteIds } = useFavorites();
  const favoriteProducts = products.filter((p) => favoriteIds.includes(p.id));

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        {favoriteProducts.length > 0 && (
          <Text style={styles.headerCount}>{favoriteProducts.length} saved</Text>
        )}
      </View>

      {favoriteProducts.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {favoriteProducts.map((product) => (
            <FavoriteCard key={product.id} product={product} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  headerCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },

  // Grid
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },

  // Product card
  card: {
    width: CARD_WIDTH,
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
    width: CARD_WIDTH,
    height: 150,
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    marginTop: 8,
    backgroundColor: PINK,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
