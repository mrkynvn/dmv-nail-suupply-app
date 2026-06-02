import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { categories, getProductsByCategory } from '../../src/data';
import { ProductCard } from '../../components/products/ProductCard';

// ── Category screen ───────────────────────────────────────────────────────────

export default function CategoryScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();

  const category = categories.find((c) => c.id === categoryId);

  if (!category) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Category not found</Text>
          <Pressable style={styles.notFoundBack} onPress={() => router.back()}>
            <Text style={styles.notFoundBackText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const categoryProducts = getProductsByCategory(categoryId);
  const count = categoryProducts.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={PINK} />
        </Pressable>
        <View style={styles.headerBody}>
          <Text style={styles.headerIcon}>{category.icon}</Text>
          <View>
            <Text style={styles.headerTitle}>{category.name}</Text>
            <Text style={styles.headerCount}>
              {count} {count === 1 ? 'product' : 'products'}
            </Text>
          </View>
        </View>
      </View>

      {/* Product grid */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {count === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products in this category yet.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {categoryProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => router.push(`/product/${product.id}`)}
                showFavorite
                imageHeight={140}
                style={styles.gridCard}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const PINK = '#D81B60';

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    fontSize: 28,
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

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Product grid (2 columns)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '50%',
  },

  // Not found
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
  },
  notFoundBack: {
    backgroundColor: PINK,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  notFoundBackText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Empty state
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
  },
});
