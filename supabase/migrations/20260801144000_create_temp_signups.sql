-- Create temporary signup storage to hold user info until OTP is verified
CREATE TABLE IF NOT EXISTS public.temp_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  store_slug TEXT NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (email, store_slug)
);

-- Enable RLS (no policies mean only service_role can access it)
ALTER TABLE public.temp_signups ENABLE ROW LEVEL SECURITY;
