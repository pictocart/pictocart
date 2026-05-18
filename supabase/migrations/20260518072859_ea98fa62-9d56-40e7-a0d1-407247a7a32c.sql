UPDATE public.subscriptions
SET plan = 'growth',
    status = 'active',
    current_period_start = now(),
    current_period_end = now() + interval '1 year',
    updated_at = now()
WHERE store_id = '6cdeb4fd-d936-4241-bf7d-f3843048a703';