# Phase B — Storefront Booking, Home Visit, Family Plans & Commissions

Builds on the Phase A appointment engine to make service stores fully bookable by customers and add monetisation (family plans, packages, stylist/doctor payouts).

## 1. Storefront booking flow

New section types in `MasterThemeRenderer`:
- `service_menu` — grid of services (image, name, duration, price, "Book" CTA).
- `provider_team` — provider cards (photo, specialty, rating, languages, "Book with" CTA).
- `appointment_booking` — embedded booking widget (also reachable at `/book` on the storefront).
- `family_plan_card` — plan pricing + "X/Y families left" meter + signup CTA.

New storefront page: `src/pages/storefront/StorefrontBooking.tsx`
- Step 1: pick service → Step 2: pick provider (or "Any") → Step 3: date + slot grid (calls `compute-slots`) → Step 4: customer details + special request + mode (in-store / home visit / teleconsult) → Step 5: payment (Razorpay deposit / pay-at-counter) → confirmation.
- Mobile-first, 30-second flow, reuses existing checkout primitives and customer auth.
- Adds "My Appointments" tab inside `CustomerAccount` with reschedule / cancel actions.

## 2. Home visit & special requests

Schema additions (migration):
- `services.home_visit_enabled`, `home_visit_addon` (already there), `home_visit_max_km`.
- `service_providers.home_visit_pincodes text[]`, `home_visit_radius_km`, `home_base_lat`, `home_base_lng`.
- `appointments.address_json jsonb`, `travel_fee numeric`, `special_request text`, `en_route_at timestamptz`.

Logic:
- Booking widget shows Home Visit toggle only when both service and provider allow it.
- Pincode check reuses pattern from `useFulfillment` (allowlist) or radius from base coords.
- `en_route` status transition surfaces a "Notify customer on the way" button in `/appointments/:id`.

## 3. Family plans signup & enforcement

- Public plan listing on storefront via `family_plan_card` section.
- Customer signup form: head + members + relations → creates `family_groups` + `family_members` rows.
- Razorpay subscription (monthly/yearly) reuses existing `subscription-billing` edge function pattern; new edge function `family-plan-subscribe` creates the Razorpay plan/subscription and persists `family_groups.razorpay_subscription_id`, `status`, `current_period_end`.
- DB function `family_plan_slots_left(plan_id)` powers the live "X/Y families left" badge and blocks signup with "Join waitlist" when full.
- Discount auto-applies at booking when customer belongs to an active family group on a plan that includes the chosen service.

## 4. Service packages (beauty + healthcare)

New tables:
- `service_packages` — name, included_services[], total_visits, price, validity_days.
- `customer_package_balances` — customer_id, package_id, visits_left, expires_at.

Booking flow auto-detects a usable package and offers "Use 1 of 10 haircuts" instead of charging.

## 5. Commission & payout reports

- `service_providers.commission_pct` already exists; on appointment `completed` a trigger writes a row to new `provider_commissions` table (provider_id, appointment_id, base, pct, amount, payout_status).
- New dashboard page `/providers/payouts` — provider × month grid, mark paid, export CSV.
- Flows into existing Accounts (`Expenses`) as a new category `provider_payout`.

## 6. Notifications

Extend `customer-notifications` edge function templates:
- `appointment_confirmed`, `appointment_reminder_24h`, `appointment_reminder_2h`
- `appointment_rescheduled`, `appointment_cancelled`
- `home_visit_en_route`
- `family_plan_activated`, `family_plan_renewal_due`

Cron (`pg_cron`) hourly job enqueues T-24h and T-2h reminders. Email channel only this phase; WhatsApp deferred to Phase D.

## 7. Pica 2 + StorefrontAssistant

- Add `isHealthcare` / `isBeauty` branches to merchant-assistant and storefront-assistant prompts.
- Snapshot extended with `today_appointments`, `pending_confirmations`, `unpaid_appointments`, `family_slots_used`.

## 8. Reviews

- Extend `reviews` table with nullable `appointment_id` and `provider_id`.
- Post-completion email includes review link; "Verified Appointment" badge next to existing "Verified Purchase".

## Out of scope (Phase C+)
- EMR / Rx / Pharmacy POS, before/after gallery, bridal quote builder
- Teleconsult video, lab integrations, WhatsApp reminders, multi-branch

## Files touched (summary)

**New**
- `src/pages/storefront/StorefrontBooking.tsx`
- `src/components/storefront/booking/{ServicePicker,ProviderPicker,SlotGrid,BookingSummary,FamilyPlanSignup}.tsx`
- `src/pages/ProviderPayouts.tsx`
- `src/hooks/useBookingFlow.ts`, `useFamilyPlanSignup.ts`, `useProviderPayouts.ts`
- `supabase/functions/family-plan-subscribe/index.ts`
- `supabase/functions/appointment-reminders/index.ts` (cron-driven)
- `supabase/migrations/...` (schema additions §2–§5 + reviews link + trigger)

**Edited**
- `src/components/theme/MasterThemeRenderer.tsx` (new section types)
- `src/pages/Appointments.tsx` (`en_route` action, reschedule)
- `src/pages/FamilyPlans.tsx` (publish toggle, slots meter)
- `src/pages/storefront/CustomerAccount.tsx` (My Appointments tab)
- `supabase/functions/{merchant-assistant,storefront-assistant,customer-notifications}/index.ts`

Approve to ship Phase B in one pass; EMR / Pharmacy / before-after gallery will be Phase C.
