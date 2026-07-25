-- Add razorpay_domain_verified flag to store_secrets
-- Merchants must confirm they have added & verified their domain on Razorpay
-- before online payments are activated on the storefront.

ALTER TABLE public.store_secrets
  ADD COLUMN IF NOT EXISTS razorpay_domain_verified boolean NOT NULL DEFAULT false;
