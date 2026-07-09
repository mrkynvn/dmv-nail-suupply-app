// Shared loading / error / empty UI blocks for Shopify-backed screens (M41S2B2).
//
// Presentational only. Sized with vertical padding (not flex:1) so they render
// correctly both as a full-screen state and when embedded inside a scroll view
// section (e.g. the Home category grid).

import { ComponentProps } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const PINK = '#D81B60';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={PINK} accessibilityLabel={label} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color="#DDD" />
      <Text style={styles.title}>Couldn’t load</Text>
      <Text style={styles.muted}>{message ?? 'Please try again.'}</Text>
      {onRetry && (
        <Pressable
          style={styles.retryBtn}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({
  message,
  icon = 'file-tray-outline',
}: {
  message: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color="#DDD" />
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  muted: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: PINK,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
