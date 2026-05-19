import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, AlertTriangle, Users, Truck, Plus,
  Wallet, Receipt, Package, FileText, Banknote, ShoppingBag,
} from 'lucide-react';
import { inr, todayISO, daysAgoISO } from '@/components/accounts/AccountsPrimitives';
import { useLowStockProducts, usePnl } from '@/hooks/useAccounts';

const AccountsOverview = () => {
  const { store } = useStore();
  const navigate = useNavigate();
  const today = todayISO();
  const from30 = daysAgoISO(29);

  const { data: lowStock = [] } = useLowStockProducts();
  const { data: pnl30 } = usePnl(from30, today);

  const { data: today_stats } = useQuery({
    queryKey: ['accounts', 'today', store?.id],
    enabled: !!store?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const [orders, exp, khataCredit, supplierDue] = await Promise.all([
        supabase.from('orders').select('total, payment_status, created_at')
          .eq('store_id', store!.id).eq('payment_status', 'paid')
          .gte('created_at', today + 'T00:00:00').lte('created_at', today + 'T23:59:59'),
        supabase.from('expenses' as any).select('amount').eq('store_id', store!.id).eq('expense_date', today),
        supabase.from('customers').select('balance').eq('store_id', store!.id).gt('balance', 0),
        supabase.from('purchase_bills' as any).select('total, paid_amount').eq('store_id', store!.id).neq('payment_status', 'paid'),
      ]);
      const todayRev = (orders.data ?? []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const todayExp = (exp.data ?? []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const receivables = (khataCredit.data ?? []).reduce((s: number, c: any) => s + Number(c.balance || 0), 0);
      const payables = (supplierDue.data ?? []).reduce((s: number, p: any) => s + (Number(p.total || 0) - Number(p.paid_amount || 0)), 0);
      return { todayRev, todayExp, receivables, payables };
    },
  });

  const kpis = useMemo(() => ([
    { label: "Today's revenue", value: inr(today_stats?.todayRev || 0), icon: TrendingUp, accent: 'text-emerald-600' },
    { label: "Today's expenses", value: inr(today_stats?.todayExp || 0), icon: TrendingDown, accent: 'text-rose-600' },
    { label: 'Net today', value: inr((today_stats?.todayRev || 0) - (today_stats?.todayExp || 0)), icon: Wallet, accent: 'text-primary' },
    { label: 'Receivables (Khata)', value: inr(today_stats?.receivables || 0), icon: Users, accent: 'text-amber-600' },
    { label: 'Payables (Suppliers)', value: inr(today_stats?.payables || 0), icon: Truck, accent: 'text-orange-600' },
    { label: '30-day net profit', value: inr(pnl30?.net_profit || 0), icon: TrendingUp, accent: 'text-emerald-600' },
  ]), [today_stats, pnl30]);

  const quickLinks = [
    { label: 'New Expense', icon: Banknote, to: '/accounts/expenses' },
    { label: 'New Purchase', icon: ShoppingBag, to: '/accounts/purchases' },
    { label: 'Khata Entry', icon: Users, to: '/accounts/khata' },
    { label: 'Invoices', icon: Receipt, to: '/invoices' },
    { label: 'Profit & Loss', icon: TrendingUp, to: '/accounts/reports/pnl' },
    { label: 'Cash Book', icon: Wallet, to: '/accounts/reports/cashbook' },
    { label: 'GST Summary', icon: FileText, to: '/accounts/reports/gst' },
    { label: 'Inventory Ledger', icon: Package, to: '/accounts/inventory' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">Your business books at a glance.</p>
        </div>
        <Button onClick={() => navigate('/accounts/expenses')}>
          <Plus className="h-4 w-4 mr-1" /> Quick add
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <k.icon className={`h-4 w-4 ${k.accent}`} />
              </div>
              <p className="text-lg font-semibold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Low stock — {lowStock.length} item(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.slice(0, 8).map((p: any) => (
                <Badge key={p.id} variant="outline" className="border-amber-400 bg-white">
                  {p.title} — {p.inventory_count}/{p.reorder_level}
                </Badge>
              ))}
            </div>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => navigate('/accounts/purchases')}>
                Record a Purchase
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Quick actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((q) => (
            <Link key={q.to} to={q.to}
              className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition">
              <q.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountsOverview;
