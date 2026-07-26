DELETE FROM public.analytics_events WHERE store_id='6cdeb4fd-d936-4241-bf7d-f3843048a703' AND event_type IN ('purchase','add_to_cart');
DELETE FROM public.orders WHERE store_id='6cdeb4fd-d936-4241-bf7d-f3843048a703';
