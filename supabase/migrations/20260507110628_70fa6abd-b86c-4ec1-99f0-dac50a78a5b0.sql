
ALTER TABLE public.store_secrets ADD COLUMN IF NOT EXISTS shiprocket_email text;
ALTER TABLE public.store_secrets ADD COLUMN IF NOT EXISTS shiprocket_password text;
ALTER TABLE public.store_secrets ADD COLUMN IF NOT EXISTS shiprocket_token text;
ALTER TABLE public.store_secrets ADD COLUMN IF NOT EXISTS shiprocket_token_expires_at timestamptz;
ALTER TABLE public.store_secrets ADD COLUMN IF NOT EXISTS preferred_courier text DEFAULT 'delhivery';
