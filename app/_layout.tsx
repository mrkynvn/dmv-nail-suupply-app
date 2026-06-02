import { Stack } from 'expo-router';
import { CartProvider } from '../src/cart/CartContext';

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CartProvider>
  );
}
