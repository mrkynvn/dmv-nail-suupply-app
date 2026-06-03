import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useCart } from '../src/cart/CartContext';
import { getProductById } from '../src/data';

const PINK = '#D81B60';

type FormFields = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  note: string;
};

type FormErrors = Partial<Record<keyof FormFields, string>>;

const EMPTY_FORM: FormFields = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  note: '',
};

function validateForm(fields: FormFields): FormErrors {
  const errors: FormErrors = {};
  if (!fields.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!fields.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!fields.phone.trim()) errors.phone = 'Phone number is required.';
  if (!fields.address.trim()) errors.address = 'Address is required.';
  if (!fields.city.trim()) errors.city = 'City is required.';
  if (!fields.state.trim()) errors.state = 'State is required.';
  if (!fields.zip.trim()) errors.zip = 'ZIP code is required.';
  return errors;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, subtotal, totalQuantity, clearCart } = useCart();

  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function setField(key: keyof FormFields, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handlePlaceOrder() {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    clearCart();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Order Placed</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={72} color={PINK} />
          </View>
          <Text style={styles.successTitle}>Order submitted</Text>
          <Text style={styles.successMessage}>
            Thank you! We'll contact you to confirm your order.
          </Text>
          <Pressable
            style={styles.continueShoppingBtn}
            onPress={() => router.push('/')}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your cart is empty.</Text>
              <Pressable style={styles.backToCartBtn} onPress={() => router.back()}>
                <Text style={styles.backToCartText}>Back to Cart</Text>
              </Pressable>
              <Pressable
                style={styles.continueShoppingBtn}
                onPress={() => router.push('/')}
              >
                <Text style={styles.continueShoppingText}>Continue Shopping</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Order Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                <Text style={styles.itemCount}>
                  {totalQuantity} item{totalQuantity !== 1 ? 's' : ''}
                </Text>

                <View style={styles.divider} />

                {items.map((item) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;
                  const lineTotal = product.price * item.quantity;
                  return (
                    <View key={item.productId} style={styles.lineItem}>
                      <View style={styles.lineItemLeft}>
                        <Text style={styles.lineItemBrand}>{product.brand}</Text>
                        <Text style={styles.lineItemName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text style={styles.lineItemUnitPrice}>
                          ${product.price.toFixed(2)} each · Qty: {item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.lineItemTotal}>${lineTotal.toFixed(2)}</Text>
                    </View>
                  );
                })}

                <View style={styles.divider} />

                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalValue}>${subtotal.toFixed(2)}</Text>
                </View>

                <Text style={styles.shippingNote}>
                  Shipping and taxes will be calculated at fulfillment.
                </Text>

                <View style={styles.divider} />

                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>${subtotal.toFixed(2)}</Text>
                </View>
              </View>

              {/* Contact & Shipping Form */}
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Contact Information</Text>

                <FormField
                  label="Full Name"
                  value={form.fullName}
                  onChangeText={(v) => setField('fullName', v)}
                  error={errors.fullName}
                  placeholder="Jane Smith"
                  autoCapitalize="words"
                  textContentType="name"
                />
                <FormField
                  label="Email"
                  value={form.email}
                  onChangeText={(v) => setField('email', v)}
                  error={errors.email}
                  placeholder="jane@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textContentType="emailAddress"
                />
                <FormField
                  label="Phone"
                  value={form.phone}
                  onChangeText={(v) => setField('phone', v)}
                  error={errors.phone}
                  placeholder="(555) 555-5555"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />

                <View style={styles.formDivider} />
                <Text style={styles.subSectionTitle}>Shipping Address</Text>

                <FormField
                  label="Address"
                  value={form.address}
                  onChangeText={(v) => setField('address', v)}
                  error={errors.address}
                  placeholder="123 Main St"
                  autoCapitalize="words"
                  textContentType="streetAddressLine1"
                />
                <FormField
                  label="City"
                  value={form.city}
                  onChangeText={(v) => setField('city', v)}
                  error={errors.city}
                  placeholder="Washington"
                  autoCapitalize="words"
                  textContentType="addressCity"
                />

                <View style={styles.rowFields}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="State"
                      value={form.state}
                      onChangeText={(v) => setField('state', v)}
                      error={errors.state}
                      placeholder="DC"
                      autoCapitalize="characters"
                      textContentType="addressState"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="ZIP Code"
                      value={form.zip}
                      onChangeText={(v) => setField('zip', v)}
                      error={errors.zip}
                      placeholder="20001"
                      keyboardType="numeric"
                      textContentType="postalCode"
                    />
                  </View>
                </View>

                <View style={styles.formDivider} />
                <Text style={styles.subSectionTitle}>Order Note (optional)</Text>
                <TextInput
                  style={[styles.input, styles.noteInput]}
                  value={form.note}
                  onChangeText={(v) => setField('note', v)}
                  placeholder="Any special instructions..."
                  placeholderTextColor="#BBB"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Place Order */}
              <Pressable
                style={[
                  styles.placeOrderBtn,
                  items.length === 0 && styles.placeOrderBtnDisabled,
                ]}
                onPress={handlePlaceOrder}
                disabled={items.length === 0}
              >
                <Text style={styles.placeOrderText}>Place Order</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: string;
};

function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  textContentType,
}: FormFieldProps) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#BBB"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType as any}
        autoCorrect={false}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    fontWeight: '500',
  },
  backToCartBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  backToCartText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  continueShoppingBtn: {
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  continueShoppingText: {
    color: PINK,
    fontWeight: '700',
    fontSize: 15,
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  itemCount: {
    fontSize: 13,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 2,
  },
  lineItemLeft: {
    flex: 1,
    gap: 2,
  },
  lineItemBrand: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  lineItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
    lineHeight: 18,
  },
  lineItemUnitPrice: {
    fontSize: 12,
    color: '#999',
  },
  lineItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  shippingNote: {
    fontSize: 11,
    color: '#AAA',
    fontStyle: 'italic',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: PINK,
  },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: -4,
  },
  formDivider: {
    height: 1,
    backgroundColor: '#F4F4F4',
    marginVertical: 2,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldWrapper: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: PINK,
    backgroundColor: '#FFF5F8',
  },
  noteInput: {
    height: 80,
    paddingTop: 11,
  },
  errorText: {
    fontSize: 12,
    color: PINK,
    fontWeight: '500',
  },

  placeOrderBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  placeOrderBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  placeOrderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successIconWrap: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
