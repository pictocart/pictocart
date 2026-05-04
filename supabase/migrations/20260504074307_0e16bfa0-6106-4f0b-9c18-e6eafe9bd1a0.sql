UPDATE public.subscriptions
SET plan = 'scale',
    status = 'active',
    current_period_start = now(),
    current_period_end = now() + interval '1 year',
    cancelled_at = NULL,
    updated_at = now()
WHERE store_id = '247470d1-b5e6-4e13-b631-e701e2b03d8e';