import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../../src/cart/CartContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IoniconsName; activeIcon: IoniconsName }[] = [
  { name: 'index',      title: 'Home',       icon: 'home-outline',     activeIcon: 'home' },
  { name: 'categories', title: 'Categories', icon: 'grid-outline',     activeIcon: 'grid' },
  { name: 'search',     title: 'Search',     icon: 'search-outline',   activeIcon: 'search' },
  { name: 'cart',       title: 'Cart',        icon: 'cart-outline',     activeIcon: 'cart' },
  { name: 'promotions', title: 'Promotions',  icon: 'pricetag-outline', activeIcon: 'pricetag' },
  { name: 'account',    title: 'Account',     icon: 'person-outline',   activeIcon: 'person' },
];

export default function TabLayout() {
  const { totalQuantity } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D81B60',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarBadge:
              tab.name === 'cart' && totalQuantity > 0 ? totalQuantity : undefined,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                color={color}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
