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
import { useFavorites } from '../../src/favorites/FavoritesContext';
import { ProductCard } from '../../components/products/ProductCard';

const PINK = '#D81B60';

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
  const { favoriteIds, hydrated } = useFavorites();
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
        hydrated ? <EmptyState /> : null
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {favoriteProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
              showFavorite
              style={styles.favCard}
            />
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

  // Favorites grid card (fixed width to fill 2-column wrap layout)
  favCard: {
    width: 165,
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
