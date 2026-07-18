import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCart, getLineKey, ShopifyCartItem } from '../../src/cart/CartContext';

const PINK = '#D81B60';

function formatMoney(amount: number, currencyCode: string): string {
  return currencyCode === 'USD'
    ? `$${amount.toFixed(2)}`
    : `${amount.toFixed(2)} ${currencyCode}`;
}

function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: ShopifyCartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const lineTotal = item.unitPrice * item.quantity;

  return (
    <View style={styles.itemCard}>
      {/* Image (denormalized at add-time) */}
      <View style={styles.itemImage}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.itemImageLabel} numberOfLines={1}>
            {item.title}
          </Text>
        )}
      </View>

      <View style={styles.itemInfo}>
        {item.vendor ? <Text style={styles.itemBrand}>{item.vendor}</Text> : null}
        <Text style={styles.itemName} numberOfLines={2}>
          {item.title}
        </Text>
        {item.variantTitle ? (
          <Text style={styles.itemVariant} numberOfLines={1}>
            {item.variantTitle}
          </Text>
        ) : null}
        <Text style={styles.itemPrice}>
          {formatMoney(item.unitPrice, item.currencyCode)} each
        </Text>
        {!item.availableForSale ? (
          <Text style={styles.itemOos}>Currently out of stock</Text>
        ) : null}

        <View style={styles.itemBottom}>
          {/* Quantity controls */}
          <View style={styles.qtyRow}>
            <Pressable
              style={styles.qtyBtn}
              onPress={onDecrement}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Decrease quantity for ${item.title}`}
            >
              <Ionicons name="remove" size={16} color={PINK} />
            </Pressable>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <Pressable
              style={styles.qtyBtn}
              onPress={onIncrement}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Increase quantity for ${item.title}`}
            >
              <Ionicons name="add" size={16} color={PINK} />
            </Pressable>
          </View>

          <Text style={styles.lineTotal}>
            {formatMoney(lineTotal, item.currencyCode)}
          </Text>
        </View>
      </View>

      {/* Remove */}
      <Pressable
        style={styles.removeBtn}
        onPress={onRemove}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.title} from cart`}
      >
        <Ionicons name="close-circle" size={20} color="#BBBBBB" />
      </Pressable>
    </View>
  );
}

export default function CartScreen() {
  const {
    items,
    subtotal,
    totalQuantity,
    currencyCode,
    currencyConsistent,
    incrementLine,
    decrementLine,
    removeLine,
    clearCart,
  } = useCart();
  const router = useRouter();

  function handleClearCart() {
    Alert.alert('Clear cart?', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  }

  function handleCheckout() {
    router.push('/checkout');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cart</Text>
        {totalQuantity > 0 ? (
          <Pressable onPress={handleClearCart} hitSlop={8}>
            <Text style={styles.clearCartText}>Clear Cart</Text>
          </Pressable>
        ) : (
          <Text style={styles.headerCount} />
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#DDDDDD" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse categories, search for products, or check out today's promotions.
          </Text>
          <Pressable style={styles.startShoppingBtn} onPress={() => router.push('/')}>
            <Text style={styles.startShoppingText}>Start Shopping</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const lineKey = getLineKey(item);
              return (
                <CartItemRow
                  key={lineKey}
                  item={item}
                  onIncrement={() => incrementLine(lineKey)}
                  onDecrement={() => decrementLine(lineKey)}
                  onRemove={() => removeLine(lineKey)}
                />
              );
            })}
          </ScrollView>

          {/* Summary bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Subtotal ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
              </Text>
              {currencyConsistent && currencyCode ? (
                <Text style={styles.summaryValue}>{formatMoney(subtotal, currencyCode)}</Text>
              ) : (
                // Defensive: never show a misleading combined total across currencies.
                <Text style={styles.summaryValue}>—</Text>
              )}
            </View>
            <Pressable style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutBtnText}>Review Selection</Text>
            </Pressable>
            <Text style={styles.reviewNote}>
              Checkout is completed securely on Shopify. Review your selection next.
            </Text>
          </View>
        </>
      )}
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
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  headerCount: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  clearCartText: {
    fontSize: 13,
    color: PINK,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  startShoppingBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  startShoppingText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 12,
  },

  // Item card
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemImage: {
    width: 90,
    backgroundColor: '#F0EFF4',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 6,
  },
  itemImageLabel: {
    fontSize: 9,
    color: '#BBBBBE',
    fontWeight: '500',
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  itemBrand: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 12,
    color: '#777',
  },
  itemVariant: {
    fontSize: 11,
    color: '#999',
  },
  itemOos: {
    fontSize: 11,
    color: '#D32F2F',
    fontWeight: '600',
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: {
    padding: 2,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    minWidth: 20,
    textAlign: 'center',
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Summary bar
  summaryBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  checkoutBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  checkoutBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  reviewNote: {
    fontSize: 11,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 16,
  },
});
