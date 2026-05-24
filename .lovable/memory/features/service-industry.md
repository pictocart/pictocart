---
name: Service Industry (Doctors & Salons)
description: Appointments engine, providers/staff, services, and family plans for healthcare and beauty service stores
type: feature
---

## Business modes
- `store.category = 'healthcare'` → solo doctor / clinic / nursing home / dental / physio / lab / vet
- `store.category = 'beauty_services'` → solo stylist / salon / spa / nail / barber / bridal

Use `useIsServiceStore()` / `useIsHealthcareStore()` from `@/hooks/useServiceIndustry` to branch UI. Sidebar "Bookings" group only renders when category is service.

## Tables (all RLS-protected, store-owner full access)
- `service_providers` — doctors/stylists; `max_families_cap` is the cap shown on storefront as "X families slots left".
- `services` — bookable items with `duration_min`, `price`, `deposit_pct`, `home_visit_addon`, `teleconsult_enabled`.
- `provider_schedules` — weekday + start/end + override_date for leaves.
- `appointments` — core booking. Statuses: pending → confirmed → en_route → in_progress → completed (or cancelled / no_show). Modes: in_store / home_visit / teleconsult. Carries `special_request` text.
- `family_plans`, `family_groups`, `family_members` — recurring family healthcare/salon plans with per-plan family cap.

## Edge function
`compute-slots` (public, no JWT) returns free slot windows for `(store_id, provider_id, service_id, date)` honoring schedule + buffer + existing non-cancelled appointments + `max_parallel`.

## Phase A shipped
- Schema, RLS, new roles (`provider`, `front_desk`, `pharmacist`)
- Onboarding categories: Doctor/Clinic + Salon/Stylist
- Dashboard routes: `/appointments`, `/services`, `/providers`, `/family-plans`
- Sidebar Bookings group gated by category
- Slot-computation edge function

## Phase B+ (not yet built)
- Storefront booking page (`booking_page` section in MasterThemeRenderer)
- Home-visit pincode/radius + travel fee on booking
- EMR / Rx / Pharmacy POS for healthcare
- Before/after gallery + bridal quotes for beauty
- WhatsApp + email reminders T-24h / T-2h via `customer-notifications`
- Pica 2 prompt branches for `isHealthcare` / `isBeauty`
- Razorpay subscription billing for family plans
