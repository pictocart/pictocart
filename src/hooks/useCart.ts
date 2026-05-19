import { useState, useEffect, useCallback } from 'react';

export type FulfillmentMode = 'dine_in' | 'takeaway' | 'delivery';

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string | null;
  quantity: number;
  variant?: string;
  notes?: string;
  /** Optional per-item allowed modes (from menu_meta.available_modes). */
  available_modes?: FulfillmentMode[];
}

const CART_KEY = (storeSlug: string) => `cart_${storeSlug}`;
const MODE_KEY = (storeSlug: string) => `cart_mode_${storeSlug}`;
const TABLE_KEY = (storeSlug: string) => `cart_table_${storeSlug}`;
const CART_EVENT = 'cart:updated';

const emitCartUpdate = (storeSlug: string) => {
  try {
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { storeSlug } }));
  } catch {}
};

export const useCart = (storeSlug: string) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [fulfillmentMode, setFulfillmentModeState] = useState<FulfillmentMode>('delivery');
  const [tableLabel, setTableLabelState] = useState<string | null>(null);

  const reloadFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(CART_KEY(storeSlug));
      setItems(saved ? JSON.parse(saved) : []);
      const m = localStorage.getItem(MODE_KEY(storeSlug)) as FulfillmentMode | null;
      if (m) setFulfillmentModeState(m);
      const t = localStorage.getItem(TABLE_KEY(storeSlug));
      setTableLabelState(t || null);
    } catch {}
  }, [storeSlug]);

  useEffect(() => {
    reloadFromStorage();
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.storeSlug === storeSlug) reloadFromStorage();
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === CART_KEY(storeSlug) || e.key === MODE_KEY(storeSlug) || e.key === TABLE_KEY(storeSlug)) {
        reloadFromStorage();
      }
    };
    window.addEventListener(CART_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CART_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [storeSlug, reloadFromStorage]);

  const persist = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem(CART_KEY(storeSlug), JSON.stringify(newItems));
    emitCartUpdate(storeSlug);
  };

  const readStorage = (): CartItem[] => {
    try {
      const saved = localStorage.getItem(CART_KEY(storeSlug));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  };

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1) => {
    const prev = readStorage();
    const key = `${item.productId}_${item.variant || ''}`;
    const existing = prev.find((i) => `${i.productId}_${i.variant || ''}` === key);
    const next = existing
      ? prev.map((i) => (`${i.productId}_${i.variant || ''}` === key ? { ...i, quantity: i.quantity + qty } : i))
      : [...prev, { ...item, quantity: qty }];
    localStorage.setItem(CART_KEY(storeSlug), JSON.stringify(next));
    setItems(next);
    emitCartUpdate(storeSlug);
  }, [storeSlug]);

  const updateQuantity = useCallback((productId: string, variant: string | undefined, qty: number) => {
    const prev = readStorage();
    const key = `${productId}_${variant || ''}`;
    const next = qty <= 0
      ? prev.filter((i) => `${i.productId}_${i.variant || ''}` !== key)
      : prev.map((i) => (`${i.productId}_${i.variant || ''}` === key ? { ...i, quantity: qty } : i));
    localStorage.setItem(CART_KEY(storeSlug), JSON.stringify(next));
    setItems(next);
    emitCartUpdate(storeSlug);
  }, [storeSlug]);

  const removeItem = useCallback((productId: string, variant?: string) => {
    updateQuantity(productId, variant, 0);
  }, [updateQuantity]);

  const clearCart = useCallback(() => {
    persist([]);
    // Don't clear table binding — server clears it when bill is paid; keep table sticky
  }, [storeSlug]);

  const setFulfillmentMode = useCallback((mode: FulfillmentMode) => {
    localStorage.setItem(MODE_KEY(storeSlug), mode);
    setFulfillmentModeState(mode);
    if (mode !== 'dine_in') {
      localStorage.removeItem(TABLE_KEY(storeSlug));
      setTableLabelState(null);
    }
    emitCartUpdate(storeSlug);
  }, [storeSlug]);

  const setTableLabel = useCallback((label: string | null) => {
    if (label) {
      localStorage.setItem(TABLE_KEY(storeSlug), label);
      localStorage.setItem(MODE_KEY(storeSlug), 'dine_in');
      setFulfillmentModeState('dine_in');
    } else {
      localStorage.removeItem(TABLE_KEY(storeSlug));
    }
    setTableLabelState(label);
    emitCartUpdate(storeSlug);
  }, [storeSlug]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return {
    items, addItem, updateQuantity, removeItem, clearCart, totalItems, totalPrice,
    fulfillmentMode, setFulfillmentMode, tableLabel, setTableLabel,
  };
};
