import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  fetchCollections,
  fetchCollectionProducts,
  fetchNewArrivals,
  SALE_COLLECTION_HANDLE,
} from '../../src/shopify';
import type { CatalogueCollection, CatalogueProduct } from '../../src/shopify';
import { ShopifyProductCard } from '../../components/products/ShopifyProductCard';
import { catalogueProductToCardModel } from '../../components/products/productCardModel';
import { CollectionTile } from '../../components/collections/CollectionTile';
import { filterCategoryCollections } from '../../components/collections/collectionFilter';
import { useAsyncData } from '../../components/ui/useAsyncData';
import { useResolvedProducts } from '../../components/products/useResolvedProducts';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/AsyncStates';
import { homeCategoryColumns, gridItemWidth } from '../../components/ui/grid';
import { useRecentlyViewed } from '../../src/recentlyViewed/RecentlyViewedContext';

const BRAND_LOGO = require('../../assets/images/dc-app-logo.png');

const HOME_SECTION_PADDING = 20;
const HOME_GRID_GAP = 10;
const RAIL_CARD_WIDTH = 165;
const SALE_FETCH_COUNT = 30; // fetch enough to fill the rail after the sale guard
const SALE_RAIL_COUNT = 10;

// ── Product rail (horizontal scroll of live Shopify products) ────────────────

function ProductRail({
  title,
  products,
  onSeeAll,
}: {
  title: string;
  products: CatalogueProduct[];
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAllText}>See All</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productRow}
      >
        {products.map((product) => (
          <ShopifyProductCard
            key={product.id}
            model={catalogueProductToCardModel(product)}
            style={{ width: RAIL_CARD_WIDTH }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// A rail whose data loads asynchronously: renders compact loading / error /
// empty states and never substitutes placeholder or mock content.
function AsyncProductRail({
  title,
  products,
  loading,
  error,
  onRetry,
  onSeeAll,
}: {
  title: string;
  products: CatalogueProduct[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAllText}>See All</Text>
          </Pressable>
        )}
      </View>
      {loading ? (
        <LoadingState label={`Loading ${title.toLowerCase()}…`} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !products || products.length === 0 ? (
        <EmptyState message="Nothing here yet." />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productRow}
        >
          {products.map((product) => (
            <ShopifyProductCard
              key={product.id}
              model={catalogueProductToCardModel(product)}
              style={{ width: RAIL_CARD_WIDTH }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── Home screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { width } = useWindowDimensions();

  // Shopify-backed category grid.
  const {
    data: collections,
    loading: collectionsLoading,
    error: collectionsError,
    reload: reloadCollections,
  } = useAsyncData<CatalogueCollection[]>(async () => {
    const page = await fetchCollections({ first: 50 });
    return filterCategoryCollections(page.items).included;
  }, []);

  // New Arrivals — newest products (CREATED_AT desc), first 10.
  const {
    data: newArrivals,
    loading: newLoading,
    error: newError,
    reload: reloadNew,
  } = useAsyncData<CatalogueProduct[]>(() => fetchNewArrivals(SALE_RAIL_COUNT), []);

  // On Sale — from the app-on-sale collection, with the exact same-variant sale
  // guard applied client-side (omit anything not provably discounted). Collection
  // ordering is preserved (owner decision v1).
  const {
    data: onSale,
    loading: saleLoading,
    error: saleError,
    reload: reloadSale,
  } = useAsyncData<CatalogueProduct[]>(async () => {
    const page = await fetchCollectionProducts(SALE_COLLECTION_HANDLE, { first: SALE_FETCH_COUNT });
    return page.items.filter((p) => p.isOnSale).slice(0, SALE_RAIL_COUNT);
  }, []);

  const columns = homeCategoryColumns(width);
  const homeItemWidth = gridItemWidth(width, columns, HOME_SECTION_PADDING, HOME_GRID_GAP);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const allCollections = collections ?? [];
  const visibleCollections = showAllCategories
    ? allCollections
    : allCollections.slice(0, columns);

  // Recently Viewed — resolve persisted Shopify GIDs to live products; hide the
  // rail on a network failure rather than breaking Home.
  const { recent, hydrated: recentHydrated, pruneRecentlyViewed } = useRecentlyViewed();
  const { state: recentState } = useResolvedProducts(
    recent.map((r) => r.gid),
    pruneRecentlyViewed,
  );
  const recentProducts =
    recentState.status === 'ready' ? recentState.products : [];
  const showRecent = recentHydrated && recentState.status === 'ready' && recentProducts.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image source={BRAND_LOGO} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerSubtitle}>
            Professional nail products for salons and artists
          </Text>
          <Text style={styles.headerSupporting}>
            Shop gel polish, acrylics, tools, lamps, and more.
          </Text>
        </View>

        {/* Category grid (Shopify collections) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          {collectionsLoading ? (
            <LoadingState label="Loading categories…" />
          ) : collectionsError ? (
            <ErrorState message={collectionsError} onRetry={reloadCollections} />
          ) : allCollections.length === 0 ? (
            <EmptyState message="No categories available yet." />
          ) : (
            <>
              <View style={[styles.categoryGrid, { gap: HOME_GRID_GAP }]}>
                {visibleCollections.map((collection) => (
                  <CollectionTile
                    key={collection.id}
                    collection={collection}
                    onPress={() =>
                      router.push({
                        pathname: '/category/[categoryId]',
                        params: { categoryId: collection.handle, title: collection.title },
                      })
                    }
                    imageHeight={64}
                    style={{ width: homeItemWidth }}
                  />
                ))}
              </View>
              {allCollections.length > columns && (
                <Pressable
                  style={styles.showMoreBtn}
                  onPress={() => setShowAllCategories((prev) => !prev)}
                >
                  <Text style={styles.showMoreText}>
                    {showAllCategories ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* New arrivals */}
        <AsyncProductRail
          title="New Arrivals"
          products={newArrivals}
          loading={newLoading}
          error={newError}
          onRetry={reloadNew}
        />

        {/* On sale */}
        <AsyncProductRail
          title="On Sale"
          products={onSale}
          loading={saleLoading}
          error={saleError}
          onRetry={reloadSale}
          onSeeAll={() => router.push('/promotions')}
        />

        {/* Recently viewed — only shown after a successful resolve with history */}
        {showRecent && <ProductRail title="Recently Viewed" products={recentProducts} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const PINK = '#D81B60';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerLogo: {
    width: 160,
    height: 60,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
    fontWeight: '500',
  },
  headerSupporting: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: PINK,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // Show more / less
  showMoreBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PINK,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: PINK,
  },

  // Product row
  productRow: {
    paddingBottom: 4,
    gap: 12,
  },
});
