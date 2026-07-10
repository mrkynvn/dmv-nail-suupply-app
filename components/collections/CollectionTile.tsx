// Reusable collection tile for the category grids (M41S2B2, icons M41S5A).
//
// Renders a bundled local category icon resolved from the collection handle
// (see categoryIcons.ts) — no remote image fetch, no network error states.
// Used by both the Categories tab and the compact Home "Shop by Category" row.

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { CatalogueCollection } from '../../src/shopify';
import { getLocalCategoryIcon } from './categoryIcons';

// Icon renders at ~55% of the image-area height so the artwork's built-in
// safe-area padding stays visually balanced at both tile sizes (64 / 110).
const ICON_SCALE = 0.55;

export function CollectionTile({
  collection,
  onPress,
  imageHeight = 96,
  style,
}: {
  collection: CatalogueCollection;
  onPress: () => void;
  imageHeight?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const iconSize = Math.round(imageHeight * ICON_SCALE);

  // Source order: remote Shopify custom.app_icon (when valid and loadable) →
  // bundled local icon (registry → essentials fallback). The remote image can
  // fail at load time, so a per-tile flag switches to local on error; it resets
  // when the collection handle or remote URL changes.
  const remoteUrl = collection.appIcon?.url;
  const [remoteFailed, setRemoteFailed] = useState(false);
  useEffect(() => {
    setRemoteFailed(false);
  }, [collection.handle, remoteUrl]);

  const useRemote = !!remoteUrl && !remoteFailed;
  const iconSource = useRemote
    ? { uri: remoteUrl }
    : getLocalCategoryIcon(collection.handle);

  return (
    <Pressable
      style={[styles.tile, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${collection.title} category`}
    >
      <View style={[styles.thumb, { height: imageHeight }]}>
        <Image
          source={iconSource}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
          // On remote load failure, fall back to the local icon for this tile.
          onError={useRemote ? () => setRemoteFailed(true) : undefined}
          // Decorative: the Pressable already announces the collection title
          // and role, so hide the icon from VoiceOver to avoid double output.
          accessible={false}
        />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {collection.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    backgroundColor: '#F4F1F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
});
