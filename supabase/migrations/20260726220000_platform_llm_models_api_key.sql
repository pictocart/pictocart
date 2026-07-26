-- Store API key directly in platform_llm_models table.
-- Protected by RLS — only service_role (edge functions) reads api_key.
-- Admin UI shows masked value (***) and can update it.

ALTER TABLE public.platform_llm_models
  ADD COLUMN IF NOT EXISTS api_key text;

COMMENT ON COLUMN public.platform_llm_models.api_key
  IS 'API key for this model/provider. Only readable by service_role.';

-- Seed NVIDIA_API_KEY value from existing Supabase secret (manual step — 
-- admin must enter via UI after this migration runs).
