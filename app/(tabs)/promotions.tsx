import { View, Text, StyleSheet } from 'react-native';

export default function PromotionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Promotions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, color: '#333' },
});
