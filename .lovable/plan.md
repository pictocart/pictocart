## Why the bug keeps coming back

Auth logs at the time of the user's last signup show Supabase rejecting `/signup` with `actor_id = 530f2120…` — the **existing seller user**. That means the request body still contained the raw `antarikshhindec@gmail.com`, not the tenant alias. The client-side rewrite in `useCustomerAuth.getTenantEmail` only works when `storeSlug` is truthy at call time, and any other path that calls `supabase.auth.signUp` with the raw email (Google OAuth, leftover code, stale bundle on the published build, password reset, etc.) breaks tenancy. We need authority on the server, not in React.

## Plan

### 1. Server-authoritative customer auth (Edge Function)

Create `supabase/functions/customer-auth/index.ts` that owns every customer auth action and is the **only** path the storefront uses. It uses the service-role admin API.

Actions:
- `signup { storeSlug, email, password, fullName, phone? }` — looks up `store_id` by slug, computes deterministic alias `${sha1(email)}@${storeSlug}.customers.pictocart.in`, calls `auth.admin.createUser({ email: alias, password, email_confirm: false, user_metadata: { is_customer: true, store_slug, customer_email: email, full_name } })`, then enqueues the verification email via the existing `auth-email-hook` flow (or sends via `send-transactional-email`). Returns `{ ok }` or `{ error: 'already_registered_for_this_store' }`.
- `signin { storeSlug, email, password }` — computes the same alias, returns the password-grant tokens by calling `/token?grant_type=password` with the alias. Frontend calls `supabase.auth.setSession(tokens)`.
- `request_password_reset { storeSlug, email }` — uses admin API to generate a recovery link for the alias and emails it to the real `customer_email`.

Why this fixes everything:
- The raw gmail address is **never** sent to `auth.users`, so seller accounts can never collide with customer accounts.
- Same `(email, store)` always produces the same alias, so signup/signin work across sessions.
- Different stores produce different aliases, so the same email can register on N stores independently.
- Google OAuth is intentionally **not** routed through this function — see step 2.

### 2. Disable Google OAuth on storefront customer auth

Google sign-in returns the user's real gmail and creates a single global Supabase user — fundamentally incompatible with per-store tenancy. Remove the "Continue with Google" button on `CustomerAuth.tsx` (and the OAuth handler). Email/password + phone OTP only. Add a small note: "Use email & password — Google sign-in is reserved for store owners on pictocart.in."

### 3. Replace client logic in `useCustomerAuth.ts`

- Drop `getTenantEmail`, `clearForeignSession`, and the direct `supabase.auth.signUp/signInWithPassword` calls.
- `signUpWithEmail`, `signInWithEmail`, `requestPasswordReset` become thin wrappers that `supabase.functions.invoke('customer-auth', …)` and call `supabase.auth.setSession` on the returned tokens for sign-in.
- Keep `setScopedUser` / `isStoreCustomer` so the page only treats the session as logged-in when metadata matches the current store.

### 4. Migration: lock tenancy at the DB layer

New migration:
- Add `CHECK` (via trigger, not constraint) on `auth.users` insert: if `raw_user_meta_data->>'is_customer' = 'true'`, the row's `email` MUST match `…@<store_slug>.customers.pictocart.in` and `store_slug` metadata must be present. Sellers who somehow flip the flag client-side cannot bypass it.
- Backfill: any existing `auth.users` row where `email` is a `…customers.pictocart.in` alias but no `customers` row exists → re-create the missing `customers` row from metadata (heals the two orphans noted last loop).

### 5. Throwaway test storefront

Create a published store via migration so the user can verify same-email-across-tenants without standing up DNS:
- `slug = 'qa-test-store'`, `name = 'QA Test Store'`, `is_published = true`, `user_id` = the user's seller user_id, default theme, no products needed for auth tests.
- Reachable at `https://store-on-tips.lovable.app/store/qa-test-store/account/auth`.
- A second one `slug = 'qa-test-store-2'` for the cross-tenant test.

### 6. End-to-end verification (executed automatically with the browser tool)

After deploy:

```
T1  Sign up email=qa1@example.com on /store/indilipi/account/auth         → expect ok
T2  Sign up SAME email on /store/qa-test-store/account/auth                → expect ok (separate user)
T3  Sign in T1 credentials on /store/qa-test-store/account/auth            → expect FAIL (different store)
T4  Sign in T1 credentials on /store/indilipi/account/auth                 → expect ok
T5  Sign up antarikshhindec@gmail.com on indilipi (the seller's email)     → expect ok
T6  /admin/users — antarikshhindec stays Seller only, NOT customer         → expect ok
T7  /customers (Indilipi dashboard) — antarikshhindec appears as customer  → expect ok
T8  Sign in to pictocart.in seller dashboard with same Google account      → expect ok, no interference
T9  Sign up qa1@example.com again on indilipi                              → expect "already registered for this store"
```

Each result reported back to the user. If any test fails, fix and re-run before declaring done.

### 7. Memory updates

Update `mem://features/customer-accounts` to record: customer auth lives in the `customer-auth` edge function with deterministic per-store email aliasing; storefronts must never call `supabase.auth.signUp` directly; Google OAuth is disabled on storefronts.

### Files

- New: `supabase/functions/customer-auth/index.ts`
- New: SQL migration (tenancy guard trigger + backfill + 2 test stores)
- Edit: `src/hooks/useCustomerAuth.ts` (use edge function, drop client aliasing)
- Edit: `src/pages/storefront/CustomerAuth.tsx` (remove Google button, wire reset, keep UI)
- Edit: `mem://features/customer-accounts`
