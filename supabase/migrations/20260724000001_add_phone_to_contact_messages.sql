-- Add phone column to contact_messages (nullable, for existing deployments)
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS phone text;
