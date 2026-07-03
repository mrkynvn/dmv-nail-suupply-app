import { useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getOnSaleProducts } from '../src/data';
import { Product } from '../src/data';
import { ProductCard } from '../components/products/ProductCard';

const PINK = '#D81B60';
const PINK_LIGHT = '#FCE4EC';

type FilterKey = 'all' | 'cat-01' | 'cat-02' | 'cat-06' | 'cat-03';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Deals' },
  { key: 'cat-01', label: 'Gel' },
  { key: 'cat-02', label: 'Acrylic' },
  { key: 'cat-06', label: 'Glitter' },
  { key: 'cat-03', label: 'Tools' },
];

type HeaderProps = {
  activeFilter: FilterKey;
  onFilterChange: (k: FilterKey) => void;
  dealCount: number;
};

function PromotionsHeader({ activeFilter, onFilterChange, dealCount }: HeaderProps) {
  return (
    <View>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Nail Deals</Text>
        <Text style={styles.heroSubtitle}>Fresh savings on salon favorites.</Text>
      </View>

      {/* Promo banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🏷️</Text>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>This Week's Picks</Text>
          <Text style={styles.bannerDesc}>
            Up to 40% off salon essentials — new deals added weekly.
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = chip.key === activeFilter;
          return (
            <Pressable
              key={chip.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onFilterChange(chip.key)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Section label */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Sale Products</Text>
        {dealCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{dealCount} deals</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function savingsAmount(p: Product): number {
  if (p.originalPrice == null) return 0;
  return p.originalPrice - p.price;
}

export default function PromotionsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const allSaleProducts = useMemo(
    () => getOnSaleProducts().slice().sort((a, b) => savingsAmount(b) - savingsAmount(a)),
    [],
  );

  const filteredProducts = useMemo(
    () =>
      activeFilter === 'all'
        ? allSaleProducts
        : allSaleProducts.filter((p) => p.categoryId === activeFilter),
    [allSaleProducts, activeFilter],
  );

  const renderHeader = useCallback(
    () => (
      <PromotionsHeader
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        dealCount={filteredProducts.length}
      />
    ),
    [activeFilter, filteredProducts.length],
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

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.id}`)}
            showFavorite
            style={styles.card}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>No deals right now</Text>
            <Text style={styles.emptySubtitle}>
              Check back soon for new nail supply specials.
            </Text>
          </View>
        }
      />
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
    marginTop: 12,
  },
  card: {
    flex: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
