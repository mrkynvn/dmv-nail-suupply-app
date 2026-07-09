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
import { getFeaturedProducts, getOnSaleProducts, getProductById } from '../../src/data';
import { Product } from '../../src/data';
import { fetchCollections } from '../../src/shopify';
import type { CatalogueCollection } from '../../src/shopify';
import { ProductCard } from '../../components/products/ProductCard';
import { CollectionTile } from '../../components/collections/CollectionTile';
import { filterCategoryCollections } from '../../components/collections/collectionFilter';
import { useAsyncData } from '../../components/ui/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/AsyncStates';
import { homeCategoryColumns, gridItemWidth } from '../../components/ui/grid';
import { useRecentlyViewed } from '../../src/recentlyViewed/RecentlyViewedContext';

const DMV_LOGO = require('../../assets/images/dmv-logo.png');

const HOME_SECTION_PADDING = 20;
const HOME_GRID_GAP = 10;

// ── Product section (horizontal scroll) ─────────────────────────────────────

function ProductSection({
  title,
  products,
  onSeeAll,
}: {
  title: string;
  products: Product[];
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
          <ProductCard
            key={product.id}
            product={product}
            onPress={() => router.push(`/product/${product.id}`)}
            showFavorite
            style={{ width: 165 }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Home screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const newProducts = getFeaturedProducts();
  const saleProducts = getOnSaleProducts();
  const { width } = useWindowDimensions();

  // Shopify-backed category grid (mock product rails below stay as-is for now).
  const {
    data: collections,
    loading: collectionsLoading,
    error: collectionsError,
    reload: reloadCollections,
  } = useAsyncData<CatalogueCollection[]>(async () => {
    // First page only in M41S2B2; cursor pagination deferred to M41S2C.
    const page = await fetchCollections({ first: 50 });
    return filterCategoryCollections(page.items).included;
  }, []);

  const columns = homeCategoryColumns(width);
  const homeItemWidth = gridItemWidth(width, columns, HOME_SECTION_PADDING, HOME_GRID_GAP);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const allCollections = collections ?? [];
  const visibleCollections = showAllCategories
    ? allCollections
    : allCollections.slice(0, columns);

  const { recentProductIds, hydrated } = useRecentlyViewed();
  const recentProducts = recentProductIds
    .map((id) => getProductById(id))
    .filter((p): p is Product => p != null);

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
            <Image source={DMV_LOGO} style={styles.headerLogo} resizeMode="contain" />
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
        <ProductSection title="New Arrivals" products={newProducts} />

        {/* On sale */}
        <ProductSection
          title="On Sale"
          products={saleProducts}
          onSeeAll={() => router.push('/promotions')}
        />

        {/* Recently viewed — only shown after hydration when history exists */}
        {hydrated && recentProducts.length > 0 && (
          <ProductSection title="Recently Viewed" products={recentProducts} />
        )}
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
    height: 40,
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
