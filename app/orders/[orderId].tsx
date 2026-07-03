import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { loadOrders } from '../../src/orders/storage';
import { ORDER_STATUS_LABELS, type LocalOrder } from '../../src/orders/types';

const PINK = '#D81B60';

function formatDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type LoadState = 'loading' | 'found' | 'notfound' | 'error';

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;

  const [state, setState] = useState<LoadState>('loading');
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    setState('loading');
    loadOrders()
      .then((result) => {
        if (!activeRef.current) return;
        if (!result.ok) {
          setState('error');
          return;
        }
        // Resolve strictly by opaque id, never by display order number.
        const found = result.orders.find((o) => o.id === orderId) ?? null;
        setOrder(found);
        setState(found ? 'found' : 'notfound');
      })
      .catch(() => {
        if (activeRef.current) setState('error');
      });
    return () => {
      activeRef.current = false;
    };
  }, [orderId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {state === 'loading' ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      ) : state === 'found' && order ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Order header */}
          <View style={styles.card}>
            <View style={styles.orderNumberBadge}>
              <Text style={styles.orderNumberLabel}>Order Number</Text>
              <Text style={styles.orderNumberValue}>{order.orderNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{formatDate(order.createdAt)}</Text>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Text>
              </View>
            </View>
          </View>

          {/* Items */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.divider} />
            {order.items.map((item) => {
              const saleOriginal =
                item.isOnSale === true &&
                typeof item.originalPrice === 'number' &&
                item.originalPrice > item.unitPrice
                  ? item.originalPrice
                  : null;
              return (
                <View key={item.productId} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    {item.brand ? (
                      <Text style={styles.lineItemBrand}>{item.brand}</Text>
                    ) : null}
                    <Text style={styles.lineItemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.priceLine}>
                      {saleOriginal != null ? (
                        <Text style={styles.strikePrice}>
                          ${saleOriginal.toFixed(2)}
                        </Text>
                      ) : null}
                      <Text style={styles.lineItemUnitPrice}>
                        ${item.unitPrice.toFixed(2)} each · Qty: {item.quantity}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.lineItemTotal}>${item.lineTotal.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>

          {/* Pricing */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${order.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>${order.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Contact / shipping */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.divider} />
            <InfoRow label="Name" value={order.contact.fullName} />
            <InfoRow label="Email" value={order.contact.email} />
            <InfoRow label="Phone" value={order.contact.phone} />
            <View style={styles.divider} />
            <Text style={styles.subSectionTitle}>Shipping Address</Text>
            <InfoRow label="Address" value={order.contact.address} />
            <InfoRow label="City" value={order.contact.city} />
            <InfoRow label="State" value={order.contact.state} />
            <InfoRow label="ZIP" value={order.contact.zip} />
            {order.contact.note.trim() ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.subSectionTitle}>Order Note</Text>
                <Text style={styles.noteValue}>{order.contact.note.trim()}</Text>
              </>
            ) : null}
          </View>

          <Text style={styles.disclaimer}>
            This is a local mock order. No payment has been processed.
          </Text>
        </ScrollView>
      ) : state === 'notfound' ? (
        <View style={styles.centerFill}>
          <Ionicons name="help-circle-outline" size={56} color="#CCC" />
          <Text style={styles.stateTitle}>Order not found</Text>
          <Text style={styles.stateMessage}>
            We couldn’t find this order in your history.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline-outline" size={56} color="#CCC" />
          <Text style={styles.stateTitle}>Couldn’t load order</Text>
          <Text style={styles.stateMessage}>
            Something went wrong reading your saved orders.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  headerSpacer: { width: 32 },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },

  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  stateMessage: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orderNumberBadge: {
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  orderNumberLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  orderNumberValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PINK,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 13,
    color: '#777',
  },
  statusChip: {
    backgroundColor: '#FFF0F5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: PINK,
    letterSpacing: 0.3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  priceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  strikePrice: {
    fontSize: 12,
    color: '#BBB',
    textDecorationLine: 'line-through',
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

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
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

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    width: 64,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    color: '#111',
    flex: 1,
    flexWrap: 'wrap',
  },
  noteValue: {
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
  },

  disclaimer: {
    fontSize: 11,
    color: '#BBB',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
