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
import {
  loadCheckoutProfile,
  type CheckoutProfile,
  type LoadCheckoutProfileResult,
} from '../../src/checkout/profile';
import { loadOrders } from '../../src/orders/storage';

const PINK = '#D81B60';

// Profile UI state. `null` profile means "no successful load settled yet".
type ProfileState = {
  loading: boolean;
  profile: CheckoutProfile | null; // last known-good profile
  error: 'storage' | 'corrupt' | null;
  loaded: boolean; // a successful load has settled at least once
};

// Order-count UI state. Only a successful load produces a count; any failure
// (or in-flight) leaves count null and the row falls back to neutral copy.
type OrderCountState = {
  count: number | null;
};

function orderSubtitle(count: number | null): string {
  if (count === null) return 'View your order history';
  if (count === 0) return 'No orders yet';
  if (count === 1) return '1 order saved on this device';
  return `${count} orders saved on this device`;
}

export default function AccountScreen() {
  const router = useRouter();

  const [profileState, setProfileState] = useState<ProfileState>({
    loading: true,
    profile: null,
    error: null,
    loaded: false,
  });
  const [orderCount, setOrderCount] = useState<OrderCountState>({ count: null });

  const activeRef = useRef(true);

  const applyProfileResult = useCallback((result: LoadCheckoutProfileResult) => {
    setProfileState((prev) => {
      if (result.ok) {
        // Fresh good data (profile object or a genuine empty profile).
        return { loading: false, profile: result.profile, error: null, loaded: true };
      }
      // Failure: preserve last known-good profile if we ever had one.
      return { ...prev, loading: false, error: result.reason };
    });
  }, []);

  const applyProfileFailure = useCallback(() => {
    setProfileState((prev) => ({ ...prev, loading: false, error: 'storage' }));
  }, []);

  // Read profile + order count together. Reused by focus-refresh and Try Again.
  const refresh = useCallback(() => {
    loadCheckoutProfile()
      .then((result) => {
        if (activeRef.current) applyProfileResult(result);
      })
      .catch(() => {
        if (activeRef.current) applyProfileFailure();
      });

    // Order count is a soft enhancement: only a successful load sets a count;
    // any failure leaves the previous count (or null) so the row degrades to
    // neutral copy rather than a misleading zero.
    loadOrders()
      .then((result) => {
        if (!activeRef.current) return;
        if (result.ok) setOrderCount({ count: result.orders.length });
      })
      .catch(() => {
        /* Neutral fallback; never surface an order error on Account. */
      });
  }, [applyProfileResult, applyProfileFailure]);

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      refresh();
      return () => {
        activeRef.current = false;
      };
    }, [refresh]),
  );

  const onRetryProfile = useCallback(() => {
    setProfileState((prev) => ({ ...prev, loading: true, error: null }));
    refresh();
  }, [refresh]);

  const { loading, profile, error, loaded } = profileState;
  const showInitialLoading = loading && !loaded;
  // A failure only takes over the section when we have no good profile to show.
  const showUnavailable = error != null && profile == null;
  // A refresh failure while good data is on screen shows a soft banner instead.
  const showRefreshWarning = error != null && profile != null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Guest identity */}
        <View style={styles.identityCard}>
          <View style={styles.identityIcon}>
            <Ionicons name="person-circle-outline" size={30} color={PINK} />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.identityTitle}>Guest Account</Text>
            <Text style={styles.identitySubtitle}>You're shopping as a guest.</Text>
          </View>
        </View>

        {/* Saved checkout details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Checkout Details</Text>
          <View style={styles.divider} />

          {showInitialLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={PINK} />
            </View>
          ) : showUnavailable ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>Saved details are unavailable</Text>
              <Text style={styles.stateMessage}>Please try again.</Text>
              <Pressable style={styles.tryAgainBtn} onPress={onRetryProfile}>
                <Text style={styles.tryAgainText}>Try Again</Text>
              </Pressable>
            </View>
          ) : profile != null ? (
            <>
              {showRefreshWarning ? (
                <View style={styles.refreshWarning}>
                  <Ionicons name="alert-circle-outline" size={15} color={PINK} />
                  <Text style={styles.refreshWarningText}>
                    Couldn’t refresh. Showing your last saved details.
                  </Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{profile.fullName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{profile.email}</Text>
              </View>
              <Text style={styles.detailNote}>Saved from your last checkout.</Text>
            </>
          ) : (
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>No saved details yet</Text>
              <Text style={styles.stateMessage}>
                Your details will appear here after your first checkout.
              </Text>
            </View>
          )}
        </View>

        {/* My Orders */}
        <View style={styles.menuCard}>
          <Pressable
            style={styles.menuRow}
            onPress={() => router.push('/orders')}
            android_ripple={{ color: '#F0F0F0' }}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="receipt-outline" size={20} color={PINK} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>My Orders</Text>
              <Text style={styles.menuSub}>{orderSubtitle(orderCount.count)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </Pressable>
        </View>

        {/* Local transparency footer */}
        <Text style={styles.footerNote}>
          You're browsing as a guest. Your saved checkout details and orders stay on this device.
        </Text>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  identityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  identityTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  identitySubtitle: {
    fontSize: 13,
    color: '#999',
  },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },

  inlineLoading: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  stateBlock: {
    gap: 6,
    paddingVertical: 2,
  },
  stateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  stateMessage: {
    fontSize: 13,
    color: '#777',
    lineHeight: 19,
  },
  tryAgainBtn: {
    alignSelf: 'flex-start',
    backgroundColor: PINK,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  tryAgainText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  refreshWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5F8',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 10,
    padding: 10,
  },
  refreshWarningText: {
    flex: 1,
    fontSize: 12,
    color: PINK,
    fontWeight: '500',
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    width: 56,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 13,
    color: '#111',
    flex: 1,
    flexWrap: 'wrap',
  },
  detailNote: {
    fontSize: 12,
    color: '#AAA',
    fontStyle: 'italic',
  },

  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  menuSub: {
    fontSize: 12,
    color: '#999',
  },

  footerNote: {
    fontSize: 12,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
    marginTop: 4,
  },
});
