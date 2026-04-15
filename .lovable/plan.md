# Market-Ready Product Audit & Phased Execution Plan

## Problem Summary

Two critical issues identified, plus a broader gap analysis for market readiness:

1. **Admin can't see signups**: The `profiles` table RLS only allows users to view their own profile. AdminUsers page queries all profiles but gets zero results (except the admin's own). Needs an admin SELECT policy.
2. **Onboarding creates a store but doesn't produce a ready website**: Current flow is Store Name → Category → Upload Image → AI Generate → Preview → Payments → Go Live. But it skips theme/design selection, logo upload, store description, and the "preview" is just a static mockup — not the actual storefront. The seller lands on the dashboard with a bare-bones store.
3. **Multiple features exist but are disconnected from the initial setup**: Logo uploader, theme marketplace, homepage builder, store description, SEO settings, shipping — all require the seller to discover them post-onboarding.

---

## Phase 1: Fix Admin Visibility (Immediate)

**Migration**: Add RLS policy so admins can read all profiles:

```sql
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));
```

**Files**: Single migration only. AdminUsers.tsx already queries profiles correctly — it just gets blocked by RLS.

---

## Phase 2: Redesigned Onboarding Flow (Core)

Replace the current 7-step wizard with a comprehensive **10-step** flow that produces a fully functional, live-ready website by the time the seller hits the dashboard.

### New Step Sequence


| Step | Name                     | What It Does                                                                              | Required?          |
| ---- | ------------------------ | ----------------------------------------------------------------------------------------- | ------------------ |
| 1    | **Store Name & URL**     | Name, slug, description (1-2 lines)                                                       | Yes                |
| 2    | **Category**             | Business category selection (existing)                                                    | Yes                |
| 3    | **Logo Upload**          | Reuse existing LogoUploader with 1:1 crop                                                 | Skip OK            |
| 4    | **Choose Theme**         | Pick from free ThemeTemplates + show premium packs. Auto-applies category-matched default | Yes (auto-default) |
| 5    | **Upload First Product** | Image upload (existing)                                                                   | Skip OK            |
| 6    | **AI Product Magic**     | AI generates title/price/description (existing)                                           | Skip OK            |
| 7    | **Store Info**           | Phone number, city, GST (optional) — for legal/compliance                                 | Skip OK            |
| 8    | **Payment Setup**        | COD / UPI / Razorpay (existing)                                                           | Yes (COD default)  |
| 9    | **Store Preview**        | Live iframe preview of the actual storefront (`/store/{slug}`) instead of static mockup   | View only          |
| 10   | **Go Live**              | Publish + confetti (existing)                                                             | Yes                |


### Key Improvements Over Current Flow

- **Logo in onboarding**: Currently only available deep in Store Design settings
- **Theme selection during setup**: Seller sees their store will look professional from day one
- **Store description + contact info**: Fills out legal/compliance data that's currently empty
- **Live preview**: Replace the static card mockup with an actual iframe of `/store/{slug}` — the seller sees exactly what customers will see
- **Profile creation verified**: The `handle_new_user` trigger already creates profiles, but we'll add a safety check in onboarding to ensure the profile exists

### Files to Create/Edit


| File                                             | Action                                              |
| ------------------------------------------------ | --------------------------------------------------- |
| `src/pages/Onboarding.tsx`                       | Rewrite — 10 steps, new data model                  |
| `src/components/onboarding/StepStoreName.tsx`    | Edit — add description field                        |
| `src/components/onboarding/StepLogo.tsx`         | **New** — wraps existing LogoUploader               |
| `src/components/onboarding/StepTheme.tsx`        | **New** — theme picker grid with live color preview |
| `src/components/onboarding/StepStoreInfo.tsx`    | **New** — phone, city, GST optional                 |
| `src/components/onboarding/StepStorePreview.tsx` | Rewrite — iframe of live store                      |
| `src/components/onboarding/StepCategory.tsx`     | Minor polish                                        |
| `src/components/onboarding/StepUploadImage.tsx`  | No change                                           |
| `src/components/onboarding/StepAIGenerate.tsx`   | No change                                           |
| `src/components/onboarding/StepPaymentSetup.tsx` | No change                                           |
| `src/components/onboarding/StepGoLive.tsx`       | Minor — update step count reference                 |
| `src/pages/Dashboard.tsx`                        | Update onboarding_step check from 7 to 10           |


---

## Phase 3: Post-Onboarding Guided Checklist (Dashboard)

After onboarding, show a "Store Completion" checklist card on the Dashboard that tracks what's been done vs. what's pending:

- ✅ Store name set
- ✅ Category selected
- ⬜ Add more products (link to /products/new)
- ⬜ Set up shipping (link to /shipping)
- ⬜ Connect custom domain (link to /domain)
- ⬜ Configure SEO (link to /seo)
- ⬜ Write your first blog post (link to /blog)

This ensures all existing features get discovered and used. Show the completion percentage of the store to the merchant. 

**File**: `src/pages/Dashboard.tsx` — add completion checklist card

---

## Phase 4: Auth Flow Polish

- **Auto sign-in after signup**: Currently shows "Check your email" after signup. If email auto-confirm is OFF, this is correct. But the redirect loop (signup → verify → sign in → onboarding) should be smooth.
- **Ensure profile exists on first dashboard load**: Add a safety upsert in Dashboard/Onboarding if profile query returns null (edge case where trigger failed).

**Files**: `src/pages/Auth.tsx`, `src/pages/Onboarding.tsx`

---

## Execution Order

1. **Phase 1** — Admin RLS fix (1 migration, immediate)
2. **Phase 2** — New onboarding flow (8 files, core deliverable)
3. **Phase 3** — Dashboard checklist (1 file)
4. **Phase 4** — Auth polish (2 files)

Each phase is independent and deployable. Phase 2 is the largest piece of work.