
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

CREATE POLICY "Auth users upload product media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users update own product media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users delete own product media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-media' AND auth.uid()::text = (storage.foldername(name))[1]);
