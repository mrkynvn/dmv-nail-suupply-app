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
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../src/cart/CartContext';
import { getProductById } from '../src/data';
import { generateOrderId, saveOrder } from '../src/orders/storage';
import { ORDER_STATUS_LABELS } from '../src/orders/types';
import type { LocalOrder, LocalOrderItem } from '../src/orders/types';
import {
  CHECKOUT_PROFILE_KEY,
  parseCheckoutProfile,
  type CheckoutProfile,
} from '../src/checkout/profile';

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

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `DMV-${y}${m}${d}-${rand}`;
}

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
  const [orderSnapshot, setOrderSnapshot] = useState<LocalOrder | null>(null);
  const [detailsHydrated, setDetailsHydrated] = useState(false);

  // Synchronous re-entrancy lock — the real guard against duplicate submits.
  // `submitting` state is used only for disabled/loading UI.
  const isSubmittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Restore saved checkout profile on mount. Runs once; never overwrites user
  // input because form fields are hidden behind detailsHydrated until done.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHECKOUT_PROFILE_KEY);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          const profile = parseCheckoutProfile(parsed);
          setForm((prev) => ({ ...prev, ...profile }));
        }
      } catch {
        // Storage read error or malformed JSON — proceed with empty form.
      } finally {
        setDetailsHydrated(true);
      }
    })();
  }, []);

  function setField(key: keyof FormFields, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handlePlaceOrder() {
    // 1. Synchronous re-entrancy guard — before any work.
    if (isSubmittingRef.current) return;

    // 2. Validate the form. Lock not yet taken, so a plain return is safe.
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 3. Resolve cart products and build immutable line snapshots synchronously.
    const snapshotItems: LocalOrderItem[] = items
      .map((item) => {
        const product = getProductById(item.productId);
        if (!product) return null;
        const line: LocalOrderItem = {
          productId: item.productId,
          name: product.name,
          brand: product.brand ?? '',
          quantity: item.quantity,
          unitPrice: product.price,
          lineTotal: product.price * item.quantity,
        };
        if (typeof product.originalPrice === 'number') line.originalPrice = product.originalPrice;
        if (typeof product.isOnSale === 'boolean') line.isOnSale = product.isOnSale;
        return line;
      })
      .filter((x): x is LocalOrderItem => x !== null);

    // 4. Empty/stale cart guard — no lock, no persistence, no cart clearing.
    if (snapshotItems.length === 0) {
      setSubmitError(
        'We couldn’t finalize your cart. Please review your items and try again.',
      );
      return;
    }

    // 5. Take the lock before the first awaited operation.
    isSubmittingRef.current = true;
    // 6. Visual submitting state; clear any prior error.
    setSubmitting(true);
    setSubmitError(null);

    // 7. Build the LocalOrder draft exactly once.
    const orderSubtotal = snapshotItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const draft: LocalOrder = {
      id: generateOrderId(),
      orderNumber: generateOrderNumber(),
      createdAt: new Date().toISOString(),
      status: 'ORDER_RECEIVED',
      currency: 'USD',
      contact: { ...form },
      items: snapshotItems,
      subtotal: orderSubtotal,
      total: orderSubtotal,
    };

    // 8. Persist the order.
    let persisted: LocalOrder;
    try {
      persisted = await saveOrder(draft);
    } catch {
      // 9. Save failure — retain cart and form, show recoverable error,
      // reset submitting state, release the lock, do not confirm.
      setSubmitError('We couldn’t save your order. Please try again.');
      setSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    // 10. Save success. Persist reusable contact details (note excluded) —
    // fire-and-forget; write failure must not block confirmation. (M25, unchanged.)
    const profileToSave: CheckoutProfile = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
    };
    AsyncStorage.setItem(CHECKOUT_PROFILE_KEY, JSON.stringify(profileToSave)).catch(() => {});

    // Use the returned persisted order (its id may have been regenerated).
    setOrderSnapshot(persisted);
    clearCart();
    setSubmitted(true);
    // Intentionally leave isSubmittingRef locked: the form transitions to the
    // confirmation view and must not accept another submit.
  }

  if (submitted) {
    if (!orderSnapshot) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Order Placed</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={72} color={PINK} />
            <Text style={styles.successTitle}>Order submitted</Text>
            <Text style={styles.successMessage}>
              Thank you! We'll contact you to confirm your order.
            </Text>
            <Pressable style={styles.continueShoppingBtn} onPress={() => router.push('/')}>
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    const { orderNumber, status, contact, items: snapItems, total } = orderSnapshot;

    // Route strictly by the opaque persisted id, never the display orderNumber.
    // Reject empty/whitespace ids so we never build an /orders/undefined route.
    const orderId =
      typeof orderSnapshot.id === 'string' && orderSnapshot.id.trim().length > 0
        ? orderSnapshot.id
        : null;

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Order Placed</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.confirmHero}>
            <Ionicons name="checkmark-circle" size={64} color={PINK} />
            <Text style={styles.successTitle}>Order submitted</Text>
            <Text style={styles.successMessage}>
              Thank you! We'll contact you to confirm your order.
            </Text>
            <View style={styles.orderNumberBadge}>
              <Text style={styles.orderNumberLabel}>Order Number</Text>
              <Text style={styles.orderNumberValue}>{orderNumber}</Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{ORDER_STATUS_LABELS[status]}</Text>
            </View>
          </View>

          {/* Order Summary card */}
          <View style={styles.confirmCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <Text style={styles.itemCount}>
              {snapItems.reduce((s, i) => s + i.quantity, 0)} item
              {snapItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
            </Text>
            <View style={styles.divider} />
            {snapItems.map((item) => (
              <View key={item.productId} style={styles.lineItem}>
                <View style={styles.lineItemLeft}>
                  {item.brand ? (
                    <Text style={styles.lineItemBrand}>{item.brand}</Text>
                  ) : null}
                  <Text style={styles.lineItemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.lineItemUnitPrice}>
                    ${item.unitPrice.toFixed(2)} each · Qty: {item.quantity}
                  </Text>
                </View>
                <Text style={styles.lineItemTotal}>${item.lineTotal.toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Contact Information card */}
          <View style={styles.confirmCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.divider} />
            <InfoRow label="Name" value={contact.fullName} />
            <InfoRow label="Email" value={contact.email} />
            <InfoRow label="Phone" value={contact.phone} />
            <View style={styles.divider} />
            <Text style={styles.subSectionTitle}>Shipping Address</Text>
            <InfoRow label="Address" value={contact.address} />
            <InfoRow label="City" value={contact.city} />
            <InfoRow label="State" value={contact.state} />
            <InfoRow label="ZIP" value={contact.zip} />
            {contact.note.trim() ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.subSectionTitle}>Order Note</Text>
                <Text style={styles.noteValue}>{contact.note.trim()}</Text>
              </>
            ) : null}
          </View>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            This is a mock order confirmation. No payment has been processed.
          </Text>

          {orderId ? (
            <Pressable
              style={styles.viewOrderBtn}
              onPress={() => router.replace(`/orders/${orderId}`)}
            >
              <Text style={styles.viewOrderText}>View Order</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.continueShoppingBtn} onPress={() => router.push('/')}>
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </Pressable>
        </ScrollView>
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

                {!detailsHydrated ? (
                  <Text style={styles.formLoadingText}>Restoring saved details…</Text>
                ) : (
                  <>
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
                  </>
                )}
              </View>

              {/* Place Order */}
              {submitError ? (
                <View style={styles.submitErrorBox}>
                  <Ionicons name="alert-circle" size={18} color={PINK} />
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              ) : null}
              <Pressable
                style={[
                  styles.placeOrderBtn,
                  (items.length === 0 || submitting) && styles.placeOrderBtnDisabled,
                ]}
                onPress={handlePlaceOrder}
                disabled={items.length === 0 || submitting}
              >
                {submitting ? (
                  <View style={styles.placeOrderLoading}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.placeOrderText}>Placing Order…</Text>
                  </View>
                ) : (
                  <Text style={styles.placeOrderText}>Place Order</Text>
                )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

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
  viewOrderBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  viewOrderText: {
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
  placeOrderLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5F8',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 10,
    padding: 12,
  },
  submitErrorText: {
    flex: 1,
    fontSize: 13,
    color: PINK,
    fontWeight: '500',
  },
  statusChip: {
    backgroundColor: '#FFF0F5',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 8,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: PINK,
    letterSpacing: 0.3,
  },

  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
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

  confirmHero: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  orderNumberBadge: {
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  orderNumberLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  orderNumberValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PINK,
    letterSpacing: 0.5,
  },

  confirmCard: {
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

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    width: 64,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    color: '#111',
    flex: 1,
    flexWrap: 'wrap',
  },
  noteValue: {
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
  },

  disclaimer: {
    fontSize: 11,
    color: '#BBB',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: -4,
  },

  formLoadingText: {
    fontSize: 13,
    color: '#BBBBBB',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
