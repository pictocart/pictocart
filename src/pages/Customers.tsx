import { useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Phone, ShoppingBag, IndianRupee, Crown, Search } from 'lucide-react';
import { useState } from 'react';

type CustomerRow = {
  userId: string | null;
  email: string;
  name: string;
  phone: string;
  ordersCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
  registeredAt: string | null;
};

const Customers = () => {
  const { store } = useStore();
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['store-customers', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const [ordersRes, customersRes] = await Promise.all([
        supabase
        .from('orders')
        .select('id, customer_user_id, customer_email, customer_name, customer_phone, total, created_at')
        .eq('store_id', store!.id)
        .order('created_at', { ascending: false }),
        (supabase as any)
          .from('customers')
          .select('user_id, name, email, phone, created_at')
          .eq('store_id', store!.id)
          .order('created_at', { ascending: false }),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (customersRes.error) throw customersRes.error;
      return { orders: ordersRes.data || [], registered: customersRes.data || [] };
    },
  });

  const customers = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>();
    for (const c of (data?.registered || []) as any[]) {
      const key = (c.email || c.phone || c.user_id || '').toLowerCase().trim();
      if (!key) continue;
      map.set(key, {
        userId: c.user_id || null,
        email: c.email || '',
        name: c.name || '',
        phone: c.phone || '',
        ordersCount: 0,
        totalSpend: 0,
        lastOrderAt: null,
        firstOrderAt: null,
        registeredAt: c.created_at || null,
      });
    }
    for (const o of (data?.orders || []) as any[]) {
      const key = (o.customer_email || o.customer_phone || '').toLowerCase().trim();
      if (!key) continue;
      const existing = map.get(key) || {
        userId: o.customer_user_id || null,
        email: o.customer_email || '',
        name: o.customer_name || '',
        phone: o.customer_phone || '',
        ordersCount: 0,
        totalSpend: 0,
        lastOrderAt: null,
        firstOrderAt: null,
        registeredAt: null,
      };
      existing.ordersCount += 1;
      existing.totalSpend += Number(o.total || 0);
      if (!existing.lastOrderAt || o.created_at > existing.lastOrderAt) existing.lastOrderAt = o.created_at;
      if (!existing.firstOrderAt || o.created_at < existing.firstOrderAt) existing.firstOrderAt = o.created_at;
      if (!existing.name && o.customer_name) existing.name = o.customer_name;
      if (!existing.phone && o.customer_phone) existing.phone = o.customer_phone;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [data]);

  const filtered = customers.filter((c) => {
    const q = query.toLowerCase();
    return !q || c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const tier = (spend: number) =>
    spend >= 10000 ? { label: 'VIP', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' }
    : spend >= 3000 ? { label: 'Loyal', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
    : spend >= 500 ? { label: 'Repeat', tone: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' }
    : { label: 'New', tone: 'bg-muted text-muted-foreground' };

  const totals = {
    customers: customers.length,
    revenue: customers.reduce((s, c) => s + c.totalSpend, 0),
    vip: customers.filter((c) => c.totalSpend >= 10000).length,
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground">People who've ordered from {store?.name || 'your store'}.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total customers</p>
          <p className="text-2xl font-bold tabular-nums">{totals.customers}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Lifetime revenue</p>
          <p className="text-2xl font-bold tabular-nums">₹{totals.revenue.toLocaleString('en-IN')}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Crown className="h-3 w-3" />VIPs</p>
          <p className="text-2xl font-bold tabular-nums">{totals.vip}</p>
        </CardContent></Card>
      </div>

      <Card data-tour="customers-table">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">All customers</CardTitle>
            <div className="relative w-64 max-w-full">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No customers yet. They'll appear here after their first order.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => {
                const t = tier(c.totalSpend);
                return (
                  <div key={c.email + c.phone} className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 hover:bg-accent/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{c.name || c.email || c.phone || 'Customer'}</p>
                        <Badge variant="secondary" className={t.tone}>{t.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-foreground">
                            <Mail className="h-3 w-3" />{c.email}
                          </a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-foreground">
                            <Phone className="h-3 w-3" />{c.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><ShoppingBag className="h-3 w-3" />Orders</p>
                        <p className="font-semibold tabular-nums">{c.ordersCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><IndianRupee className="h-3 w-3" />Spend</p>
                        <p className="font-semibold tabular-nums">₹{c.totalSpend.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
