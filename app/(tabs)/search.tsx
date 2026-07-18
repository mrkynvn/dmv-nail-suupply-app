import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { searchCatalogueProducts } from '../../src/shopify';
import type { CatalogueProduct } from '../../src/shopify';
import { ShopifyProductCard } from '../../components/products/ShopifyProductCard';
import { catalogueProductToCardModel } from '../../components/products/productCardModel';
import { usePagedData } from '../../components/ui/usePagedData';
import { LoadingState, ErrorState, LoadMoreFooter } from '../../components/ui/AsyncStates';
import { productGridColumns, gridItemWidth } from '../../components/ui/grid';

const PINK = '#D81B60';
const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;
const SCREEN_PADDING = 16;
const GRID_GAP = 12;

// Chip vocabulary validated against live store data (M41S6E): each term returns
// real Storefront results. They act as real query setters.
const CHIPS = ['Gel', 'Polish', 'Powder', 'Lamp', 'Wax', 'Pedicure', 'Gloves', 'DND'];

export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce the raw input; the paged fetch keys off `debounced` so only the
  // latest settled query drives a request (latest-query-wins via usePagedData's
  // generation guard + deps reset).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const {
    items,
    loading,
    error,
    loadingMore,
    pageError,
    hasMore,
    reload,
    loadMore,
    retryLoadMore,
  } = usePagedData<CatalogueProduct, null>(async (cursor) => {
    const q = debounced.trim();
    if (!q) return { items: [], hasNextPage: false, endCursor: null, meta: null };
    const page = await searchCatalogueProducts(q, { first: PAGE_SIZE, after: cursor });
    return {
      items: page.items,
      hasNextPage: page.pageInfo.hasNextPage,
      endCursor: page.pageInfo.endCursor,
      meta: null,
    };
  }, [debounced]);

  const trimmed = debounced.trim();
  const hasQuery = trimmed.length > 0;
  const columns = productGridColumns(width);
  const itemWidth = gridItemWidth(width, columns, SCREEN_PADDING, GRID_GAP);
  const count = items.length;
  // When more pages remain we cannot claim the exact total, so show "N+". Once
  // exhausted, `count` is the true number of matches.
  const countLabel = `${count}${hasMore ? '+' : ''} ${count === 1 && !hasMore ? 'result' : 'results'} for "${trimmed}"`;

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

      {!hasQuery ? (
        <DefaultState onChipPress={setQuery} />
      ) : loading ? (
        <LoadingState label="Searching…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : count === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={40} color="#DDD" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            Try another keyword or check the category list.
          </Text>
        </View>
      ) : (
        <FlatList<CatalogueProduct>
          key={columns}
          data={items}
          numColumns={columns}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? { gap: GRID_GAP } : undefined}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={<Text style={styles.resultCount}>{countLabel}</Text>}
          ListFooterComponent={
            <LoadMoreFooter
              loadingMore={loadingMore}
              pageError={pageError}
              hasMore={hasMore}
              onRetry={retryLoadMore}
            />
          }
          renderItem={({ item }) => (
            <ShopifyProductCard
              model={catalogueProductToCardModel(item)}
              imageHeight={140}
              style={{ width: itemWidth, marginBottom: GRID_GAP }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function DefaultState({ onChipPress }: { onChipPress: (q: string) => void }) {
  return (
    <View style={styles.defaultWrap}>
      <Ionicons name="search-outline" size={36} color="#DDD" />
      <Text style={styles.defaultTitle}>Start searching</Text>
      <Text style={styles.defaultSubtitle}>
        Try gel, polish, powder, lamp, wax, pedicure, gloves, or DND.
      </Text>
      <View style={styles.chipsRow}>
        {CHIPS.map((chip) => (
          <Pressable key={chip} style={styles.chip} onPress={() => onChipPress(chip)}>
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
