import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fetchCollectionProducts } from '../../src/shopify';
import type { CatalogueProduct } from '../../src/shopify';
import { ProductCard } from '../../components/products/ProductCard';
import { catalogueProductToCardProduct } from '../../components/products/catalogueCardAdapter';
import { useAsyncData } from '../../components/ui/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/AsyncStates';
import { productGridColumns, gridItemWidth } from '../../components/ui/grid';

const PINK = '#D81B60';
const SCREEN_PADDING = 16;
const GRID_GAP = 12;

// Turn a Shopify handle ("gel-polish") into a readable fallback title when a
// title param was not passed (e.g. a deep link).
function prettifyHandle(handle: string): string {
  return handle
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function CategoryScreen() {
  // Historical param name: this route was originally keyed by the mock category
  // id. As of M41S2B2 `categoryId` carries the Shopify *collection handle*; the
  // file name is kept so existing route references stay valid. `title` is passed
  // by the category grids for a friendly header.
  const { categoryId: handle, title } = useLocalSearchParams<{
    categoryId: string;
    title?: string;
  }>();
  const { width } = useWindowDimensions();

  const { data, loading, error, reload } = useAsyncData<CatalogueProduct[]>(async () => {
    if (!handle) return [];
    // First page only in M41S2B2; cursor pagination / infinite scroll deferred
    // to M41S2C.
    const page = await fetchCollectionProducts(handle, { first: 24 });
    return page.items;
  }, [handle]);

  const columns = productGridColumns(width);
  const itemWidth = gridItemWidth(width, columns, SCREEN_PADDING, GRID_GAP);
  const count = data?.length ?? 0;
  const headerTitle = title || (handle ? prettifyHandle(handle) : 'Category');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={PINK} />
        </Pressable>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          {!loading && !error && (
            <Text style={styles.headerCount}>
              {count} {count === 1 ? 'product' : 'products'}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : count === 0 ? (
        <EmptyState message="No products in this collection yet." />
      ) : (
        <FlatList<CatalogueProduct>
          // Remount when the column count changes (RN requirement for numColumns).
          key={columns}
          data={data!}
          numColumns={columns}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? { gap: GRID_GAP } : undefined}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={catalogueProductToCardProduct(item)}
              // Product detail wiring is deferred (M41S2B2 exclusion): no-op tap.
              onPress={() => {}}
              // Display-only: Shopify-backed cards never write to cart/favorites.
              displayOnly
              imageHeight={140}
              imageAltText={item.featuredImage?.altText ?? undefined}
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
    flex: 1,
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

  // Grid
  listContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 16,
    paddingBottom: 32,
  },
});
