import { Stack } from 'expo-router';
import { CartProvider } from '../src/cart/CartContext';
import { FavoritesProvider } from '../src/favorites/FavoritesContext';

export default function RootLayout() {
  return (
    <CartProvider>
      <FavoritesProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </FavoritesProvider>
    </CartProvider>
  );
}
