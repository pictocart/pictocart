ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS home_page_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
INSERT INTO public.ai_action_costs(action_key, label, credits, cache_hit_credits, manual_cost_inr, manual_minutes, model, is_active)
VALUES ('generate-product-image', 'Generate product image with AI', 10, 1, 200, 8, 'google/gemini-2.5-flash-image', true)
ON CONFLICT (action_key) DO UPDATE SET is_active = true;
