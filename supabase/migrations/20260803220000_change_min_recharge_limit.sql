-- Change minimum AI credit recharge limit from 99 to 9
ALTER TABLE public.platform_credit_settings ALTER COLUMN custom_min_inr SET DEFAULT 9;
UPDATE public.platform_credit_settings SET custom_min_inr = 9 WHERE id = 1;
