-- Blog posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  body text DEFAULT '',
  cover_image text,
  is_published boolean DEFAULT false,
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, slug)
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners manage blog posts" ON public.blog_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = blog_posts.store_id AND stores.user_id = auth.uid()));
CREATE POLICY "Public can read published posts" ON public.blog_posts FOR SELECT
  USING (is_published = true AND EXISTS (SELECT 1 FROM stores WHERE stores.id = blog_posts.store_id AND stores.is_published = true));
-- Newsletter subscribers
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  subscribed_at timestamptz DEFAULT now(),
  UNIQUE(store_id, email)
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Store owners can view subscribers" ON public.newsletter_subscribers FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = newsletter_subscribers.store_id AND stores.user_id = auth.uid()));
-- Updated at triggers
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
