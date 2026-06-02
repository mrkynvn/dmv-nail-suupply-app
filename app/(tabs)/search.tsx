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
import { ProductCard } from '../../components/products/ProductCard';

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
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              showFavorite
              imageHeight={140}
              categoryLabel={cat ? `${cat.icon} ${cat.name}` : undefined}
              style={styles.searchCard}
            />
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

  // Search result card wrapper (spacing between items)
  searchCard: {
    marginBottom: 12,
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
