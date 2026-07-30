-- Migration: Update subscription plan prices (Starter to ₹999/mo, Growth to ₹1999/mo)

-- 1. Update Starter plan prices (₹999/mo, ₹10989/yr)
UPDATE public.plan_configs 
SET price_inr = 999, 
    annual_price_inr = 10989 
WHERE plan = 'starter';

-- 2. Update Growth plan prices (₹1999/mo, ₹21989/yr)
UPDATE public.plan_configs 
SET price_inr = 1999, 
    annual_price_inr = 21989 
WHERE plan = 'growth';
