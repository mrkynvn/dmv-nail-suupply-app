import React, { createContext, useContext, useState } from 'react';
import { products } from '../data';

/**
 * Cart line model (M41S2E2).
 *
 * The cart is a discriminated union keyed on `source`:
 *  - "mock":    priced live from the local mock catalogue (existing behavior).
 *  - "shopify": fully denormalized at add-time so rendering/subtotal NEVER
 *               depend on the in-memory Shopify catalogue cache.
 *
 * Line identity:
 *  - mock line    -> productId
 *  - shopify line -> variantId
 * These are combined into a prefixed `lineKey` so a Shopify variant id can
 * never collide with a mock product id.
 *
 * `productId` is present on BOTH members (mock product id vs. Shopify product
 * GID) so that existing mock call sites reading `item.productId` keep working.
 * It is display/compat data only — it is NOT the identity for Shopify lines.
 */
export type MockCartItem = {
  source: 'mock';
  productId: string;
  quantity: number;
};

export type ShopifyCartItem = {
  source: 'shopify';
  /** Stable identity for a Shopify cart line. */
  variantId: string;
  /** Shopify product GID (compat with mock `productId` reads; never the identity). */
  productId: string;
  handle: string;
  quantity: number;
  title: string;
  unitPrice: number;
  currencyCode: string;
  availableForSale: boolean;
  /** Vendor/brand, when the catalogue provided one. */
  vendor?: string;
  imageUrl?: string;
  variantTitle?: string;
};

export type CartItem = MockCartItem | ShopifyCartItem;

/** Denormalized data required to add a Shopify line. */
export type ShopifyCartLineInput = {
  variantId: string;
  productId: string;
  handle: string;
  title: string;
  unitPrice: number;
  currencyCode: string;
  availableForSale: boolean;
  vendor?: string;
  imageUrl?: string;
  variantTitle?: string;
};

/** Stable, collision-proof key for a cart line. */
export function getLineKey(item: CartItem): string {
  return item.source === 'shopify' ? `shopify:${item.variantId}` : `mock:${item.productId}`;
}

type CartContextValue = {
  items: CartItem[];

  // --- Mock line API (unchanged public behavior) ---
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  getItemQuantity: (productId: string) => number;

  // --- Shopify line API (M41S2E2; not yet wired into the Shopify detail CTA) ---
  addShopifyLine: (line: ShopifyCartLineInput, quantity?: number) => void;

  // --- Line-key controls (operate on the exact line, mock or shopify) ---
  incrementLine: (lineKey: string) => void;
  decrementLine: (lineKey: string) => void;
  removeLine: (lineKey: string) => void;

  clearCart: () => void;
  totalQuantity: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // ---- Mock line API ---------------------------------------------------------

  const addToCart = (productId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.source === 'mock' && i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.source === 'mock' && i.productId === productId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      const line: MockCartItem = { source: 'mock', productId, quantity };
      return [...prev, line];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.source === 'mock' && i.productId === productId))
    );
  };

  const incrementQuantity = (productId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.source === 'mock' && i.productId === productId
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    );
  };

  const decrementQuantity = (productId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.source === 'mock' && i.productId === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((i) => !(i.source === 'mock' && i.productId === productId));
      }
      return prev.map((i) =>
        i.source === 'mock' && i.productId === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  };

  const getItemQuantity = (productId: string) =>
    items.find((i) => i.source === 'mock' && i.productId === productId)?.quantity ?? 0;

  // ---- Shopify line API ------------------------------------------------------

  const addShopifyLine = (line: ShopifyCartLineInput, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.source === 'shopify' && i.variantId === line.variantId
      );
      if (existing) {
        return prev.map((i) =>
          i.source === 'shopify' && i.variantId === line.variantId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      const newLine: ShopifyCartItem = { source: 'shopify', ...line, quantity };
      return [...prev, newLine];
    });
  };

  // ---- Line-key controls (mock or shopify) -----------------------------------

  const incrementLine = (lineKey: string) => {
    setItems((prev) =>
      prev.map((i) => (getLineKey(i) === lineKey ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  const decrementLine = (lineKey: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => getLineKey(i) === lineKey);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((i) => getLineKey(i) !== lineKey);
      }
      return prev.map((i) =>
        getLineKey(i) === lineKey ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const removeLine = (lineKey: string) => {
    setItems((prev) => prev.filter((i) => getLineKey(i) !== lineKey));
  };

  const clearCart = () => setItems([]);

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotal = items.reduce((sum, i) => {
    if (i.source === 'shopify') {
      // Denormalized price — never depends on the catalogue cache.
      return sum + i.unitPrice * i.quantity;
    }
    // Mock lines price live from the local catalogue, exactly as before.
    const product = products.find((p) => p.id === i.productId);
    if (!product) return sum;
    return sum + product.price * i.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        incrementQuantity,
        decrementQuantity,
        getItemQuantity,
        addShopifyLine,
        incrementLine,
        decrementLine,
        removeLine,
        clearCart,
        totalQuantity,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
