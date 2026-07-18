import React, { createContext, useContext, useState } from 'react';

/**
 * Shopify-only cart (M41S6E).
 *
 * The cart holds only Shopify lines, fully denormalized at add-time so rendering,
 * subtotal, and checkout NEVER depend on the in-memory catalogue cache or any
 * mock catalogue. Line identity is the Storefront variant GID: the same variant
 * added twice increments one line; different variants are distinct lines.
 *
 * The cart is in-memory only — it is not persisted (out of scope) and is never
 * cleared automatically (e.g. after checkout).
 */
export type ShopifyCartItem = {
  /** Stable identity for a cart line: the Storefront variant GID. */
  variantId: string;
  /** Shopify product GID (display/compat only; never the line identity). */
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

export type CartItem = ShopifyCartItem;

/** Denormalized data required to add a Shopify line (quantity supplied separately). */
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

/** Stable key for a cart line — the variant GID. */
export function getLineKey(item: CartItem): string {
  return item.variantId;
}

// The cart's single currency, or null if empty or (defensively) if lines somehow
// carry inconsistent currencies — so the UI never renders a misleading combined
// subtotal across currencies. The current store is single-currency (USD).
function resolveCartCurrency(items: CartItem[]): string | null {
  if (items.length === 0) return null;
  const first = items[0].currencyCode;
  return items.every((i) => i.currencyCode === first) ? first : null;
}

type CartContextValue = {
  items: CartItem[];

  /** Add (or increment) a Shopify line by variant GID. */
  addShopifyLine: (line: ShopifyCartLineInput, quantity?: number) => void;

  // Line controls, keyed by the variant GID (getLineKey).
  incrementLine: (variantId: string) => void;
  decrementLine: (variantId: string) => void;
  removeLine: (variantId: string) => void;

  clearCart: () => void;
  totalQuantity: number;
  subtotal: number;
  /** The cart's currency, or null when empty / inconsistent. */
  currencyCode: string | null;
  /** True when the cart is non-empty and every line shares one currency. */
  currencyConsistent: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addShopifyLine = (line: ShopifyCartLineInput, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === line.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === line.variantId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...line, quantity }];
    });
  };

  const incrementLine = (variantId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  const decrementLine = (variantId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((i) => i.variantId !== variantId);
      }
      return prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const removeLine = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => setItems([]);

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  // Denormalized prices only — never depends on any catalogue.
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const currencyCode = resolveCartCurrency(items);
  const currencyConsistent = items.length > 0 && currencyCode !== null;

  return (
    <CartContext.Provider
      value={{
        items,
        addShopifyLine,
        incrementLine,
        decrementLine,
        removeLine,
        clearCart,
        totalQuantity,
        subtotal,
        currencyCode,
        currencyConsistent,
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
