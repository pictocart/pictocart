-- 1. Products Table
DROP POLICY IF EXISTS "Store owners can manage products" ON public.products;
CREATE POLICY "Owners and staff can manage products" ON public.products 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = products.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 2. Categories Table
DROP POLICY IF EXISTS "Store owners can manage categories" ON public.categories;
CREATE POLICY "Owners and staff can manage categories" ON public.categories 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = categories.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 3. Coupons Table
DROP POLICY IF EXISTS "Store owners can manage coupons" ON public.coupons;
CREATE POLICY "Owners and staff can manage coupons" ON public.coupons 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = coupons.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 4. Blog Posts Table
DROP POLICY IF EXISTS "Store owners manage blog posts" ON public.blog_posts;
CREATE POLICY "Owners and staff can manage blog posts" ON public.blog_posts 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = blog_posts.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 5. Customers Table (SELECT/view)
DROP POLICY IF EXISTS "Store owners can view customers" ON public.customers;
CREATE POLICY "Owners and staff can view customers" ON public.customers 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = customers.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 6. Store Custom Pages Table
DROP POLICY IF EXISTS "Owners manage their custom pages" ON public.store_custom_pages;
CREATE POLICY "Owners and staff manage custom pages" ON public.store_custom_pages 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_custom_pages.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 7. Store Site Offers Table
DROP POLICY IF EXISTS "Owner manages own offer" ON public.store_site_offers;
CREATE POLICY "Owners and staff manage offers" ON public.store_site_offers 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_site_offers.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 8. Store Testimonials Table
DROP POLICY IF EXISTS "Store owners manage their testimonials" ON public.store_testimonials;
CREATE POLICY "Owners and staff manage testimonials" ON public.store_testimonials 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_testimonials.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 9. Store Google Reviews Connections Table
DROP POLICY IF EXISTS "Store owners view own connection" ON public.store_google_reviews_connections;
DROP POLICY IF EXISTS "Store owners insert own connection" ON public.store_google_reviews_connections;
DROP POLICY IF EXISTS "Store owners update own connection" ON public.store_google_reviews_connections;
DROP POLICY IF EXISTS "Store owners delete own connection" ON public.store_google_reviews_connections;

CREATE POLICY "Owners and staff view connections" ON public.store_google_reviews_connections 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_google_reviews_connections.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Owners and staff manage connections" ON public.store_google_reviews_connections 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_google_reviews_connections.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 10. AI Credit Wallets (Add INSERT policy for staff/owners to support upsert)
DROP POLICY IF EXISTS "Owners and staff insert own wallet" ON public.ai_credit_wallets;
CREATE POLICY "Owners and staff insert own wallet" ON public.ai_credit_wallets 
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = ai_credit_wallets.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );
