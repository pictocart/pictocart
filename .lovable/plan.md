
# Service Industry Expansion — Doctors & Salons

Adds two new business modes to Pictocart alongside the existing E-commerce and Food/Cafe modes: **Healthcare** (Doctor / Nursing Home / Clinic) and **Beauty Services** (Salon / Hairdresser / Spa). Both modes share an "Appointments Engine" core and reuse existing Orders, Payments, Billing, Accounts, Wallet, Coupons, Reviews, Notifications and Storefront.

## 1. New Business Modes & Onboarding

Extend `StepCategory` and `store.category` with:

- **healthcare** → sub-types: `solo_doctor`, `clinic`, `nursing_home`, `dental`, `physio`, `diagnostic_lab`, `veterinary`
- **beauty** → sub-types: `solo_stylist`, `salon`, `unisex_salon`, `spa`, `nail_studio`, `barber`, `bridal_studio`

Onboarding additions per mode:
- **Healthcare:** registration no. (MCI/State), specialization, clinic timings, consultation fee, teleconsult yes/no, home-visit yes/no, drug-license (optional), GST/PAN
- **Beauty:** services menu, chair/station count, in-salon vs home visit, gender served, parking

Pica 2 + StorefrontAssistant prompts updated with `isHealthcare` / `isBeauty` branches (mirrors the existing `isFoodService` pattern in `merchant-assistant`).

## 2. Appointments Engine (shared core)

New tables (Lovable Cloud):

- `service_providers` — practitioners/stylists per store. Solo doctor/stylist = 1 row auto-created. Fields: `name, role, photo_url, specialization[], experience_years, languages[], gender, bio, commission_pct, is_active, accepts_home_visit, accepts_teleconsult`.
- `services` — bookable services. Fields: `name, category, duration_min, price, gst_pct, requires_room, max_parallel, allowed_provider_ids[], home_visit_price_addon, image_url`. (e.g. "Haircut ₹300/30min", "GP Consult ₹500/15min", "Bridal Makeup ₹15000/4h").
- `provider_schedules` — weekly recurring availability per provider + per-day overrides + leaves/holidays.
- `appointments` — `id, store_id, customer_id, provider_id, service_id, slot_start, slot_end, mode (in_store|home_visit|teleconsult), status (pending|confirmed|in_progress|completed|cancelled|no_show), address (for home), price, gst, total, payment_status, payment_mode, order_id (links to existing orders), notes_customer, notes_internal, prescription_id, before_after_photos[]`.
- `appointment_resources` — optional rooms/chairs/equipment ledger to prevent double-booking.

Slot generator: edge function `compute-slots` returns free slots for `(store_id, provider_id, service_id, date)` honoring schedule + buffers + existing appointments + holidays + max_parallel.

## 3. Healthcare-specific

- **Patient profile** (extends `customers`): age, gender, blood group, allergies, chronic conditions, height/weight, emergency contact.
- **Visit / EMR** table: SOAP notes, vitals, diagnosis (ICD-10 search), prescription lines (drug, dose, frequency, duration, instructions), lab orders, follow-up date. Print-friendly Rx PDF with clinic letterhead + doctor signature + registration no.
- **Medicine catalog** reuses `products` with `product_type='medicine'` (new in `ProductTypeFields.tsx`): salt/composition, schedule (H/H1/X), batch, expiry, HSN, GST slab, prescription_required.
- **Pharmacy POS**: dispensary screen to bill medicines from Rx in one click; deducts inventory; produces GST bill.
- **Diagnostic add-on**: lab test catalog, sample collection at home, report upload (PDF), patient portal to download.
- **Compliance**: drug license no., DPCO price cap warning, Schedule H Rx-required block, audit log of who edited Rx.

## 4. Beauty-specific

- **Service menu builder** with categories (Hair, Skin, Nails, Bridal, Spa, Grooming) and add-ons (hair wash, head massage).
- **Stylist preference**: customer can pick "Any" or specific stylist; stylist commission auto-calculated on completion.
- **Product usage** during service (shampoo, color) — optional inventory deduction from `products` (`product_type='cosmetic'`).
- **Before/after photos** uploaded to appointment (reused `store-assets` bucket) — opt-in gallery on storefront.
- **Membership packages**: e.g. "10 haircuts for ₹2500" — stored in new `service_packages` + `customer_package_balances` (decrement on each appointment).
- **Bridal/Event quote builder**: multi-service quote → convert to appointment + advance payment.

## 5. Home Visit & Special Requests

Shared across both modes:
- Toggle per provider + per service.
- Service area: pincode allowlist OR radius from a lat/lng (reuses delivery-radius pattern in `useFulfillment`).
- Travel fee: flat / per-km / free above threshold.
- "Special Request" free-text field on booking (e.g. wheelchair access, female stylist only, specific brand) — surfaced prominently in provider dashboard.
- New status `en_route` with optional live ETA share (Phase 2).

