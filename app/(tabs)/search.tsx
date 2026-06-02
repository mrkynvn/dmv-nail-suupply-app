import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { categories, searchProducts } from '../../src/data';
import { Product } from '../../src/data/types';

const PINK = '#D81B60';

const CHIPS = ['Gel', 'Lamp', 'Glitter', 'Acrylic', 'DND', 'Tools'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  const results = searchProducts(query);
  const hasQuery = query.trim().length > 0;

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>
          Find gel polish, tools, lamps, nail art, and more.
        </Text>
      </View>

      {/* Search input */}
      <View style={styles.inputWrap}>
        <Ionicons name="search-outline" size={18} color="#AAA" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search products, brands, or tags"
          placeholderTextColor="#BBB"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList<Product>
        data={hasQuery ? results : []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          hasQuery ? (
            results.length > 0 ? (
              <Text style={styles.resultCount}>
                {results.length} {results.length === 1 ? 'result' : 'results'} for "{query.trim()}"
              </Text>
            ) : null
          ) : (
            <DefaultState onChipPress={setQuery} />
          )
        }
        ListEmptyComponent={
          hasQuery ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={40} color="#DDD" />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtitle}>
                Try another keyword or check the category list.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const cat = categoryById.get(item.categoryId);
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/product/${item.id}`)}
            >
              {/* Image placeholder */}
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderLabel}>{item.id}</Text>
              </View>

              <View style={styles.cardBody}>
                {/* Badges */}
                <View style={styles.badgeRow}>
                  {item.isNew && (
                    <View style={styles.badgeNew}>
                      <Text style={styles.badgeNewText}>New</Text>
                    </View>
                  )}
                  {item.isOnSale && (
                    <View style={styles.badgeSale}>
                      <Text style={styles.badgeSaleText}>Sale</Text>
                    </View>
                  )}
                  {!item.inStock && (
                    <View style={styles.badgeOos}>
                      <Text style={styles.badgeOosText}>Out of Stock</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.brand}>{item.brand}</Text>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                {cat && (
                  <Text style={styles.categoryLabel}>
                    {cat.icon} {cat.name}
                  </Text>
                )}

                {/* Pricing */}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                  {item.originalPrice != null && (
                    <Text style={styles.originalPrice}>
                      ${item.originalPrice.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function DefaultState({ onChipPress }: { onChipPress: (q: string) => void }) {
  return (
    <View style={styles.defaultWrap}>
      <Ionicons name="search-outline" size={36} color="#DDD" />
      <Text style={styles.defaultTitle}>Start searching</Text>
      <Text style={styles.defaultSubtitle}>
        Try searching for gel, lamp, glitter, acrylic, DND, or Kiara Sky.
      </Text>
      <View style={styles.chipsRow}>
        {CHIPS.map((chip) => (
          <Pressable
            key={chip}
            style={styles.chip}
            onPress={() => onChipPress(chip)}
          >
            <Text style={styles.chipText}>{chip}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
  },

  // Input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 8,
  },
  inputIcon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
  },

  // Result card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#F0EFF4',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 10,
  },
  imagePlaceholderLabel: {
    fontSize: 10,
    color: '#BBBBBE',
    fontWeight: '500',
  },
  cardBody: {
    padding: 14,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  badgeNew: {
    backgroundColor: '#FCE4EC',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '700',
    color: PINK,
  },
  badgeSale: {
    backgroundColor: '#FFF3E0',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeSaleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E65100',
  },
  badgeOos: {
    backgroundColor: '#EEEEEE',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeOosText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  brand: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    lineHeight: 20,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#7B1FA2',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  originalPrice: {
    fontSize: 13,
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#444',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Default state
  defaultWrap: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  defaultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
  },
  defaultSubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chipText: {
    fontSize: 13,
    color: PINK,
    fontWeight: '600',
  },
});
