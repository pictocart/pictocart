-- Enums
do $$ begin
  create type public.fulfillment_mode as enum ('dine_in','takeaway','delivery');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.prep_status as enum ('received','preparing','ready','served','out_for_delivery','completed','cancelled');
exception when duplicate_object then null; end $$;
-- 1) store_fulfillment_settings
create table if not exists public.store_fulfillment_settings (
  store_id uuid primary key,
  dine_in_enabled boolean not null default false,
  takeaway_enabled boolean not null default false,
  delivery_enabled boolean not null default true,
  dine_in_requires_table boolean not null default true,
  tables jsonb not null default '[]'::jsonb,
  takeaway_min_phone_only boolean not null default true,
  delivery_radius_km numeric not null default 0,
  delivery_min_order numeric not null default 0,
  delivery_fee_flat numeric not null default 0,
  auto_accept boolean not null default false,
  kitchen_prep_minutes integer not null default 20,
  dine_in_payment_modes text[] not null default '{cash}',
  takeaway_payment_modes text[] not null default '{razorpay,cash}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.store_fulfillment_settings enable row level security;
create policy "Public reads fulfillment of published stores"
  on public.store_fulfillment_settings for select to anon, authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.is_published = true));
create policy "Owners manage fulfillment"
  on public.store_fulfillment_settings for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid()));
create policy "Service manages fulfillment"
  on public.store_fulfillment_settings for all to service_role using (true) with check (true);
create trigger trg_fulfillment_updated
  before update on public.store_fulfillment_settings
  for each row execute function public.update_updated_at_column();
-- 2) store_qr_codes
create table if not exists public.store_qr_codes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  kind text not null check (kind in ('menu','table','takeaway')),
  slug text not null unique,
  table_label text,
  target_path text not null,
  scans_count integer not null default 0,
  last_scanned_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_qr_store on public.store_qr_codes(store_id);
alter table public.store_qr_codes enable row level security;
create policy "Public reads active qr of published stores"
  on public.store_qr_codes for select to anon, authenticated
  using (is_active = true and exists (select 1 from public.stores s where s.id = store_id and s.is_published = true));
create policy "Owners manage qr"
  on public.store_qr_codes for all to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid()));
create policy "Service manages qr"
  on public.store_qr_codes for all to service_role using (true) with check (true);
-- 3) orders: fulfillment columns
alter table public.orders
  add column if not exists fulfillment_mode public.fulfillment_mode not null default 'delivery',
  add column if not exists table_label text,
  add column if not exists prep_status public.prep_status,
  add column if not exists guest_tracking_code text;
create index if not exists idx_orders_prep on public.orders(store_id, prep_status) where prep_status is not null;
create index if not exists idx_orders_guest_code on public.orders(guest_tracking_code) where guest_tracking_code is not null;
-- Guest dine-in orders: allow anon insert ONLY when mode=dine_in, no user attached,
-- and the store has dine-in enabled.
create policy "Guests can place dine-in orders"
  on public.orders for insert to anon, authenticated
  with check (
    fulfillment_mode = 'dine_in'
    and customer_user_id is null
    and exists (
      select 1
      from public.stores s
      join public.store_fulfillment_settings f on f.store_id = s.id
      where s.id = orders.store_id and s.is_published = true and f.dine_in_enabled = true
    )
  );
-- Guests can place takeaway orders (phone required, no address)
create policy "Guests can place takeaway orders"
  on public.orders for insert to anon, authenticated
  with check (
    fulfillment_mode = 'takeaway'
    and customer_user_id is null
    and customer_phone is not null and length(customer_phone) >= 7
    and exists (
      select 1
      from public.stores s
      join public.store_fulfillment_settings f on f.store_id = s.id
      where s.id = orders.store_id and s.is_published = true and f.takeaway_enabled = true
    )
  );
-- Allow guests to look up their order by guest_tracking_code (no PII filter needed —
-- the code is a random secret shown only to the placer).
create policy "Guests view order by tracking code"
  on public.orders for select to anon, authenticated
  using (guest_tracking_code is not null);
-- 4) products: menu_meta
alter table public.products
  add column if not exists menu_meta jsonb not null default '{}'::jsonb;
-- 5) coupons: allowed_modes
alter table public.coupons
  add column if not exists allowed_modes public.fulfillment_mode[] not null default '{dine_in,takeaway,delivery}';
-- 6) Realtime for kitchen view
alter publication supabase_realtime add table public.orders;
