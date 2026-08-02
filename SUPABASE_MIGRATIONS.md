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
```
