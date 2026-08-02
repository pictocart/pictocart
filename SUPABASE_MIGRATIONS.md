# Supabase Database Migrations History

This file maintains an automated record of all schema migrations generated for this project.

## How to track new database changes
Whenever you make changes to the Dev Supabase database (in the dashboard or tables), run the following command in your terminal:
```bash
node track-db.js "your_feature_name"
```
This will automatically generate the SQL migration file and record it here.

---

## Migration Records

| Date (IST) | Migration File | Description | SQL Summary |
| 02 Aug 2026 22:30 | [disable_automatic_default_licenses.sql](file:///d:/store-on-tips/supabase/migrations/20260802223000_disable_automatic_default_licenses.sql) | Disable Default Licenses Allocation | Redefined all signatures of allocate_partner_licenses RPC as no-ops to completely disable default license allocations. |
| 02 Aug 2026 20:00 | [add_staff_rls_to_all_ecommerce_tables.sql](file:///d:/store-on-tips/supabase/migrations/20260802200000_add_staff_rls_to_all_ecommerce_tables.sql) | E-commerce RLS Policies Update | Dropped owner-only check and allowed staff full manage access to products, categories, coupons, pages, etc. |
| 02 Aug 2026 19:15 | [add_staff_rls_to_wallets_and_txns.sql](file:///d:/store-on-tips/supabase/migrations/20260802191500_add_staff_rls_to_wallets_and_txns.sql) | DB RLS Policies Update | Dropped owner-only check and updated SELECT/UPDATE RLS policies on wallets/txns to support staff queries. |
| 02 Aug 2026 19:10 | [add_employee_role_to_staff.sql](file:///d:/store-on-tips/supabase/migrations/20260802183500_add_employee_role_to_staff.sql) | DB Schema & Trigger Update | Added `employee_id` text column, updated constraint for `'employee'` role, and redefined staff helper functions. |
| 02 Aug 2026 17:35 | [admin-manage-user](file:///d:/store-on-tips/supabase/functions/admin-manage-user/index.ts) | Edge Function Update | Added `create_user` action to allow admin to create users with `email_confirm: true` and assign `seller` role. |
| 02 Aug 2026 17:30 | [auth-email-hook](file:///d:/store-on-tips/supabase/functions/auth-email-hook/index.ts) | Edge Function Update | Reverted fallback sender to `noreply@pictocart.in` (ready for domain verification). |
| 02 Aug 2026 15:15 | [config.toml](file:///d:/store-on-tips/supabase/config.toml) | Config Push | Pushed redirect URLs (`localhost:5173`, Vercel previews) and enabled `auth.hook.send_email`. |
| 02 Aug 2026 15:10 | Database Vault & Secrets | Secrets Migration | Migrated all 15 vault secrets, configured `RESEND_API_KEY`, and updated service role key. |
| 02 Aug 2026 14:55 | Database Table Updates | Theme Activation & Admin Password | Deactivated other themes except Vibrant Gourmet and Style Up. Set admin password to `password123`. |

---

## Production Deployment Checklist (How to apply to Main Server)
When you merge `dev` into `main` and want to apply these changes to the Production Supabase project (`wuqznkpaldtvpfpdtllp`), follow this checklist:

### 1. Database Migrations (Schema & Triggers)
Run the migration push command:
```bash
npx supabase db push --project-ref wuqznkpaldtvpfpdtllp --password <PROD_DB_PASSWORD>
```

### 2. Project Configurations (Redirects & Email Hook)
1. In `supabase/config.toml`, temporarily change the `uri` of `[auth.hook.send_email]` to point to production:
   `uri = "https://wuqznkpaldtvpfpdtllp.supabase.co/functions/v1/auth-email-hook"`
2. Set the `site_url` to `"https://www.pictocart.in/"`.
3. Run the configuration push command:
   ```bash
   $env:SUPABASE_ACCESS_TOKEN="<PROD_ACCESS_TOKEN>"; npx supabase config push --project-ref wuqznkpaldtvpfpdtllp
   ```
4. Revert `config.toml` back to its local/dev values.

### 3. Deploy Edge Functions
Deploy both modified Edge Functions to production:
```bash
$env:SUPABASE_ACCESS_TOKEN="<PROD_ACCESS_TOKEN>"; npx supabase functions deploy auth-email-hook --project-ref wuqznkpaldtvpfpdtllp
$env:SUPABASE_ACCESS_TOKEN="<PROD_ACCESS_TOKEN>"; npx supabase functions deploy admin-manage-user --project-ref wuqznkpaldtvpfpdtllp
```

### 4. Database Data Configuration (SQL)
Run these queries on your Production Database (via SQL Editor in dashboard):
```sql
-- Deactivate all themes except Style Up and Vibrant Gourmet in Production
UPDATE public.theme_master_projects 
SET is_active = CASE 
  WHEN theme_id IN ('theme-70904877', 'theme-styleup') THEN true 
  ELSE false 
END;

-- Drop the old constraint, add 'employee' role and employee_id column to staff table
ALTER TABLE public.store_staff ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.store_staff DROP CONSTRAINT IF EXISTS store_staff_role_check;
ALTER TABLE public.store_staff ADD CONSTRAINT store_staff_role_check CHECK (role IN ('waiter', 'chef', 'manager', 'employee'));

-- Update RLS policies on public.ai_credit_wallets and public.ai_credit_transactions to allow staff
DROP POLICY IF EXISTS "Owners view own wallet" ON public.ai_credit_wallets;
DROP POLICY IF EXISTS "Owners update own wallet prefs" ON public.ai_credit_wallets;
CREATE POLICY "Owners and staff view own wallet" ON public.ai_credit_wallets FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ai_credit_wallets.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
CREATE POLICY "Owners and staff update own wallet prefs" ON public.ai_credit_wallets FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ai_credit_wallets.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Owners view own txns" ON public.ai_credit_transactions;
CREATE POLICY "Owners and staff view own txns" ON public.ai_credit_transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ai_credit_transactions.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);

-- E-commerce RLS policies (products, categories, coupons, pages, connection, testimonials) to allow staff management
DROP POLICY IF EXISTS "Store owners can manage products" ON public.products;
CREATE POLICY "Owners and staff can manage products" ON public.products FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Store owners can manage categories" ON public.categories;
CREATE POLICY "Owners and staff can manage categories" ON public.categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = categories.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Store owners can manage coupons" ON public.coupons;
CREATE POLICY "Owners and staff can manage coupons" ON public.coupons FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = coupons.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Store owners manage blog posts" ON public.blog_posts;
CREATE POLICY "Owners and staff can manage blog posts" ON public.blog_posts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = blog_posts.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Store owners can view customers" ON public.customers;
CREATE POLICY "Owners and staff can view customers" ON public.customers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = customers.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Owners manage their custom pages" ON public.store_custom_pages;
CREATE POLICY "Owners and staff manage custom pages" ON public.store_custom_pages FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_custom_pages.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Owner manages own offer" ON public.store_site_offers;
CREATE POLICY "Owners and staff manage offers" ON public.store_site_offers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_site_offers.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Store owners manage their testimonials" ON public.store_testimonials;
CREATE POLICY "Owners and staff manage testimonials" ON public.store_testimonials FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_testimonials.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Store owners view own connection" ON public.store_google_reviews_connections;
DROP POLICY IF EXISTS "Store owners insert own connection" ON public.store_google_reviews_connections;
DROP POLICY IF EXISTS "Store owners update own connection" ON public.store_google_reviews_connections;
DROP POLICY IF EXISTS "Store owners delete own connection" ON public.store_google_reviews_connections;
CREATE POLICY "Owners and staff view connections" ON public.store_google_reviews_connections FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_google_reviews_connections.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
CREATE POLICY "Owners and staff manage connections" ON public.store_google_reviews_connections FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_google_reviews_connections.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "Owners and staff insert own wallet" ON public.ai_credit_wallets;
CREATE POLICY "Owners and staff insert own wallet" ON public.ai_credit_wallets FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ai_credit_wallets.store_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = s.id AND ss.user_id = auth.uid())))
);

-- Redefine allocate_partner_licenses as no-ops to prevent default automatic license key allocations
CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(_partner_id UUID) RETURNS void AS $$ BEGIN RETURN; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(_partner_id UUID, _qty_basic INT, _qty_premium INT) RETURNS void AS $$ BEGIN RETURN; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(_partner_id UUID, _qty_starter INT, _qty_growth INT, _qty_scale INT) RETURNS void AS $$ BEGIN RETURN; END; $$ LANGUAGE plpgsql;
```
