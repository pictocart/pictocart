import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';

const STALE = 30_000;

// ---------- Suppliers ----------
export const useSuppliers = () => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'suppliers', store?.id],
    enabled: !!store?.id,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers' as any)
        .select('*')
        .eq('store_id', store!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};

export const useUpsertSupplier = () => {
  const qc = useQueryClient();
  const { store } = useStore();
  return useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, store_id: store!.id };
      const q = input.id
        ? supabase.from('suppliers' as any).update(payload).eq('id', input.id)
        : supabase.from('suppliers' as any).insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', 'suppliers'] }),
  });
};

export const useDeleteSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', 'suppliers'] }),
  });
};

// ---------- Purchases ----------
export const usePurchases = () => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'purchases', store?.id],
    enabled: !!store?.id,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_bills' as any)
        .select('*, suppliers(name)')
        .eq('store_id', store!.id)
        .order('bill_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};

export const useCreatePurchase = () => {
  const qc = useQueryClient();
  const { store } = useStore();
  return useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, store_id: store!.id };
      const { error } = await supabase.from('purchase_bills' as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdatePurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('purchase_bills' as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};

// Settle dues for a supplier: distribute payment across oldest unpaid bills (FIFO)
export const useSettleSupplier = () => {
  const qc = useQueryClient();
  const { store } = useStore();
  return useMutation({
    mutationFn: async ({ supplier_id, amount, payment_mode, note }: { supplier_id: string; amount: number; payment_mode: string; note?: string }) => {
      const { data: bills, error } = await supabase
        .from('purchase_bills' as any)
        .select('id, total, paid_amount, payment_mode')
        .eq('store_id', store!.id)
        .eq('supplier_id', supplier_id)
        .order('bill_date', { ascending: true });
      if (error) throw error;
      let remaining = Number(amount);
      for (const b of (bills ?? []) as any[]) {
        if (remaining <= 0) break;
        const due = Math.max(Number(b.total) - Number(b.paid_amount || 0), 0);
        if (due <= 0) continue;
        const apply = Math.min(due, remaining);
        const newPaid = Number(b.paid_amount || 0) + apply;
        const status = newPaid >= Number(b.total) ? 'paid' : 'partial';
        const { error: uerr } = await supabase.from('purchase_bills' as any).update({
          paid_amount: newPaid,
          payment_status: status,
          payment_mode: payment_mode || b.payment_mode || 'cash',
          notes: note || undefined,
        }).eq('id', b.id);
        if (uerr) throw uerr;
        remaining -= apply;
      }
      if (remaining > 0) throw new Error(`No open dues — ₹${remaining.toFixed(2)} not applied`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};

// ---------- Expenses ----------
export const useExpenses = (range?: { from?: string; to?: string }) => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'expenses', store?.id, range?.from, range?.to],
    enabled: !!store?.id,
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase
        .from('expenses' as any)
        .select('*')
        .eq('store_id', store!.id)
        .order('expense_date', { ascending: false })
        .limit(500);
      if (range?.from) q = q.gte('expense_date', range.from);
      if (range?.to) q = q.lte('expense_date', range.to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};

export const useExpenseCategories = () => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'expense_categories', store?.id],
    enabled: !!store?.id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories' as any)
        .select('*')
        .eq('store_id', store!.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};

export const useUpsertExpense = () => {
  const qc = useQueryClient();
  const { store } = useStore();
  return useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, store_id: store!.id };
      const q = input.id
        ? supabase.from('expenses' as any).update(payload).eq('id', input.id)
        : supabase.from('expenses' as any).insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};

// ---------- Khata ----------
export const useKhataEntries = () => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'khata', store?.id],
    enabled: !!store?.id,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('khata_entries' as any)
        .select('*, customers(name, phone, balance)')
        .eq('store_id', store!.id)
        .order('entry_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};

export const useCreateKhataEntry = () => {
  const qc = useQueryClient();
  const { store } = useStore();
  return useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, store_id: store!.id };
      const { error } = await supabase.from('khata_entries' as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};

// ---------- Inventory ----------
export const useInventoryMovements = (productId?: string) => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'inv-mov', store?.id, productId],
    enabled: !!store?.id,
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase
        .from('inventory_movements' as any)
        .select('*, products(title, sku)')
        .eq('store_id', store!.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (productId) q = q.eq('product_id', productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};

export const useLowStockProducts = () => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'low-stock', store?.id],
    enabled: !!store?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, sku, inventory_count, reorder_level, images')
        .eq('store_id', store!.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []).filter(
        (p: any) => (p.reorder_level ?? 0) > 0 && (p.inventory_count ?? 0) <= p.reorder_level,
      );
    },
  });
};

