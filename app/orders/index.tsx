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
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { loadOrders, type LoadOrdersResult } from '../../src/orders/storage';
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

function itemCount(order: LocalOrder): number {
  return order.items.reduce((sum, i) => sum + i.quantity, 0);
}

export default function OrderHistoryScreen() {
  const router = useRouter();

  // `orders === null` means "no successful load has settled yet" (initial spinner).
  const [orders, setOrders] = useState<LocalOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'storage' | 'corrupt' | null>(null);
  const mountedRef = useRef(true);

  const applyResult = useCallback((result: LoadOrdersResult) => {
    if (result.ok) {
      setOrders(result.orders);
      setError(null);
    } else {
      setError(result.reason);
      // Preserve previously loaded good list data on a later refresh failure;
      // only settle to an empty list if nothing was ever loaded.
      setOrders((prev) => prev ?? []);
    }
    setLoading(false);
  }, []);

  const applyFailure = useCallback(() => {
    setError('storage');
    setOrders((prev) => prev ?? []);
    setLoading(false);
  }, []);

  // Reload whenever the screen regains focus, not just on first mount.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      mountedRef.current = true;
      loadOrders()
        .then((result) => {
          if (active) applyResult(result);
        })
        .catch(() => {
          if (active) applyFailure();
        });
      return () => {
        active = false;
        mountedRef.current = false;
      };
    }, [applyResult, applyFailure]),
  );

  const onRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    loadOrders()
      .then((result) => {
        if (mountedRef.current) applyResult(result);
      })
      .catch(() => {
        if (mountedRef.current) applyFailure();
      });
  }, [applyResult, applyFailure]);

  const hasOrders = orders != null && orders.length > 0;
  const showErrorState = error != null && !hasOrders;
  const showEmptyState = !loading && !showErrorState && orders != null && orders.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && orders == null ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      ) : showErrorState ? (
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline-outline" size={56} color="#CCC" />
          <Text style={styles.stateTitle}>
            {error === 'corrupt' ? 'Order history unavailable' : 'Couldn’t load orders'}
          </Text>
          <Text style={styles.stateMessage}>
            {error === 'corrupt'
              ? 'Your saved order history could not be read.'
              : 'Something went wrong reading your saved orders.'}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={onRetry}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      ) : showEmptyState ? (
        <View style={styles.centerFill}>
          <Ionicons name="receipt-outline" size={56} color="#CCC" />
          <Text style={styles.stateTitle}>No orders yet</Text>
          <Text style={styles.stateMessage}>
            Your placed orders will appear here.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/')}>
            <Text style={styles.primaryBtnText}>Shop Now</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* A refresh failure while good data is still shown surfaces a soft banner. */}
          {error != null && hasOrders ? (
            <View style={styles.refreshErrorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={PINK} />
              <Text style={styles.refreshErrorText}>
                Couldn’t refresh. Showing your last saved orders.
              </Text>
            </View>
          ) : null}

          {(orders ?? []).map((order) => {
            const count = itemCount(order);
            return (
              <Pressable
                key={order.id}
                style={styles.orderRow}
                onPress={() => router.push(`/orders/${order.id}`)}
                android_ripple={{ color: '#F0F0F0' }}
              >
                <View style={styles.orderRowLeft}>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.orderMeta}>{formatDate(order.createdAt)}</Text>
                  <View style={styles.statusChip}>
                    <Text style={styles.statusChipText}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Text>
                  </View>
                </View>
                <View style={styles.orderRowRight}>
                  <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                  <Text style={styles.orderMeta}>
                    {count} item{count !== 1 ? 's' : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#CCC" />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
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

  listContent: {
    padding: 16,
    gap: 12,
  },
  refreshErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5F8',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 10,
    padding: 12,
  },
  refreshErrorText: {
    flex: 1,
    fontSize: 12,
    color: PINK,
    fontWeight: '500',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orderRowLeft: {
    flex: 1,
    gap: 6,
  },
  orderRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 0.3,
  },
  orderMeta: {
    fontSize: 12,
    color: '#999',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: PINK,
  },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0F5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: PINK,
    letterSpacing: 0.3,
  },
});
