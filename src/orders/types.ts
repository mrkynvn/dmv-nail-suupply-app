// Local order domain types for M26 order-history persistence.
// Fully local/mock — no backend, payment, tax, shipping, or variant data.

// Stable internal status value plus its UI display mapping.
export type OrderStatus = 'ORDER_RECEIVED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ORDER_RECEIVED: 'Order received',
};

// A frozen snapshot of one purchased line. Captures only immutable product
// data that exists at checkout time; there is no variant-selection state in
// the cart, so no selected-variant field is invented here.
export type LocalOrderItem = {
  productId: string;
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  isOnSale?: boolean;
  lineTotal: number;
};

// Frozen contact/shipping details captured from the checkout form.
export type LocalOrderContact = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  note: string;
};

// One immutable local order record.
// `id` is an opaque unique identifier used only for lookup and routing.
// `orderNumber` is the human-readable display code (DC-YYYYMMDD-XXXX).
// The two are always distinct.
export type LocalOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  currency: 'USD';
  contact: LocalOrderContact;
  items: LocalOrderItem[];
  subtotal: number;
  total: number;
};
