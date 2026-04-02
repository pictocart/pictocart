import { useState, useEffect, useCallback } from 'react';

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string | null;
  quantity: number;
  variant?: string;
}

const CART_KEY = (storeSlug: string) => `cart_${storeSlug}`;

export const useCart = (storeSlug: string) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY(storeSlug));
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, [storeSlug]);

  const persist = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem(CART_KEY(storeSlug), JSON.stringify(newItems));
  };

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1) => {
    setItems((prev) => {
      const key = `${item.productId}_${item.variant || ''}`;
      const existing = prev.find((i) => `${i.productId}_${i.variant || ''}` === key);
      const next = existing
        ? prev.map((i) => (`${i.productId}_${i.variant || ''}` === key ? { ...i, quantity: i.quantity + qty } : i))
        : [...prev, { ...item, quantity: qty }];
      localStorage.setItem(CART_KEY(storeSlug), JSON.stringify(next));
      return next;
    });
  }, [storeSlug]);

  const updateQuantity = useCallback((productId: string, variant: string | undefined, qty: number) => {
    setItems((prev) => {
      const key = `${productId}_${variant || ''}`;
      const next = qty <= 0
        ? prev.filter((i) => `${i.productId}_${i.variant || ''}` !== key)
        : prev.map((i) => (`${i.productId}_${i.variant || ''}` === key ? { ...i, quantity: qty } : i));
      localStorage.setItem(CART_KEY(storeSlug), JSON.stringify(next));
      return next;
    });
  }, [storeSlug]);

  const removeItem = useCallback((productId: string, variant?: string) => {
    updateQuantity(productId, variant, 0);
  }, [updateQuantity]);

  const clearCart = useCallback(() => {
    persist([]);
  }, [storeSlug]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return { items, addItem, updateQuantity, removeItem, clearCart, totalItems, totalPrice };
};
