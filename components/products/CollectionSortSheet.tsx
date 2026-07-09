// Bottom-sheet sort picker for collection product lists (M41S2C2B).
//
// Presentational: renders the five app-facing CollectionSortOption choices in a
// React Native core Modal and reports the pick — the owning screen holds the
// selected sort and drives the refetch. Lives in components/products (not
// components/ui) because it knows the Shopify sort option type.

import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CollectionSortOption } from '../../src/shopify';

const PINK = '#D81B60';

// User-facing label per sort option. Record over the union keeps this
// exhaustive: adding/removing an option in src/shopify breaks the build here.
export const COLLECTION_SORT_LABELS: Record<CollectionSortOption, string> = {
  featured: 'Featured',
  newest: 'Newest',
  'price-low-high': 'Price: Low to High',
  'price-high-low': 'Price: High to Low',
  'title-az': 'Title: A to Z',
};

// Display order of the sheet rows (the Record above carries no order).
const SORT_ORDER: readonly CollectionSortOption[] = [
  'featured',
  'newest',
  'price-low-high',
  'price-high-low',
  'title-az',
];

export function CollectionSortSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: CollectionSortOption;
  onSelect: (option: CollectionSortOption) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      // Android back button / iOS accessibility escape gesture.
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sort options"
        />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title} accessibilityRole="header">
            Sort by
          </Text>
          <View accessibilityRole="radiogroup">
            {SORT_ORDER.map((option) => {
              const isSelected = option === selected;
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => onSelect(option)}
                  accessibilityRole="radio"
                  accessibilityLabel={COLLECTION_SORT_LABELS[option]}
                  accessibilityState={{ checked: isSelected }}
                >
                  <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                    {COLLECTION_SORT_LABELS[option]}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color={PINK} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdrop: {
    // Everything above the sheet dismisses on tap.
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    // Clears the home indicator on notched iPhones without a safe-area dep.
    paddingBottom: 36,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  rowPressed: {
    backgroundColor: '#FAFAFA',
  },
  rowLabel: {
    fontSize: 15,
    color: '#444',
  },
  rowLabelSelected: {
    color: PINK,
    fontWeight: '600',
  },
});
