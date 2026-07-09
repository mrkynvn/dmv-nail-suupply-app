// Reusable collection tile for the category grids (M41S2B2).
//
// Renders a Shopify collection's image (remote HTTPS via RN <Image> only — no
// new native dependency) with a graceful icon fallback when the collection has
// no image or the image fails to load. Used by both the Categories tab and the
// compact Home "Shop by Category" row.

import { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CatalogueCollection } from '../../src/shopify';

const PINK = '#D81B60';

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
  const [errored, setErrored] = useState(false);
  const uri = collection.image?.url;
  const showImage = !!uri && /^https?:\/\//i.test(uri) && !errored;
  const imageLabel = collection.image?.altText?.trim() || collection.title;

  return (
    <Pressable
      style={[styles.tile, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${collection.title} category`}
    >
      <View style={[styles.thumb, { height: imageHeight }]}>
        {showImage ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setErrored(true)}
            accessible
            accessibilityRole="image"
            accessibilityLabel={imageLabel}
          />
        ) : (
          <Ionicons name="pricetags-outline" size={22} color={PINK} />
        )}
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
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
