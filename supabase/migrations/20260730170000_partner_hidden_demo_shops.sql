-- Migration: Create partner_hidden_demo_shops table and visibility query function

CREATE TABLE IF NOT EXISTS public.partner_hidden_demo_shops (
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  demo_shop_id UUID REFERENCES public.partner_demo_shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (partner_id, demo_shop_id)
);

-- Enable RLS
ALTER TABLE public.partner_hidden_demo_shops ENABLE ROW LEVEL SECURITY;

-- Allow read/write to authenticated users/admins
CREATE POLICY "Allow read/write partner_hidden_demo_shops"
ON public.partner_hidden_demo_shops
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Function to get visible demo stores for a partner
CREATE OR REPLACE FUNCTION public.get_visible_demo_shops_for_partner(_partner_id UUID)
RETURNS TABLE (
  id UUID,
  category TEXT,
  shop_name TEXT,
  shop_id TEXT,
  password TEXT,
  direct_access_url TEXT,
  extra_message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT pds.id, pds.category, pds.shop_name, pds.shop_id, pds.password, pds.direct_access_url, pds.extra_message, pds.created_at
  FROM public.partner_demo_shops pds
  WHERE pds.id NOT IN (
    SELECT phds.demo_shop_id 
    FROM public.partner_hidden_demo_shops phds 
    WHERE phds.partner_id = _partner_id
  )
  ORDER BY pds.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
