import { FlatList, View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getOnSaleProducts } from '../src/data';
import { Product } from '../src/data';
import { ProductCard } from '../components/products/ProductCard';

const PINK = '#D81B60';

function savingsAmount(p: Product): number {
  if (p.originalPrice == null) return 0;
  return p.originalPrice - p.price;
}

export default function PromotionsScreen() {
  const saleProducts = getOnSaleProducts().slice().sort(
    (a, b) => savingsAmount(b) - savingsAmount(a),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#222" />
        </Pressable>
        <Text style={styles.headerTitle}>Limited Offers</Text>
        {saleProducts.length > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{saleProducts.length} deals</Text>
          </View>
        ) : (
          <View style={styles.badgePlaceholder} />
        )}
      </View>

      {/* Product grid */}
      <FlatList
        data={saleProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.emptyTitle}>No promotions right now</Text>
            <Text style={styles.emptySubtitle}>
              Check back soon for new limited offers.
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

  // Header
  header: {
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  badge: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  badgePlaceholder: {
    width: 0,
  },

  // Grid
  grid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
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
