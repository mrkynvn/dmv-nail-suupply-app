import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  loadCheckoutProfile,
  clearCheckoutProfile,
  type CheckoutProfile,
  type LoadCheckoutProfileResult,
} from '../../src/checkout/profile';
import { useAuth } from '../../src/auth/AuthContext';

const PINK = '#D81B60';

// Profile UI state. `null` profile means "no successful load settled yet".
type ProfileState = {
  loading: boolean;
  profile: CheckoutProfile | null; // last known-good profile
  error: 'storage' | 'corrupt' | null;
  loaded: boolean; // a successful load has settled at least once
};

export default function AccountScreen() {
  // Bind the Account screen to the auth boundary. This subscribes to auth
  // context and enforces that an AuthProvider is present. M31 is guest-first, so
  // the screen renders the established guest experience below; a later milestone
  // will introduce the authenticated Account view.
  useAuth();

  const [profileState, setProfileState] = useState<ProfileState>({
    loading: true,
    profile: null,
    error: null,
    loaded: false,
  });

  // Clear-saved-details management state. `clearError` drives a soft inline
  // warning; a removal failure never asserts the underlying storage is gone.
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(false);

  const activeRef = useRef(true);
  // Synchronous guard against a duplicate clear while removal is in flight.
  const clearingRef = useRef(false);

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

  // Read the saved checkout profile. Reused by focus-refresh and Try Again.
  const refresh = useCallback(() => {
    loadCheckoutProfile()
      .then((result) => {
        if (activeRef.current) applyProfileResult(result);
      })
      .catch(() => {
        if (activeRef.current) applyProfileFailure();
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

  // Remove the saved checkout profile, then reuse the standard refresh path so
  // the card settles into its existing "No saved details yet" empty state. Only
  // the profile key is touched; order history is a separate key and untouched.
  const onClearConfirmed = useCallback(() => {
    if (clearingRef.current) return; // duplicate-tap guard
    clearingRef.current = true;
    setClearing(true);
    setClearError(false);

    clearCheckoutProfile()
      .then(() => {
        if (activeRef.current) refresh();
      })
      .catch(() => {
        // I/O failure: keep the displayed details, surface a soft warning, and
        // make no claim about the actual stored bytes.
        if (activeRef.current) setClearError(true);
      })
      .finally(() => {
        clearingRef.current = false;
        if (activeRef.current) setClearing(false);
      });
  }, [refresh]);

  const onPressClear = useCallback(() => {
    Alert.alert(
      'Clear saved details?',
      'This will remove your saved checkout details from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: onClearConfirmed },
      ],
    );
  }, [onClearConfirmed]);

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

        {/* Saved local details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Saved local details</Text>
          <Text style={styles.sectionExplanation}>
            These details are stored only on this device and are no longer used
            to place orders.
          </Text>
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
              <Text style={styles.detailNote}>Stored only on this device.</Text>

              {clearError ? (
                <View style={styles.refreshWarning}>
                  <Ionicons name="alert-circle-outline" size={15} color={PINK} />
                  <Text style={styles.refreshWarningText}>
                    Couldn’t clear your saved details. Please try again.
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.clearBtn, clearing && styles.clearBtnDisabled]}
                onPress={onPressClear}
                disabled={clearing}
              >
                {clearing ? (
                  <ActivityIndicator size="small" color={PINK} />
                ) : (
                  <Text style={styles.clearBtnText}>Clear Saved Details</Text>
                )}
              </Pressable>
            </>
          ) : (
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>No saved details</Text>
              <Text style={styles.stateMessage}>
                There are no saved details on this device.
              </Text>
            </View>
          )}
        </View>

        {/* Local transparency footer */}
        <Text style={styles.footerNote}>
          You're browsing as a guest. Any saved details stay only on this device.
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
  sectionExplanation: {
    fontSize: 13,
    color: '#777',
    lineHeight: 19,
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

  clearBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 18,
    marginTop: 4,
    minHeight: 38,
    justifyContent: 'center',
  },
  clearBtnDisabled: {
    opacity: 0.6,
  },
  clearBtnText: {
    color: PINK,
    fontWeight: '700',
    fontSize: 14,
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
