-- 1) Extend order_status enum with the new merchant workflow labels
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'packed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';

-- 2) Shipment fields on orders (backward compatible - existing tracking_number stays)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS awb TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_label_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pod_url TEXT;

-- 3) Enterprise Return / Exchange fields (all optional, default-safe)
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS pickup_scheduled_at TIMESTAMPTZ;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS pickup_awb TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS pickup_courier TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS qc_status TEXT;  -- pending | passed | failed
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS qc_notes TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS qc_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS customer_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS refund_status TEXT;  -- pending | processing | completed | failed
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMPTZ;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMPTZ;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS replacement_product_id UUID;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS replacement_awb TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS replacement_courier TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS replacement_shipped_at TIMESTAMPTZ;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS replacement_delivered_at TIMESTAMPTZ;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS timeline JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS internal_notes TEXT;
