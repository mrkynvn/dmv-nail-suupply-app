import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { fetchCollections } from '../../src/shopify';
import type { CatalogueCollection } from '../../src/shopify';
import { CollectionTile } from '../../components/collections/CollectionTile';
import {
  filterCategoryCollections,
  logCollectionFilter,
} from '../../components/collections/collectionFilter';
import { useAsyncData } from '../../components/ui/useAsyncData';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/AsyncStates';
import { categoryTileColumns, gridItemWidth } from '../../components/ui/grid';

const SCREEN_PADDING = 16;
const GRID_GAP = 12;

export default function CategoriesScreen() {
  const { width } = useWindowDimensions();

  const { data, loading, error, reload } = useAsyncData<CatalogueCollection[]>(async () => {
    // First page only in M41S2B2; cursor pagination is deferred to M41S2C.
    const page = await fetchCollections({ first: 50 });
    const result = filterCategoryCollections(page.items);
    logCollectionFilter(result);
    return result.included;
  }, []);

  const columns = categoryTileColumns(width);
  const itemWidth = gridItemWidth(width, columns, SCREEN_PADDING, GRID_GAP);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Browse products by collection.</Text>
      </View>

      {loading ? (
        <LoadingState label="Loading categories…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState message="No categories available yet." />
      ) : (
        <FlatList<CatalogueCollection>
          // Remount when the column count changes (RN requirement for numColumns).
          key={columns}
          data={data}
          numColumns={columns}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? { gap: GRID_GAP } : undefined}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CollectionTile
              collection={item}
              onPress={() =>
                router.push({
                  pathname: '/category/[categoryId]',
                  params: { categoryId: item.handle, title: item.title },
                })
              }
              imageHeight={110}
              style={{ width: itemWidth, marginBottom: GRID_GAP }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
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
  listContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 16,
  },
});
