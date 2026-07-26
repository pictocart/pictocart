-- Registry of all LLM models available on the platform.
-- Admin can add/remove/toggle models from the AI Health dashboard.
-- edge functions read from ai_action_costs.model (per-action); this table is
-- a master registry so admins know what is available to assign.

CREATE TABLE IF NOT EXISTS public.platform_llm_models (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id    text NOT NULL UNIQUE,          -- e.g. "google/gemini-2.5-flash"
  label       text NOT NULL,                 -- human name
  provider    text NOT NULL,                 -- "Lovable" | "Groq" | "NVIDIA"
  api_base    text NOT NULL,                 -- endpoint URL
  is_active   boolean NOT NULL DEFAULT true,
  supports_vision boolean NOT NULL DEFAULT false,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_llm_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage llm models"
  ON public.platform_llm_models FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages llm models"
  ON public.platform_llm_models FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_llm_models_updated
  BEFORE UPDATE ON public.platform_llm_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Seed known models ─────────────────────────────────────────────────────────
INSERT INTO public.platform_llm_models (model_id, label, provider, api_base, supports_vision) VALUES
  ('google/gemini-2.5-flash',               'Gemini 2.5 Flash',              'Lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', false),
  ('google/gemini-2.5-flash-lite',          'Gemini 2.5 Flash Lite',         'Lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', false),
  ('google/gemini-2.5-pro',                 'Gemini 2.5 Pro',                'Lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', false),
  ('google/gemini-3-flash-preview',         'Gemini 3 Flash Preview',        'Lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', false),
  ('google/gemini-3.1-pro-preview',         'Gemini 3.1 Pro Preview',        'Lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', false),
  ('google/gemini-2.5-flash-image',         'Gemini 2.5 Flash Image',        'Lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', true),
  ('google/gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image Preview','Lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', true),
  ('llama-3.3-70b-versatile',               'Llama 3.3 70B Versatile',       'Groq',    'https://api.groq.com/openai/v1/chat/completions',    false),
  ('meta/llama-3.2-11b-vision-instruct',    'Llama 3.2 11B Vision',          'NVIDIA',  'https://integrate.api.nvidia.com/v1/chat/completions', true),
  ('meta/llama-3.2-90b-vision-instruct',    'Llama 3.2 90B Vision',          'NVIDIA',  'https://integrate.api.nvidia.com/v1/chat/completions', true),
  ('sarvam-30b',                            'Sarvam 30B',                    'Lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', false)
ON CONFLICT (model_id) DO NOTHING;
