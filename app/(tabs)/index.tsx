import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { categories, getFeaturedProducts, getOnSaleProducts } from '../../src/data';
import { Product, Category } from '../../src/data';
import { ProductCard } from '../../components/products/ProductCard';

const DMV_LOGO = require('../../assets/images/dmv-logo.png');

// ── Category item ────────────────────────────────────────────────────────────

function CategoryItem({ category }: { category: Category }) {
  return (
    <Pressable
      style={styles.categoryItem}
      onPress={() => router.push(`/category/${category.id}`)}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text style={styles.categoryName}>{category.name}</Text>
    </Pressable>
  );
}

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
  const [showAllCategories, setShowAllCategories] = useState(false);
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 4);

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

        {/* Category grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <View style={styles.categoryGrid}>
            {visibleCategories.map((cat) => (
              <CategoryItem key={cat.id} category={cat} />
            ))}
          </View>
          {categories.length > 4 && (
            <Pressable
              style={styles.showMoreBtn}
              onPress={() => setShowAllCategories((prev) => !prev)}
            >
              <Text style={styles.showMoreText}>
                {showAllCategories ? 'Show less' : 'Show more'}
              </Text>
            </Pressable>
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
  categoryItem: {
    width: '22%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 10,
    color: '#444',
    fontWeight: '500',
    textAlign: 'center',
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
