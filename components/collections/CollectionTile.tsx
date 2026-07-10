// Reusable collection tile for the category grids (M41S2B2, icons M41S5A).
//
// Renders a bundled local category icon resolved from the collection handle
// (see categoryIcons.ts) — no remote image fetch, no network error states.
// Used by both the Categories tab and the compact Home "Shop by Category" row.

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

  return (
    <Pressable
      style={[styles.tile, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${collection.title} category`}
    >
      <View style={[styles.thumb, { height: imageHeight }]}>
        <Image
          source={getLocalCategoryIcon(collection.handle)}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
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
