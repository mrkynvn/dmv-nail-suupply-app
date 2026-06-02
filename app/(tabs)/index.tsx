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

// ── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const outOfStock = !product.inStock;

  return (
    <Pressable
      style={[styles.card, outOfStock && styles.cardOutOfStock]}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      {/* Placeholder image */}
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

      {/* Card content */}
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

// ── Product section (horizontal scroll) ─────────────────────────────────────

function ProductSection({ title, products }: { title: string; products: Product[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productRow}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
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
        <ProductSection title="On Sale" products={saleProducts} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const PINK = '#D81B60';
const CARD_WIDTH = 165;

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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 14,
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

  // Out of stock
  outOfStockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});
