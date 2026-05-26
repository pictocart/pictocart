
-- =========================================================================
-- SourceIndia: sourcing + supplier marketplace
-- =========================================================================

CREATE TABLE public.sourcing_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  gstin TEXT,
  gst_verified BOOLEAN NOT NULL DEFAULT false,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT NOT NULL DEFAULT 'India',
  categories TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  min_order_value NUMERIC,
  default_lead_time_days INT,
  ships_pan_india BOOLEAN NOT NULL DEFAULT true,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  commission_pct NUMERIC NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  rating NUMERIC NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'self_signup',
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_src_suppliers_status ON public.sourcing_suppliers(status);
CREATE INDEX idx_src_suppliers_user ON public.sourcing_suppliers(user_id);
CREATE INDEX idx_src_suppliers_categories ON public.sourcing_suppliers USING GIN(categories);
CREATE UNIQUE INDEX idx_src_suppliers_gstin ON public.sourcing_suppliers(gstin) WHERE gstin IS NOT NULL;

ALTER TABLE public.sourcing_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "src_suppliers_public_read" ON public.sourcing_suppliers FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "src_suppliers_self_insert" ON public.sourcing_suppliers FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "src_suppliers_self_update" ON public.sourcing_suppliers FOR UPDATE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "src_suppliers_admin_delete" ON public.sourcing_suppliers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_src_suppliers_updated_at BEFORE UPDATE ON public.sourcing_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sourcing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.sourcing_suppliers(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  source_url TEXT,
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  hero_image TEXT,
  moq INT,
  price_min NUMERIC,
  price_max NUMERIC,
  currency TEXT NOT NULL DEFAULT 'INR',
  suggested_retail_price NUMERIC,
  estimated_margin_pct NUMERIC,
  supplier_name_cached TEXT,
  supplier_city_cached TEXT,
  supplier_phone_masked TEXT,
  supplier_phone_full TEXT,
  supplier_email_full TEXT,
  ships_pan_india BOOLEAN NOT NULL DEFAULT true,
  lead_time_days INT,
  rating NUMERIC,
  reviews_count INT,
  ai_score NUMERIC NOT NULL DEFAULT 0,
  ai_insight TEXT,
  raw_json JSONB,
  dedupe_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sourcing_products_category ON public.sourcing_products(category);
CREATE INDEX idx_sourcing_products_supplier ON public.sourcing_products(supplier_id);
CREATE INDEX idx_sourcing_products_score ON public.sourcing_products(ai_score DESC);
CREATE INDEX idx_sourcing_products_tags ON public.sourcing_products USING GIN(tags);
CREATE INDEX idx_sourcing_products_active ON public.sourcing_products(is_active, created_at DESC);
CREATE UNIQUE INDEX idx_sourcing_products_dedupe ON public.sourcing_products(dedupe_hash) WHERE dedupe_hash IS NOT NULL;

ALTER TABLE public.sourcing_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sourcing_products_public_read" ON public.sourcing_products FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sourcing_products_supplier_insert" ON public.sourcing_products FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.sourcing_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));
CREATE POLICY "sourcing_products_supplier_update" ON public.sourcing_products FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.sourcing_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));
CREATE POLICY "sourcing_products_supplier_delete" ON public.sourcing_products FOR DELETE
  USING (public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.sourcing_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

CREATE TRIGGER trg_sourcing_products_updated_at BEFORE UPDATE ON public.sourcing_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sourcing_viral_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.sourcing_products(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  growth_pct NUMERIC,
  trend_score NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  reason TEXT,
  week_of DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_viral_week ON public.sourcing_viral_products(week_of DESC, rank ASC);
CREATE INDEX idx_viral_product ON public.sourcing_viral_products(product_id);

ALTER TABLE public.sourcing_viral_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "viral_public_read" ON public.sourcing_viral_products FOR SELECT USING (true);
CREATE POLICY "viral_admin_manage" ON public.sourcing_viral_products FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.merchant_sourcing_saved (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.sourcing_products(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, product_id)
);
CREATE INDEX idx_saved_store ON public.merchant_sourcing_saved(store_id);
ALTER TABLE public.merchant_sourcing_saved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_owner_all" ON public.merchant_sourcing_saved FOR ALL
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.merchant_supplier_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.sourcing_suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.sourcing_products(id) ON DELETE SET NULL,
  credits_charged INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, supplier_id)
);
CREATE INDEX idx_unlocks_store ON public.merchant_supplier_unlocks(store_id);
ALTER TABLE public.merchant_supplier_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlocks_owner_read" ON public.merchant_supplier_unlocks FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sourcing_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.sourcing_suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.sourcing_products(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'quote',
  quantity INT,
  target_price NUMERIC,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_src_inq_store ON public.sourcing_inquiries(store_id);
CREATE INDEX idx_src_inq_supplier ON public.sourcing_inquiries(supplier_id);
ALTER TABLE public.sourcing_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "src_inq_read" ON public.sourcing_inquiries FOR SELECT
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.sourcing_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "src_inq_insert" ON public.sourcing_inquiries FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "src_inq_update" ON public.sourcing_inquiries FOR UPDATE
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.sourcing_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_src_inq_updated_at BEFORE UPDATE ON public.sourcing_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dropship_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.sourcing_suppliers(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.sourcing_products(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  wholesale_cost NUMERIC NOT NULL DEFAULT 0,
  retail_price NUMERIC NOT NULL DEFAULT 0,
  margin NUMERIC NOT NULL DEFAULT 0,
  shipping_address JSONB NOT NULL,
  supplier_invoice_url TEXT,
  tracking_number TEXT,
  courier TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  forwarded_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dropship_store ON public.dropship_orders(store_id);
CREATE INDEX idx_dropship_supplier ON public.dropship_orders(supplier_id);
CREATE INDEX idx_dropship_status ON public.dropship_orders(status);
ALTER TABLE public.dropship_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dropship_read" ON public.dropship_orders FOR SELECT
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.sourcing_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "dropship_insert" ON public.dropship_orders FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "dropship_update" ON public.dropship_orders FOR UPDATE
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.sourcing_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_dropship_updated_at BEFORE UPDATE ON public.dropship_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sourcing_supplier_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.sourcing_suppliers(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, store_id)
);
CREATE INDEX idx_src_reviews_supplier ON public.sourcing_supplier_reviews(supplier_id);
ALTER TABLE public.sourcing_supplier_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "src_reviews_public_read" ON public.sourcing_supplier_reviews FOR SELECT USING (true);
CREATE POLICY "src_reviews_owner_all" ON public.sourcing_supplier_reviews FOR ALL
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.sourcing_supplier_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.sourcing_suppliers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',
  reference TEXT,
  period_start DATE,
  period_end DATE,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_src_payouts_supplier ON public.sourcing_supplier_payouts(supplier_id);
ALTER TABLE public.sourcing_supplier_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "src_payouts_supplier_read" ON public.sourcing_supplier_payouts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sourcing_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "src_payouts_admin_manage" ON public.sourcing_supplier_payouts FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_src_payouts_updated_at BEFORE UPDATE ON public.sourcing_supplier_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_action_costs (action_key, label, credits, cache_hit_credits, manual_cost_inr, manual_minutes, is_active)
VALUES
  ('sourcing_search', 'Source product search', 2, 0, 50, 30, true),
  ('sourcing_reveal_contact', 'Unlock supplier contact', 5, 0, 100, 15, true),
  ('sourcing_import', 'Import sourced product', 1, 0, 20, 10, true),
  ('sourcing_deep_scrape', 'Deep supplier scrape', 5, 0, 150, 20, true)
ON CONFLICT (action_key) DO NOTHING;
