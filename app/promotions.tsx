import { useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fetchCollectionProducts, SALE_COLLECTION_HANDLE } from '../src/shopify';
import type { CatalogueProduct } from '../src/shopify';
import { ShopifyProductCard } from '../components/products/ShopifyProductCard';
import { catalogueProductToCardModel } from '../components/products/productCardModel';
import { usePagedData } from '../components/ui/usePagedData';
import { LoadingState, ErrorState, EmptyState, LoadMoreFooter } from '../components/ui/AsyncStates';
import { productGridColumns, gridItemWidth } from '../components/ui/grid';

const PINK = '#D81B60';
const PINK_LIGHT = '#FCE4EC';
const PAGE_SIZE = 50; // large first page so the sale guard still fills the screen
const SCREEN_PADDING = 16;
const GRID_GAP = 12;

const ALL_DEALS = 'all';

type HeaderProps = {
  filters: string[]; // productType values, dynamically derived from live data
  activeFilter: string;
  onFilterChange: (k: string) => void;
  dealCount: number;
};

function PromotionsHeader({ filters, activeFilter, onFilterChange, dealCount }: HeaderProps) {
  return (
    <View>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Nail Deals</Text>
        <Text style={styles.heroSubtitle}>Current savings from our sale collection.</Text>
      </View>

      {/* Promo banner — neutral copy, no percentage claims */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🏷️</Text>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>On Sale Now</Text>
          <Text style={styles.bannerDesc}>
            Products currently marked down from their regular price.
          </Text>
        </View>
      </View>

      {/* Filter chips: All Deals + live product types */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {[ALL_DEALS, ...filters].map((key) => {
          const active = key === activeFilter;
          const label = key === ALL_DEALS ? 'All Deals' : key;
          return (
            <Pressable
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onFilterChange(key)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Section label */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Sale Products</Text>
        {dealCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {dealCount} {dealCount === 1 ? 'deal' : 'deals'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function PromotionsScreen() {
  const { width } = useWindowDimensions();
  const [activeFilter, setActiveFilter] = useState<string>(ALL_DEALS);

  // Load sale-collection pages; apply the exact same-variant sale guard per page so
  // only provably-discounted products appear. Collection ordering is preserved.
  const {
    items,
    loading,
    error,
    loadingMore,
    pageError,
    hasMore,
    reload,
    loadMore,
    retryLoadMore,
  } = usePagedData<CatalogueProduct, null>(async (cursor) => {
    const page = await fetchCollectionProducts(SALE_COLLECTION_HANDLE, {
      first: PAGE_SIZE,
      after: cursor,
    });
    return {
      items: page.items.filter((p) => p.isOnSale),
      hasNextPage: page.pageInfo.hasNextPage,
      endCursor: page.pageInfo.endCursor,
      meta: null,
    };
  }, []);

  // Facet chips derived from the product types observed in the loaded sale items.
  const productTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) {
      const t = p.productType?.trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(
    () =>
      activeFilter === ALL_DEALS
        ? items
        : items.filter((p) => p.productType === activeFilter),
    [items, activeFilter],
  );

  const columns = productGridColumns(width);
  const itemWidth = gridItemWidth(width, columns, SCREEN_PADDING, GRID_GAP);

  const renderHeader = useCallback(
    () => (
      <PromotionsHeader
        filters={productTypes}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        dealCount={filteredItems.length}
      />
    ),
    [productTypes, activeFilter, filteredItems.length],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Nav header */}
      <View style={styles.navHeader}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#222" />
        </Pressable>
        <Text style={styles.navTitle}>Promotions</Text>
        <View style={styles.navSpacer} />
      </View>

      {loading ? (
        <LoadingState label="Loading deals…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <ScrollView>
          {renderHeader()}
          <EmptyState message="No deals right now. Check back soon for new nail supply specials." />
        </ScrollView>
      ) : (
        <FlatList<CatalogueProduct>
          key={columns}
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
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
            <ShopifyProductCard
              model={catalogueProductToCardModel(item)}
              style={{ width: itemWidth, marginTop: GRID_GAP }}
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

  // Nav header
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    marginRight: 8,
  },
  navTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  navSpacer: {
    width: 32,
  },

  // Hero
  hero: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    fontWeight: '400',
  },

  // Promo banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PINK_LIGHT,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F8BBD9',
  },
  bannerEmoji: {
    fontSize: 32,
  },
  bannerBody: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PINK,
    marginBottom: 3,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },

  // Filter chips
  filtersScroll: {
    marginTop: 16,
  },
  filtersRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  chipTextActive: {
    color: '#fff',
  },

  // Section header row
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  countBadge: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Grid
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    gap: 12,
  },
});
