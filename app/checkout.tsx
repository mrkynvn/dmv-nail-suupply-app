import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCart, getLineKey, ShopifyCartItem } from '../src/cart/CartContext';
import { createShopifyCheckout } from '../src/shopify';

const PINK = '#D81B60';

function formatMoney(amount: number, currencyCode: string): string {
  return currencyCode === 'USD'
    ? `$${amount.toFixed(2)}`
    : `${amount.toFixed(2)} ${currencyCode}`;
}

// A cart line renders entirely from denormalized fields captured at add-time, so
// it never depends on any catalogue.
function ReviewLine({ item }: { item: ShopifyCartItem }) {
  const lineTotal = item.unitPrice * item.quantity;
  return (
    <View style={styles.lineItem}>
      <View style={styles.lineItemLeft}>
        {item.vendor ? <Text style={styles.lineItemBrand}>{item.vendor}</Text> : null}
        <Text style={styles.lineItemName} numberOfLines={2}>
          {item.title}
        </Text>
        {item.variantTitle ? (
          <Text style={styles.lineItemVariant} numberOfLines={1}>
            {item.variantTitle}
          </Text>
        ) : null}
        <Text style={styles.lineItemUnitPrice}>
          {formatMoney(item.unitPrice, item.currencyCode)} each · Qty: {item.quantity}
        </Text>
      </View>
      <Text style={styles.lineItemTotal}>
        {formatMoney(lineTotal, item.currencyCode)}
      </Text>
    </View>
  );
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, subtotal, totalQuantity, currencyCode, currencyConsistent } = useCart();

  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);
  // True once the checkout browser has opened and been closed/returned at least
  // once this session. Drives neutral post-return copy only — it makes NO claim
  // about whether an order was placed. Non-persistent (resets on unmount).
  const [checkoutReturned, setCheckoutReturned] = useState(false);

  // Every non-empty cart is Shopify checkout eligible.
  const canCheckout = items.length > 0;

  // Create a Storefront cart from the cart lines and open Shopify's hosted secure
  // checkout in an in-app browser. We do NOT persist the cart, clear the cart, or
  // claim the order completed here.
  const handleCheckout = async () => {
    if (!canCheckout || status === 'loading') return;
    setError(null);
    setCheckoutReturned(false);
    setStatus('loading');
    try {
      const lines = items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
      const { checkoutUrl } = await createShopifyCheckout(lines);
      // Resolves when the in-app browser is dismissed/closed. We treat ANY return
      // (cancel, dismiss, done) as simply "came back from checkout" — making no
      // claim about order state, not clearing the cart, not persisting anything.
      await WebBrowser.openBrowserAsync(checkoutUrl);
      setCheckoutReturned(true);
    } catch {
      // Keep the message user-safe: never surface GraphQL/token/URL/cart id.
      setError("We couldn't start secure checkout. Please try again.");
    } finally {
      setStatus('idle');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Review Selection</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Secure-checkout notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={22} color={PINK} />
          <Text style={styles.noticeText}>
            Your items check out on Shopify's secure checkout. Payment and delivery
            are handled by Shopify, not inside this app.
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={56} color="#DDDDDD" />
            <Text style={styles.emptyText}>You haven't selected any items yet.</Text>
            <Pressable style={styles.continueShoppingBtn} onPress={() => router.push('/')}>
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Read-only selection summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Your Selection</Text>
              <Text style={styles.itemCount}>
                {totalQuantity} item{totalQuantity !== 1 ? 's' : ''}
              </Text>

              <View style={styles.divider} />

              {items.map((item) => (
                <ReviewLine key={getLineKey(item)} item={item} />
              ))}

              <View style={styles.divider} />

              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>
                  {currencyConsistent && currencyCode
                    ? formatMoney(subtotal, currencyCode)
                    : '—'}
                </Text>
              </View>
            </View>

            <View style={styles.checkoutBlock}>
              <Text style={styles.secureCopy}>
                Continuing opens Shopify's secure checkout in a private browser
                window to complete your purchase. Final taxes and shipping are
                shown there.
              </Text>

              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons name="warning-outline" size={16} color="#B00020" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.checkoutBtn, status === 'loading' && styles.checkoutBtnDisabled]}
                onPress={handleCheckout}
                disabled={status === 'loading'}
                accessibilityRole="button"
                accessibilityState={{ disabled: status === 'loading' }}
                accessibilityLabel="Continue to secure checkout"
              >
                {status === 'loading' ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.checkoutBtnText}>Preparing secure checkout…</Text>
                  </>
                ) : (
                  <Text style={styles.checkoutBtnText}>Continue to Secure Checkout</Text>
                )}
              </Pressable>

              {checkoutReturned && !error ? (
                <View style={styles.returnedNotice}>
                  <Ionicons name="information-circle-outline" size={16} color={PINK} />
                  <Text style={styles.returnedNoticeText}>
                    If you completed checkout, Shopify will send confirmation. Your
                    cart stays here until you remove items.
                  </Text>
                </View>
              ) : null}
            </View>

            <Pressable style={styles.continueShoppingBtn} onPress={() => router.push('/')}>
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </Pressable>
          </>
        )}
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
    paddingBottom: 40,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF5F8',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 12,
    padding: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#B0004E',
    fontWeight: '500',
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
    textAlign: 'center',
  },

  continueShoppingBtn: {
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
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
  lineItemVariant: {
    fontSize: 12,
    color: '#777',
    fontWeight: '500',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: PINK,
  },

  checkoutBlock: {
    gap: 12,
  },
  secureCopy: {
    fontSize: 12,
    color: '#777',
    lineHeight: 18,
    textAlign: 'center',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 28,
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  returnedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF5F8',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 10,
    padding: 12,
  },
  returnedNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#B0004E',
    fontWeight: '500',
    lineHeight: 17,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FDECEE',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B00020',
    fontWeight: '500',
    lineHeight: 17,
  },
});
