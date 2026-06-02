import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IoniconsName; activeIcon: IoniconsName }[] = [
  { name: 'index',      title: 'Home',       icon: 'home-outline',     activeIcon: 'home' },
  { name: 'categories', title: 'Categories', icon: 'grid-outline',     activeIcon: 'grid' },
  { name: 'cart',       title: 'Cart',        icon: 'cart-outline',     activeIcon: 'cart' },
  { name: 'promotions', title: 'Promotions',  icon: 'pricetag-outline', activeIcon: 'pricetag' },
  { name: 'account',    title: 'Account',     icon: 'person-outline',   activeIcon: 'person' },
];

export default function TabLayout() {
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
