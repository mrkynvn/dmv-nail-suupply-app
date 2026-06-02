import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCart } from '../src/cart/CartContext';
import { getProductById } from '../src/data';

const PINK = '#D81B60';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, subtotal, totalQuantity } = useCart();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Placeholder notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color={PINK} />
          <Text style={styles.noticeText}>
            Checkout is coming soon. This screen is a placeholder. Payment and Shopify checkout are not connected yet.
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your cart is empty.</Text>
            <Pressable style={styles.backToCartBtn} onPress={() => router.back()}>
              <Text style={styles.backToCartText}>Back to Cart</Text>
            </Pressable>
            <Pressable style={styles.continueShoppingBtn} onPress={() => router.push('/')}>
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Order summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <Text style={styles.itemCount}>
                {totalQuantity} item{totalQuantity !== 1 ? 's' : ''}
              </Text>

              <View style={styles.divider} />

              {items.map((item) => {
                const product = getProductById(item.productId);
                if (!product) return null;
                const lineTotal = product.price * item.quantity;
                return (
                  <View key={item.productId} style={styles.lineItem}>
                    <View style={styles.lineItemLeft}>
                      <Text style={styles.lineItemBrand}>{product.brand}</Text>
                      <Text style={styles.lineItemName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={styles.lineItemUnitPrice}>
                        ${product.price.toFixed(2)} each · Qty: {item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.lineItemTotal}>${lineTotal.toFixed(2)}</Text>
                  </View>
                );
              })}

              <View style={styles.divider} />

              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>${subtotal.toFixed(2)}</Text>
              </View>

              <Text style={styles.shippingNote}>
                Shipping and taxes will be calculated at checkout.
              </Text>

              <View style={styles.divider} />

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>${subtotal.toFixed(2)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Place Order button */}
        <View style={styles.placeOrderSection}>
          <Pressable style={styles.placeOrderBtn} disabled>
            <Text style={styles.placeOrderText}>Place Order</Text>
          </Pressable>
          <Text style={styles.placeOrderHint}>
            Checkout integration will be added in a future milestone.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  noticeCard: {
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FADADD',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    fontWeight: '500',
  },
  backToCartBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  backToCartText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  continueShoppingBtn: {
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  continueShoppingText: {
    color: PINK,
    fontWeight: '700',
    fontSize: 15,
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  itemCount: {
    fontSize: 13,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 2,
  },
  lineItemLeft: {
    flex: 1,
    gap: 2,
  },
  lineItemBrand: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  lineItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
    lineHeight: 18,
  },
  lineItemUnitPrice: {
    fontSize: 12,
    color: '#999',
  },
  lineItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  shippingNote: {
    fontSize: 11,
    color: '#AAA',
    fontStyle: 'italic',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: PINK,
  },

  placeOrderSection: {
    gap: 10,
    alignItems: 'center',
  },
  placeOrderBtn: {
    backgroundColor: '#CCCCCC',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  placeOrderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  placeOrderHint: {
    fontSize: 12,
    color: '#AAA',
    textAlign: 'center',
  },
});
