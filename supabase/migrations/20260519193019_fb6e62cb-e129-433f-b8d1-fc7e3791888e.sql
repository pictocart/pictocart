-- =========================================================
-- Accounts module migration
-- =========================================================

-- --------- Schema additions on existing tables ----------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 0;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS balance numeric(12,2) NOT NULL DEFAULT 0;

-- --------- Enums ----------
DO $$ BEGIN
  CREATE TYPE public.payment_mode_t AS ENUM ('cash','upi','card','bank','credit','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bill_payment_status AS ENUM ('paid','partial','unpaid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.khata_entry_type AS ENUM ('credit','payment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inv_movement_type AS ENUM ('opening','purchase','sale','adjustment','return');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------- Suppliers ----------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  gstin text,
  address jsonb DEFAULT '{}'::jsonb,
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_store ON public.suppliers(store_id, created_at DESC);

-- --------- Purchase bills ----------
CREATE TABLE IF NOT EXISTS public.purchase_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  bill_number text,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_status public.bill_payment_status NOT NULL DEFAULT 'unpaid',
  payment_mode public.payment_mode_t,
  attachment_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_store ON public.purchase_bills(store_id, bill_date DESC);

-- --------- Expense categories ----------
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, name)
);

-- --------- Expenses ----------
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode public.payment_mode_t NOT NULL DEFAULT 'cash',
  notes text,
  attachment_url text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence text,
  parent_expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON public.expenses(store_id, expense_date DESC);

