
-- Table: theme_section_blueprints
-- Pre-built section JSON templates that the AI assembles instead of generating from scratch
CREATE TABLE public.theme_section_blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_type TEXT NOT NULL,
  layout TEXT NOT NULL DEFAULT 'full-width',
  variant_name TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  category_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: theme_image_pool
-- Reusable AI-generated images tagged by category and section type
CREATE TABLE public.theme_image_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  section_type TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.theme_section_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_image_pool ENABLE ROW LEVEL SECURITY;

-- Blueprints: admins can manage, authenticated can read
CREATE POLICY "Admins can manage blueprints"
  ON public.theme_section_blueprints FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read blueprints"
  ON public.theme_section_blueprints FOR SELECT
  TO authenticated
  USING (true);

-- Image pool: admins can manage, authenticated can read
CREATE POLICY "Admins can manage image pool"
  ON public.theme_image_pool FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read image pool"
  ON public.theme_image_pool FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for fast lookups
CREATE INDEX idx_blueprints_section_type ON public.theme_section_blueprints (section_type);
CREATE INDEX idx_blueprints_category_tags ON public.theme_section_blueprints USING GIN (category_tags);
CREATE INDEX idx_image_pool_category_section ON public.theme_image_pool (category, section_type);
