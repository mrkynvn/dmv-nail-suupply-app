// Safe local persistence for M26 order history.
// A dedicated AsyncStorage key; the M25 saved-checkout-profile key is untouched.
// Distinguishes missing history, valid history, corrupt bytes, and real I/O
// failures, and never silently overwrites unreadable-but-present data.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocalOrder, LocalOrderContact, LocalOrderItem } from './types';

const ORDER_HISTORY_KEY = '@dmv_nail_supply/order_history';

// Half-a-cent tolerance for money comparisons against float arithmetic.
const MONEY_EPS = 0.005;

export type LoadOrdersResult =
  | { ok: true; orders: LocalOrder[] }
  | { ok: false; orders: LocalOrder[]; reason: 'storage' | 'corrupt' };

// Opaque, collision-resistant local id built from existing JS capabilities.
// Distinct from the human display orderNumber. No UUID dependency added.
export function generateOrderId(): string {
  return `o_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) <= MONEY_EPS;
}

function validateContact(raw: unknown): LocalOrderContact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const fields = [
    'fullName',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'zip',
    'note',
  ] as const;
  const contact: Record<string, string> = {};
  for (const f of fields) {
    if (typeof o[f] !== 'string') return null;
    contact[f] = o[f] as string;
  }
  return contact as LocalOrderContact;
}

function validateItem(raw: unknown): LocalOrderItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  if (typeof o.productId !== 'string' || !o.productId) return null;
  if (typeof o.name !== 'string' || !o.name) return null;
  if (typeof o.quantity !== 'number' || !Number.isInteger(o.quantity) || o.quantity < 1) {
    return null;
  }
  if (!isFiniteNumber(o.unitPrice) || o.unitPrice < 0) return null;
  if (!isFiniteNumber(o.lineTotal) || o.lineTotal < 0) return null;
  if (!approxEq(o.lineTotal, o.unitPrice * o.quantity)) return null;

  const item: LocalOrderItem = {
    productId: o.productId,
    name: o.name,
    brand: typeof o.brand === 'string' ? o.brand : '',
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    lineTotal: o.lineTotal,
  };
  // Optional sale metadata accepted only when the types are valid.
  if (isFiniteNumber(o.originalPrice) && o.originalPrice >= 0) {
    item.originalPrice = o.originalPrice;
  }
  if (typeof o.isOnSale === 'boolean') {
    item.isOnSale = o.isOnSale;
  }
  return item;
}

// Validate a whole order consistently. Reject the entire order if any part is
// unsound — never partially filter items while keeping a stale subtotal/total.
function validateOrder(raw: unknown): LocalOrder | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  if (typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.orderNumber !== 'string' || !o.orderNumber) return null;
  if (typeof o.createdAt !== 'string' || !o.createdAt) return null;
  if (Number.isNaN(Date.parse(o.createdAt))) return null;
  if (o.status !== 'ORDER_RECEIVED') return null;
  if (o.currency !== 'USD') return null;

  const contact = validateContact(o.contact);
  if (!contact) return null;

  if (!Array.isArray(o.items) || o.items.length === 0) return null;
  const items: LocalOrderItem[] = [];
  for (const rawItem of o.items) {
    const item = validateItem(rawItem);
    if (!item) return null;
    items.push(item);
  }

  if (!isFiniteNumber(o.subtotal) || o.subtotal < 0) return null;
  if (!isFiniteNumber(o.total) || o.total < 0) return null;

  const sumLines = items.reduce((sum, i) => sum + i.lineTotal, 0);
  if (!approxEq(o.subtotal, sumLines)) return null;
  if (!approxEq(o.total, o.subtotal)) return null;

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: 'ORDER_RECEIVED',
    currency: 'USD',
    contact,
    items,
    subtotal: o.subtotal,
    total: o.total,
  };
}

type RawHistory =
  | { kind: 'empty' }
  | { kind: 'array'; raw: unknown[] }
  | { kind: 'corrupt' };

// Strict read. A real getItem() rejection propagates to the caller. A present
// but unparseable / non-array value is reported as 'corrupt' (never discarded).
async function readRawHistory(): Promise<RawHistory> {
  const raw = await AsyncStorage.getItem(ORDER_HISTORY_KEY);
  if (raw === null) return { kind: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt' };
  }
  if (!Array.isArray(parsed)) return { kind: 'corrupt' };
  return { kind: 'array', raw: parsed };
}

function sortNewestFirst(orders: LocalOrder[]): LocalOrder[] {
  return [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

// Resilient UI-facing read. Never throws; distinguishes a genuine empty history
// from a storage failure or corrupt history so the UI can offer a retry state
// instead of a misleading "No orders yet".
export async function loadOrders(): Promise<LoadOrdersResult> {
  let history: RawHistory;
  try {
    history = await readRawHistory();
  } catch {
    return { ok: false, orders: [], reason: 'storage' };
  }

  if (history.kind === 'empty') return { ok: true, orders: [] };
  if (history.kind === 'corrupt') return { ok: false, orders: [], reason: 'corrupt' };

  const valid: LocalOrder[] = [];
  let hadInvalid = false;
  for (const el of history.raw) {
    const order = validateOrder(el);
    if (order) {
      valid.push(order);
    } else {
      hadInvalid = true;
    }
  }

  // A non-empty history whose records are ALL unusable is a corrupt-read state,
  // not a legitimate empty history — don't masquerade as "No orders yet".
  if (history.raw.length > 0 && valid.length === 0 && hadInvalid) {
    return { ok: false, orders: [], reason: 'corrupt' };
  }
  return { ok: true, orders: sortNewestFirst(valid) };
}

// Persist a new order, returning the EXACT stored record (its id may have been
// regenerated on collision). Does not mutate the input draft. A real getItem()
// or setItem() rejection propagates. Corrupt existing bytes block the append
// (recoverable failure) rather than being overwritten with a fresh array.
export async function saveOrder(draft: LocalOrder): Promise<LocalOrder> {
  const history = await readRawHistory();
  if (history.kind === 'corrupt') {
    throw new Error('Refusing to overwrite corrupt order history.');
  }

  // Strict append precondition: every existing record must pass the complete
  // validateOrder check. A single malformed element makes the whole stored
  // history corrupt — block the append rather than silently rewrite it. We do
  // not drop, filter, or reorder records; failure falls through to saveOrder's
  // recoverable error path with storage left untouched.
  const existingOrders: LocalOrder[] = [];
  if (history.kind === 'array') {
    for (const el of history.raw) {
      const valid = validateOrder(el);
      if (!valid) {
        throw new Error('Refusing to overwrite invalid order history.');
      }
      existingOrders.push(valid);
    }
  }

  // Collision detection against the validated existing orders.
  const existingIds = new Set(existingOrders.map((o) => o.id));

  let order: LocalOrder = { ...draft };
  while (existingIds.has(order.id)) {
    order = { ...order, id: generateOrderId() };
  }

  const updated = [order, ...existingOrders];
  await AsyncStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(updated));
  return order;
}
