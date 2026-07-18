import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFavorites } from '../../src/favorites/FavoritesContext';
import { useResolvedProducts } from '../../components/products/useResolvedProducts';
import { ShopifyProductCard } from '../../components/products/ShopifyProductCard';
import { catalogueProductToCardModel } from '../../components/products/productCardModel';
import type { CatalogueProduct } from '../../src/shopify';
import { LoadingState, ErrorState } from '../../components/ui/AsyncStates';
import { productGridColumns, gridItemWidth } from '../../components/ui/grid';

const PINK = '#D81B60';
const SCREEN_PADDING = 16;
const GRID_GAP = 12;

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color="#DDDDDD" />
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the heart on a product to save it here.
      </Text>
      <Pressable style={styles.browseButton} onPress={() => router.push('/(tabs)/')}>
        <Text style={styles.browseButtonText}>Browse products</Text>
      </Pressable>
    </View>
  );
}

export default function FavoritesScreen() {
  const { favorites, hydrated, pruneFavorites } = useFavorites();
  const { width } = useWindowDimensions();

  // Resolve all favorited GIDs in one request; preserve order; prune deleted.
  const { state, reload } = useResolvedProducts(
    favorites.map((f) => f.gid),
    pruneFavorites,
  );

  const columns = productGridColumns(width);
  const itemWidth = gridItemWidth(width, columns, SCREEN_PADDING, GRID_GAP);
  const savedCount = favorites.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        {savedCount > 0 && <Text style={styles.headerCount}>{savedCount} saved</Text>}
      </View>

      {!hydrated ? null : savedCount === 0 ? (
        <EmptyState />
      ) : state.status === 'loading' ? (
        <LoadingState label="Loading favorites…" />
      ) : state.status === 'error' ? (
        <ErrorState message="Couldn’t load your favorites." onRetry={reload} />
      ) : state.products.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList<CatalogueProduct>
          key={columns}
          data={state.products}
          numColumns={columns}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={columns > 1 ? { gap: GRID_GAP } : undefined}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ShopifyProductCard
              model={catalogueProductToCardModel(item)}
              style={{ width: itemWidth, marginBottom: GRID_GAP }}
            />
          )}
        />
      )}
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
  grid: {
    padding: SCREEN_PADDING,
    paddingBottom: 32,
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
