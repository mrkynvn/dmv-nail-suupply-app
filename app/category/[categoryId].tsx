import { useState } from 'react';
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
import type {
  CatalogueProduct,
  CatalogueCollection,
  CollectionSortOption,
} from '../../src/shopify';
import { ProductCard } from '../../components/products/ProductCard';
import { catalogueProductToCardProduct } from '../../components/products/catalogueCardAdapter';
import {
  CollectionSortSheet,
  COLLECTION_SORT_LABELS,
} from '../../components/products/CollectionSortSheet';
import { usePagedData } from '../../components/ui/usePagedData';
import { LoadingState, ErrorState, EmptyState, LoadMoreFooter } from '../../components/ui/AsyncStates';
import { productGridColumns, gridItemWidth } from '../../components/ui/grid';

// Products per page request. Load-more appends further pages via cursor.
const PAGE_SIZE = 24;

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

  // Selected sort for this collection. 'featured' is the collection's own
  // configured order — the same request C2A made before sort existed.
  const [sort, setSort] = useState<CollectionSortOption>('featured');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const {
    items,
    meta,
    loading,
    error,
    loadingMore,
    pageError,
    hasMore,
    reload,
    loadMore,
    retryLoadMore,
  } = usePagedData<CatalogueProduct, CatalogueCollection>(async (cursor) => {
    if (!handle) {
      return { items: [], hasNextPage: false, endCursor: null, meta: null };
    }
    const page = await fetchCollectionProducts(handle, { first: PAGE_SIZE, after: cursor, sort });
    return {
      items: page.items,
      hasNextPage: page.pageInfo.hasNextPage,
      endCursor: page.pageInfo.endCursor,
      meta: page.collection,
    };
    // `sort` in deps: changing it resets the cursor/items and refetches page one
    // in the new order (usePagedData's deps-change reset).
  }, [handle, sort]);

  const columns = productGridColumns(width);
  const itemWidth = gridItemWidth(width, columns, SCREEN_PADDING, GRID_GAP);
  const count = items.length;
  const sortIsDefault = sort === 'featured';
  // Count line doubles as the active-sort readout so the applied order is
  // visible without opening the sheet. Default order shows the count alone.
  const countLine = sortIsDefault
    ? `Showing ${count} ${count === 1 ? 'product' : 'products'}`
    : `${count} ${count === 1 ? 'product' : 'products'} · ${COLLECTION_SORT_LABELS[sort]}`;
  // Prefer the route title param, then the real fetched collection title, then a
  // prettified handle fallback (e.g. a deep link with no title param).
  const headerTitle =
    title || meta?.title || (handle ? prettifyHandle(handle) : 'Category');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          // Icon is visually small; extend the touch target toward 44pt.
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={PINK} />
        </Pressable>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          {!loading && !error && count > 0 && (
            // Reflects only what is loaded so far — Storefront does not return a
            // reliable total here, so we never imply this is the whole collection.
            <Text style={styles.headerCount} numberOfLines={1}>
              {countLine}
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.sortBtn,
            !sortIsDefault && styles.sortBtnActive,
            pressed && styles.sortBtnPressed,
          ]}
          onPress={() => setSortSheetOpen(true)}
          // Pill is shorter than 44pt; extend the touch target without growing it.
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Sort products, currently ${COLLECTION_SORT_LABELS[sort]}`}
        >
          <Ionicons name="swap-vertical" size={16} color={PINK} />
          <Text style={styles.sortBtnText}>Sort</Text>
        </Pressable>
      </View>

      <CollectionSortSheet
        visible={sortSheetOpen}
        selected={sort}
        onSelect={(option) => {
          // Close first, then update; picking the current option is a no-op
          // (same state value → no refetch).
          setSortSheetOpen(false);
          setSort(option);
        }}
        onClose={() => setSortSheetOpen(false)}
      />

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
          data={items}
          numColumns={columns}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? { gap: GRID_GAP } : undefined}
          showsVerticalScrollIndicator={false}
          // Append the next page as the user nears the end. The hook guards
          // against duplicate calls, exhaustion, and in-flight page errors.
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <LoadMoreFooter
              loadingMore={loadingMore}
              pageError={pageError}
              hasMore={hasMore}
              onRetry={retryLoadMore}
            />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={catalogueProductToCardProduct(item)}
              // Open the Shopify-aware detail route keyed by the product *handle*
              // (not the GID), matching the collection route's handle convention.
              onPress={() => router.push(`/product/shopify/${item.handle}`)}
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
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  // Light pink fill signals a non-default sort is applied.
  sortBtnActive: {
    backgroundColor: '#FCE4EC',
  },
  sortBtnPressed: {
    opacity: 0.6,
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: PINK,
  },

  // Grid
  listContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 16,
    paddingBottom: 32,
  },
});