-- --------- Khata entries ----------
CREATE TABLE IF NOT EXISTS public.khata_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  entry_type public.khata_entry_type NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_mode public.payment_mode_t,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_khata_store_date ON public.khata_entries(store_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_khata_customer ON public.khata_entries(customer_id) WHERE customer_id IS NOT NULL;

-- --------- Inventory movements ----------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type public.inv_movement_type NOT NULL,
  qty integer NOT NULL,
  reference_table text,
  reference_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_movements_store_product ON public.inventory_movements(store_id, product_id, created_at DESC);

-- --------- Accounts settings (1 per store) ----------
CREATE TABLE IF NOT EXISTS public.accounts_settings (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  opening_cash numeric(12,2) NOT NULL DEFAULT 0,
  opening_bank numeric(12,2) NOT NULL DEFAULT 0,
  low_stock_notify_enabled boolean NOT NULL DEFAULT true,
  gst_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --------- updated_at triggers ----------
DROP TRIGGER IF EXISTS trg_suppliers_updated ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_purchase_bills_updated ON public.purchase_bills;
CREATE TRIGGER trg_purchase_bills_updated BEFORE UPDATE ON public.purchase_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_expenses_updated ON public.expenses;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------- Customer balance trigger ----------
CREATE OR REPLACE FUNCTION public.recompute_customer_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  cid uuid;
BEGIN
  cid := COALESCE(NEW.customer_id, OLD.customer_id);
  IF cid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.customers c
  SET balance = COALESCE((
    SELECT SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END)
    FROM public.khata_entries WHERE customer_id = cid
  ), 0)
  WHERE c.id = cid;
  RETURN COALESCE(NEW, OLD);
END;
$fn$;

DROP TRIGGER IF EXISTS trg_khata_balance ON public.khata_entries;
CREATE TRIGGER trg_khata_balance
AFTER INSERT OR UPDATE OR DELETE ON public.khata_entries
FOR EACH ROW EXECUTE FUNCTION public.recompute_customer_balance();

-- --------- Inventory on purchase trigger ----------
CREATE OR REPLACE FUNCTION public.inventory_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  item jsonb;
  pid uuid;
  q int;
BEGIN
  FOR item IN SELECT jsonb_array_elements(NEW.items) LOOP
    pid := NULLIF(item->>'product_id','')::uuid;
    q := COALESCE((item->>'quantity')::int, 0);
    IF pid IS NOT NULL AND q > 0 THEN
      UPDATE public.products
        SET inventory_count = COALESCE(inventory_count,0) + q
        WHERE id = pid AND store_id = NEW.store_id;
      INSERT INTO public.inventory_movements(store_id, product_id, movement_type, qty, reference_table, reference_id, notes)
      VALUES (NEW.store_id, pid, 'purchase', q, 'purchase_bills', NEW.id, NEW.bill_number);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_inv_on_purchase ON public.purchase_bills;
CREATE TRIGGER trg_inv_on_purchase
AFTER INSERT ON public.purchase_bills
FOR EACH ROW EXECUTE FUNCTION public.inventory_on_purchase();

-- --------- Extend sale trigger to log movements ----------
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  item jsonb;
  qty int;
  pid uuid;
BEGIN
  FOR item IN SELECT jsonb_array_elements(NEW.items) LOOP
    pid := NULLIF(item->>'product_id','')::uuid;
    qty := COALESCE((item->>'quantity')::int, 1);
    IF pid IS NOT NULL THEN
      UPDATE public.products
        SET inventory_count = GREATEST(inventory_count - qty, 0)
        WHERE id = pid;
      INSERT INTO public.inventory_movements(store_id, product_id, movement_type, qty, reference_table, reference_id, notes)
      VALUES (NEW.store_id, pid, 'sale', -qty, 'orders', NEW.id, NEW.order_number);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$fn$;

-- --------- P&L RPC ----------
CREATE OR REPLACE FUNCTION public.pnl_report(_store_id uuid, _from date, _to date)
RETURNS TABLE (
  revenue numeric,
  cogs numeric,
  expenses_total numeric,
  tax_collected numeric,
  net_profit numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _rev numeric := 0;
  _cogs numeric := 0;
  _tax numeric := 0;
  _exp numeric := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')
          OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = _store_id AND s.user_id = auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(SUM(o.total - COALESCE(o.tax,0)), 0),
         COALESCE(SUM(o.tax), 0)
    INTO _rev, _tax
  FROM public.orders o
  WHERE o.store_id = _store_id
    AND o.payment_status = 'paid'
    AND o.created_at::date BETWEEN _from AND _to;

  SELECT COALESCE(SUM(
    COALESCE((it->>'quantity')::numeric,0) * COALESCE(p.cost_price,0)
  ), 0) INTO _cogs
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) it
  LEFT JOIN public.products p ON p.id = NULLIF(it->>'product_id','')::uuid
  WHERE o.store_id = _store_id
    AND o.payment_status = 'paid'
    AND o.created_at::date BETWEEN _from AND _to;

  SELECT COALESCE(SUM(amount), 0) INTO _exp
  FROM public.expenses
  WHERE store_id = _store_id AND expense_date BETWEEN _from AND _to;

  revenue := _rev;
  cogs := _cogs;
  expenses_total := _exp;
  tax_collected := _tax;
  net_profit := _rev - _cogs - _exp;
  RETURN NEXT;
END;
$fn$;

-- --------- RLS ----------
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_settings ENABLE ROW LEVEL SECURITY;

-- Helper macro via repeated policy blocks
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['suppliers','purchase_bills','expenses','expense_categories','khata_entries','inventory_movements']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner_all_%1$s" ON public.%1$s', t);
    EXECUTE format($p$CREATE POLICY "owner_all_%1$s" ON public.%1$s
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = %1$s.store_id AND s.user_id = auth.uid())
             OR public.has_role(auth.uid(),'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = %1$s.store_id AND s.user_id = auth.uid())
             OR public.has_role(auth.uid(),'admin'))$p$, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "owner_all_accounts_settings" ON public.accounts_settings;
CREATE POLICY "owner_all_accounts_settings" ON public.accounts_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = accounts_settings.store_id AND s.user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = accounts_settings.store_id AND s.user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'));

-- --------- Seed default expense categories for each existing store ----------
INSERT INTO public.expense_categories (store_id, name, is_default)
SELECT s.id, c.name, true
FROM public.stores s
CROSS JOIN (VALUES
  ('Rent'),('Salary & Wages'),('Electricity'),('Gas/Fuel'),
  ('Internet/Phone'),('Marketing'),('Packaging'),('Repairs'),
  ('Transport'),('Bank charges'),('Other')
) c(name)
ON CONFLICT (store_id, name) DO NOTHING;
