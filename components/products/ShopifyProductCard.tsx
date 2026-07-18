// Shopify-wired product card (M41S6E).
//
// The single integration point between the pure presentation ProductCard and the
// app's favorites/cart/navigation. Every product surface (Home, Search,
// Promotions, Favorites, Recently Viewed, category listing) renders this so
// behavior stays consistent and ProductCard itself stays context-free.

import { router } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';
import { ProductCard } from './ProductCard';
import type { ProductCardModel } from './productCardModel';
import { useFavorites } from '../../src/favorites/FavoritesContext';
import { useCart } from '../../src/cart/CartContext';

type Props = {
  model: ProductCardModel;
  showFavorite?: boolean;
  showQuickAdd?: boolean;
  categoryLabel?: string;
  imageHeight?: number;
  style?: StyleProp<ViewStyle>;
  // Override the default press behavior (open Shopify detail by handle).
  onPress?: () => void;
};

export function ShopifyProductCard({
  model,
  showFavorite = true,
  showQuickAdd = true,
  categoryLabel,
  imageHeight,
  style,
  onPress,
}: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addShopifyLine } = useCart();

  // Card press / open-detail navigation uses the fresh handle from the model.
  // A missing handle makes the card a no-op rather than pushing a broken path.
  const handle = model.handle?.trim();
  const openDetail = handle ? () => router.push(`/product/shopify/${handle}`) : undefined;
  const press = onPress ?? openDetail;

  const handleQuickAdd = () => {
    const qa = model.quickAdd;
    if (qa.kind === 'add') {
      // Exactly one proven-available variant → add straight to the Shopify cart.
      addShopifyLine(qa.line, 1);
    } else if (qa.kind === 'openDetail') {
      // Multiple / uncertain variants → send the shopper to detail to choose.
      openDetail?.();
    }
    // 'disabled' never reaches here (ProductCard disables the control).
  };

  return (
    <ProductCard
      model={model}
      onPress={press}
      showFavorite={showFavorite}
      favorited={isFavorite(model.gid)}
      onToggleFavorite={() => toggleFavorite({ gid: model.gid, handle: model.handle })}
      showQuickAdd={showQuickAdd}
      onQuickAdd={handleQuickAdd}
      categoryLabel={categoryLabel}
      imageHeight={imageHeight}
      style={style}
    />
  );
}