// ---------- P&L ----------
export const usePnl = (fromDate: string, toDate: string) => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'pnl', store?.id, fromDate, toDate],
    enabled: !!store?.id,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pnl_report' as any, {
        _store_id: store!.id,
        _from: fromDate,
        _to: toDate,
      });
      if (error) throw error;
      return (data?.[0] ?? { revenue: 0, cogs: 0, expenses_total: 0, tax_collected: 0, net_profit: 0 }) as any;
    },
  });
};

// ---------- Cash Book (computed client-side) ----------
export const useCashBook = (fromDate: string, toDate: string) => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'cashbook', store?.id, fromDate, toDate],
    enabled: !!store?.id,
    staleTime: STALE,
    queryFn: async () => {
      const [orders, expenses, khata, purchases] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, total, payment_method, payment_status, created_at')
          .eq('store_id', store!.id)
          .eq('payment_status', 'paid')
          .gte('created_at', fromDate)
          .lte('created_at', toDate + 'T23:59:59'),
        supabase
          .from('expenses' as any)
          .select('id, category, amount, payment_mode, expense_date')
          .eq('store_id', store!.id)
          .gte('expense_date', fromDate)
          .lte('expense_date', toDate),
        supabase
          .from('khata_entries' as any)
          .select('id, customer_name, amount, entry_type, payment_mode, entry_date')
          .eq('store_id', store!.id)
          .gte('entry_date', fromDate)
          .lte('entry_date', toDate),
        supabase
          .from('purchase_bills' as any)
          .select('id, bill_number, paid_amount, payment_mode, bill_date')
          .eq('store_id', store!.id)
          .gt('paid_amount', 0)
          .gte('bill_date', fromDate)
          .lte('bill_date', toDate),
      ]);

      const rows: Array<{
        date: string; description: string; mode: string; in: number; out: number;
      }> = [];
      orders.data?.forEach((o: any) => rows.push({
        date: o.created_at.slice(0, 10),
        description: `Order ${o.order_number}`,
        mode: o.payment_method || 'online',
        in: Number(o.total) || 0, out: 0,
      }));
      khata.data?.forEach((k: any) => rows.push({
        date: k.entry_date,
        description: `Khata ${k.entry_type} — ${k.customer_name || 'Customer'}`,
        mode: k.payment_mode || 'cash',
        in: k.entry_type === 'payment' ? Number(k.amount) : 0,
        out: 0,
      }));
      expenses.data?.forEach((e: any) => rows.push({
        date: e.expense_date,
        description: `Expense — ${e.category}`,
        mode: e.payment_mode || 'cash',
        in: 0, out: Number(e.amount) || 0,
      }));
      purchases.data?.forEach((p: any) => rows.push({
        date: p.bill_date,
        description: `Supplier paid — ${p.bill_number || 'Bill'}`,
        mode: p.payment_mode || 'cash',
        in: 0, out: Number(p.paid_amount) || 0,
      }));
      rows.sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      const withRunning = rows.map((r) => {
        running += r.in - r.out;
        return { ...r, running };
      });
      return withRunning;
    },
  });
};

// ---------- Accounts settings ----------
export const useAccountsSettings = () => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['accounts', 'settings', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_settings' as any)
        .select('*')
        .eq('store_id', store!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
};
