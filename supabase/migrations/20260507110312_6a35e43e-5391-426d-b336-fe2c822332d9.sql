
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderated_by uuid;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderation_notes text;
CREATE INDEX IF NOT EXISTS idx_reviews_moderation ON public.reviews(store_id, moderation_status);
