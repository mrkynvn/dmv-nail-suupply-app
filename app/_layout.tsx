import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth/AuthContext';
import { CartProvider } from '../src/cart/CartContext';
import { FavoritesProvider } from '../src/favorites/FavoritesContext';
import { RecentlyViewedProvider } from '../src/recentlyViewed/RecentlyViewedContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <RecentlyViewedProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </RecentlyViewedProvider>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