## 6. Family Plans (Doctors & Stylists)

New tables:
- `family_groups` — `store_id, head_customer_id, family_name, max_members, plan_id`.
- `family_members` — `group_id, customer_id, relation, dob`.
- `family_plans` — catalog defined by the store: `name, monthly_fee, yearly_fee, max_families OR max_members, included_services[], discount_pct, free_visits_per_year, home_visit_included`.

Provider sets the **cap on how many families** they accept (e.g. "Family Doctor for 50 families", "Family Hairdresser for 20 families"). When cap reached, signup CTA shows "Waitlist". Renewals auto-billed via Razorpay subscription (already integrated).

Storefront badge: "Family Doctor — 12/50 slots left" / "Family Stylist — Accepting".

## 7. Payments, Billing & Accounts

All reuse existing systems:
- **Payments**: Razorpay (deposit/advance/full) + COD/Pay-at-counter + UPI QR. Per-service: `deposit_pct` (e.g. 20% to confirm).
- **Invoicing**: `next_invoice_number` already supports prefixes — add `RX/` for Rx-only, `APT/` for appointments, `MED/` for pharmacy. Single GST-ready invoice.
- **Accounts**: appointment revenue flows into existing P&L. New expense categories: stylist payouts, doctor fee shares. Stylist/doctor commission report auto-generated from completed appointments × `provider.commission_pct`.
- **Khata**: family members on credit ledger; balance carry-forward.
- **Wallet credits**: AI features (auto-Rx suggestions, smart slot recommendations) consume credits like other AI actions.

## 8. Customer Storefront

New page templates rendered by `MasterThemeRenderer` via two new section types:
- `service_menu` — grid/list of services with price, duration, "Book" CTA.
- `provider_team` — doctors/stylists with photo, specialty, rating, "Book with" CTA.
- `appointment_booking` — date picker → slot grid → patient/customer details → payment → confirmation.
- `family_plan_card` — pricing + slots-left meter + signup.

Booking is one-page mobile-first, mirrors the 30-second checkout philosophy. Customer accounts already exist — adds "My Appointments" tab with reschedule/cancel + Rx download.

## 9. Provider/Merchant Dashboard

New routes (lazy-loaded via `DashboardShell`):
- `/appointments` — calendar (day/week) + list + drag-to-reschedule
- `/appointments/:id` — detail, status transitions, Rx/notes, payment, photos
- `/providers` — manage doctors/stylists, schedules, leaves, commissions
- `/services` — service catalog + packages
- `/family-plans` — plans, families, member CRUD, renewals
- `/pharmacy` (healthcare only) — POS + Rx queue
- `/clinic-records` or `/salon-records` — EMR / customer history

Pica 2 snapshot extended with: `today_appointments`, `pending_confirmations`, `unpaid_appointments`, `family_slots_used`, `inventory_expiring_30d` (medicines).

## 10. Notifications

Reuse `customer-notifications` Edge Function. Add templates:
- Appointment confirmed / reminder T-24h / reminder T-2h
- Rescheduled / Cancelled / No-show fee
- Rx ready / Lab report ready
- Family plan renewal due / activated
- Home-visit "On the way"

Channels: Email now; WhatsApp Cloud API hooked in Phase 8 (already on roadmap).

## 11. Reviews

Existing `reviews` table extended with `appointment_id` and `provider_id` so customers rate the specific doctor/stylist. Verified Appointment badge added next to Verified Purchase.

## 12. Database changes summary

New tables: `service_providers, services, provider_schedules, appointments, appointment_resources, family_groups, family_members, family_plans, service_packages, customer_package_balances, visits (EMR), prescriptions, lab_orders`. All with RLS: store-owner full access, provider scoped access via `user_roles` (new roles `provider`, `front_desk`), customer access only to own appointments/Rx.

New role enum values added to `app_role`: `provider`, `front_desk`, `pharmacist`.

## 13. Rollout phases

1. **MVP (Phase A)** — modes, providers, services, schedules, appointments, booking page, payments, notifications, calendar dashboard. Both verticals usable end-to-end in-store.
2. **Phase B** — Home-visit + special requests, family plans, packages, commission reports.
3. **Phase C** — Healthcare EMR/Rx/Pharmacy POS, Beauty before/after gallery + bridal quotes.
4. **Phase D** — Teleconsult (Jitsi/Daily.co), lab integrations, WhatsApp reminders, multi-branch nursing homes.

## 14. Out of scope (explicit)

- ABDM/NDHM integration (mark on roadmap, needs separate compliance)
- Insurance claims (TPA) — Phase E
- Native mobile apps — covered by existing PWA

---

**Next step after approval:** I will execute Phase A: schema migration + onboarding category updates + Appointments Engine UI + booking storefront section. Family plans, EMR, and Pharmacy POS follow as separate approvals so each ships clean.
