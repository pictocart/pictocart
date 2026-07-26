-- Each LLM model can have its own API key stored as a Supabase secret.
-- secret_key_name stores the NAME of the secret (e.g. "NVIDIA_API_KEY"),
-- NOT the actual key value. The edge function reads Deno.env.get(secret_key_name).

ALTER TABLE public.platform_llm_models
  ADD COLUMN IF NOT EXISTS secret_key_name text;

COMMENT ON COLUMN public.platform_llm_models.secret_key_name
  IS 'Name of the Supabase secret holding this model''s API key, e.g. NVIDIA_API_KEY';

-- Seed default key names for existing models
UPDATE public.platform_llm_models
  SET secret_key_name = 'NVIDIA_API_KEY'
  WHERE provider = 'NVIDIA' AND secret_key_name IS NULL;
