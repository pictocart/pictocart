# AI Credits Wallet & Smart Recharge — v2 (Admin-Controlled Economy)

A merchant-friendly AI Credits wallet — like Lovable's own — wired into every AI feature, recharged via Razorpay. **Every price, margin, bonus, and promo is editable by admin** without code changes. Plus a transparent savings dashboard and smart cache that quietly reduces our spend.

---

## 1. Razorpay model — Hybrid (recommended)

**4 fixed packages (default) + "Custom amount" option (min ₹99).**

| Approach | Pros | Cons |
|---|---|---|
| **Fixed packages only** | Clear value tiers, easy bonus messaging, higher avg recharge, predictable margins | Less flexibility for cautious first-timers |
| **Open recharge only** | Zero friction, pay-what-you-want | No anchoring, low avg ticket, hard to give bonus, messy invoicing |
| **Hybrid (recommended)** | Anchors users via bonus credits, still allows ₹99 trial top-up, best conversion | Slightly more UI work |

**Seed packs (admin can edit/add/remove anytime):**
- **Starter** ₹99 → 1,000 credits
- **Growth** ₹499 → 5,500 credits *(10% bonus, "Most Popular")*
- **Pro** ₹1,499 → 18,000 credits *(20% bonus)*
- **Scale** ₹4,999 → 65,000 credits *(30% bonus)*
- **Custom** ₹99–₹50,000 → conversion rate set by admin

Razorpay setup: reuse existing **Orders API** pattern (`create-razorpay-order` / `verify-razorpay-payment`). Use **platform** `RAZORPAY_KEY_ID/SECRET` (already in secrets) since this is platform revenue, not seller revenue. No subscription plans needed — one-time top-ups.

---

## 2. Admin Economy Console (the control panel you asked for)

New page **`/admin/credits-economy`** (admin-only) — single source of truth for the entire credit economy. Zero-code adjustments.

### 2a. Token margin & base pricing
- **Base credit cost (₹/credit)** — what 1 credit costs us in AI gateway fees (e.g. ₹0.03)
- **Margin multiplier** — global markup (e.g. 3.0×) → sell price = base × margin
- **Custom-recharge rate** — credits per ₹1 for the open recharge slider
- Live preview: "At 3× margin, ₹100 = X credits, gross margin Y%"

### 2b. Per-action pricing (table editor)
For every AI action (product, blog, blog-image, theme-pack, section, email, assistant, engagement-report):
- **Credits charged** (full)
- **Credits on cache hit** (default 1)
- **Manual cost ₹** (what a freelancer would charge — drives "you saved ₹X")
- **Manual minutes** (drives "you saved Y minutes")
- **Model** dropdown (gemini-2.5-flash / pro / flash-image / etc.)
- **Active toggle**
Bulk "Apply margin recalculation" button re-derives all credit prices from the new margin in one click.

### 2c. Packages (CRUD)
Add/edit/remove any pack: name, price ₹, credits, bonus %, badge ("Most Popular"/"Best Value"), sort order, active toggle. Disable a pack without deleting.

### 2d. Promotions & coupons
A `credit_promos` table the admin manages:
- **Promo code** (e.g. `LAUNCH50`) → +X% bonus credits or flat +N credits on next recharge
- **Site-wide flash sale**: "+25% on all packs until Sun" — auto-applied, shown as a strike-through banner on the recharge sheet
- **First-recharge bonus**: configurable % extra on a merchant's first ever top-up
- **Tier-based loyalty**: after lifetime spend ≥ ₹X, all future recharges get +Y% credits forever
- **Referral pairs**: configurable bonus for both parties when referee makes first recharge
- Each promo: max uses, valid window, eligible packs, min recharge amount, active toggle

### 2e. Free credits & grants
- **Welcome grant** (₹ value, configurable; default 500 credits on first store publish)
- **Onboarding milestone grants**: bonus credits for completing profile, adding 5 products, publishing first blog, etc. Each milestone editable.
- **Manual grant tool**: admin search merchant → grant N credits with reason → logged in audit trail. Useful for support refunds.

### 2f. Low-balance & auto-recharge thresholds
Admin sets the global thresholds (200/50/0 by default). Merchant can override on their own wallet page within admin-set min/max.

### 2g. Live economy dashboard
At the top of the page:
- Total credits issued / consumed / outstanding
- 30d gateway cost vs 30d revenue → **realized margin %**
- Cache hit-rate % (the lever that actually reduces our cost)
- Top 10 spenders, top 10 actions by cost
- Promo redemption funnel

Everything here writes to a single `platform_settings` JSON row + dedicated tables; no edge function or hardcoded number ever stores a price.

---

## 3. Credit pricing per AI action (defaults — admin-editable)

| Action | Model | Credits | Cache hit | Replaces |
|---|---|---|---|---|
| Product description from image | gemini-2.5-flash | 8 | 1 | 15 min copywriting (~₹150) |
| Blog post (full) | gemini-2.5-pro | 60 | 5 | 2 hrs writer (~₹1,200) |
| Blog cover + thumbnail | gemini-3-flash-image | 40 (20 each) | 2 | ₹500 designer |
| Storefront assistant reply | gemini-3-flash | 2 | 0 (free) | 3 min support |
| Theme pack generation | gemini-2.5-pro | 250 | 25 | ₹5,000 designer |
| Section content | gemini-2.5-flash | 5 | 1 | 10 min |
| Email template set | gemini-2.5-flash | 30 | 3 | 1 hr |
| Engagement report | gemini-2.5-flash | 15 | 2 | — |

---

## 4. Smart Cache — the cost-saver that "trains" us

`ai_response_cache` keyed by `sha256(action + normalized_input)`:
- **Product gen**: image bytes hash + category → variant photos reuse instantly.
- **Section content**: (section_type + store_category + tone) → 80%+ reuse across stores.
- **Storefront assistant**: (store_id + normalized_question) with 24h TTL → repeat FAQs free.
- **Blog images**: (title + style brief) → identical retries free.

**On hit:** charge cache-hit price (admin-set, default 1 credit), toast *"♻ Reused — saved X credits"*. Reduces our gateway spend AND delights merchants.
Cache rows reused 3+ times get promoted to a **shared library** (admin-curated) — real usage becomes our training corpus.

---

## 5. Savings & Transparency dashboard (`/wallet`)

Compact widget on `/dashboard`, full page at `/wallet`:

- **Big number 1: ₹X saved this month** = Σ (manual_cost − credit_cost_in_inr)
- **Big number 2: Y hours saved** = Σ manual_minutes
- **Big number 3: Z credits balance** + progress bar to next "low" threshold
- **Sparkline**: daily credit burn (30d)
- **Top 3 actions** with cost and saving per action
- **"You'd have paid a freelancer ₹N"** comparison card (Indian rates, admin-configurable)
- Full **ledger**: every debit/credit, action label, savings, Razorpay payment ID, downloadable GST invoice
- **Pre-action confirmation modal** everywhere: *"This will use 8 credits (~₹0.80). A copywriter would charge ~₹150 and take 15 min. Continue?"* — with "don't ask again" toggle per action.

---

## 6. Low-balance notifications (multi-channel, non-spammy)

One-shot per threshold, reset on recharge:
- **< 200**: yellow banner in dashboard + toast on next AI use
- **< 50**: red banner + email via existing `send-transactional-email`
- **0**: AI buttons disabled, inline "Recharge to continue" CTA opening Razorpay sheet
- **Auto-recharge (opt-in)**: re-bills last pack via Razorpay token when balance < threshold. Off by default, clearly disclosed.

---

## 7. Promotion ideas (subtle, layered, all admin-toggleable)

You asked for more — here's the full menu, each one a feature flag in the admin console:

1. **Welcome grant** — 500 free credits on first publish.
2. **Inline savings chip** — *"♻ Save 15 min · 8 credits"* next to every AI button.
3. **Monthly "AI Impact" email** — *"You saved ₹4,200 and 18 hours in October."* Shareable image card → organic referral.
4. **Referral program** — refer a merchant, both get N credits on referee's first recharge.
5. **Streak nudge** — used AI 5 days in a row → bonus credits + lightweight badge.
6. **Flash sale banner** — admin schedules "+25% on all packs this weekend"; banner auto-appears on `/wallet`.
7. **First-recharge bonus** — extra % on the very first top-up only.
8. **Loyalty tier** — lifetime spend tiers (Bronze/Silver/Gold) unlock permanent bonus % on all future recharges.
9. **"Unlock more" empty states** — out of credits → contextual modal showing 1-line value prop + recharge CTA.
10. **Onboarding milestones** — small grants for completing profile, adding products, publishing blog, going live.
11. **Birthday/anniversary credits** — auto-grant on store anniversary; emotional retention play.
12. **Bulk-action discount** — generate 10+ products in one session → 10% off the batch.
13. **Festival packs** — admin creates time-boxed "Diwali Pack: ₹999 → 12,000 credits" without touching standard packs.
14. **"Saved you ₹X" weekly toast** — every Monday show last week's savings number.
15. **Public leaderboard (opt-in)** — top merchants by AI usage, with consent. Social proof + competitive nudge.
16. **Estimated savings on landing page** — *"PictoCart merchants saved ₹12L+ on copywriting last month"* — auto-aggregated from real ledger data.
17. **Invoice with savings line** — every GST invoice shows "Estimated savings vs hiring help: ₹X" — accountant-friendly proof.
18. **AI Coach widget** — when merchant has unused credits >7d, gentle nudge: *"You have 2,400 credits — try generating a blog post (60 credits) to drive traffic."*
19. **Pause-mode credit** — if a merchant hasn't logged in 30d, send win-back email with bonus credits.
20. **Studio mode** — opt-in: every AI generation is 50% off but goes to a "drafts" queue first (encourages volume, lowers our peak load).

Rule of thumb: **only 1 promotional surface visible at a time** (one banner, one toast, one chip). Admin priority order is configurable so it never feels spammy.

---

## 8. Database changes

```sql
-- Wallet (1 row per store)
ai_credit_wallets (store_id PK, balance int, lifetime_purchased int, lifetime_used int,
                   lifetime_saved_inr numeric, lifetime_saved_minutes int,
                   low_balance_notified_at, auto_recharge_enabled bool,
                   auto_recharge_pack_id, loyalty_tier text, updated_at)

-- Every debit & credit
ai_credit_transactions (id, store_id, type enum[debit|credit|bonus|refund|grant],
                        action_key text, credits int, inr_value numeric,
                        manual_cost_inr numeric, manual_minutes int,
                        razorpay_order_id, razorpay_payment_id, cache_hit bool,
                        promo_code text, granted_by_admin uuid,
                        metadata jsonb, created_at)

-- Admin-editable price book
ai_action_costs (action_key PK, label, credits int, cache_hit_credits int,
                 manual_cost_inr numeric, manual_minutes int, model text,
                 is_active bool, updated_at)

-- Razorpay packs (admin CRUD)
ai_credit_packs (id PK, name, price_inr int, credits int, bonus_pct int,
                 badge text, is_popular bool, sort_order, is_active,
                 valid_from, valid_until)

-- Promo codes & site-wide promos
credit_promos (id PK, code text unique nullable, type enum[code|sitewide|first_recharge|loyalty|referral],
               bonus_pct int, bonus_flat_credits int, max_uses int, used_count int,
               min_recharge_inr int, eligible_pack_ids uuid[],
               valid_from, valid_until, is_active, metadata jsonb)

credit_promo_redemptions (id, promo_id, store_id, transaction_id, redeemed_at)

-- Onboarding milestone grants config
credit_milestones (key PK, label, credits int, is_active)

-- Smart cache
ai_response_cache (key text PK, action_key, response jsonb, hits int,
                   created_at, expires_at)

-- Global economy settings (single JSON row)
platform_credit_settings (id=1 PK, base_cost_per_credit_inr numeric,
                          margin_multiplier numeric, custom_recharge_rate numeric,
                          low_balance_thresholds int[], welcome_grant_credits int,
                          updated_at, updated_by)
```

All tables RLS: store owners read their own wallet/txns; admins manage everything. A `consume_credits(_store_id, _action_key, _cache_hit)` SECURITY DEFINER RPC atomically debits, ledgers, and returns the new balance — single source of truth used by every edge function.

---

## 9. Edge function changes

- **New** `wallet-create-recharge` — accepts pack_id (or custom amount + promo_code), validates promo, creates Razorpay Order, returns checkout payload.
- **New** `wallet-verify-recharge` — HMAC verify (same as existing payment verify), credit wallet (with bonus + promo + first-recharge + loyalty), insert txn + redemption.
- **New** `wallet-grant-credits` — admin-only, manual grant with reason.
- **New** `wallet-low-balance-cron` — daily; sends emails at thresholds.
- **Modify all generate-*** + `storefront-assistant`:
  1. Read `ai_action_costs` for the action.
  2. Compute cache key → check `ai_response_cache`.
  3. Call `consume_credits` RPC; on insufficient balance return `402 { error: 'INSUFFICIENT_CREDITS' }`.
  4. On miss: call AI, store cache row, return result + savings metadata.

Frontend: a small `useAICredits()` hook wraps every AI invocation — shows pre-confirm modal, handles 402 by opening recharge sheet, toasts savings on success.

---

## 10. UI surfaces (new files)

- `src/pages/Wallet.tsx` — balance, savings, ledger, recharge button
- `src/components/wallet/RechargeSheet.tsx` — pack picker + custom amount + promo code field + Razorpay checkout
- `src/components/wallet/CreditBadge.tsx` — header chip showing balance, links to wallet
- `src/components/wallet/AIActionConfirm.tsx` — reusable pre-action modal
- `src/components/dashboard/SavingsWidget.tsx` — compact stat card
- `src/hooks/useWallet.ts`, `src/hooks/useAICredits.ts`
- **Admin:** `src/pages/admin/AdminCreditsEconomy.tsx` — full economy console (sections 2a–2g above), 5 tabs: **Pricing & Margin**, **Packages**, **Promotions**, **Grants & Milestones**, **Economy Insights**.

---

## 11. Rollout order

1. DB schema + seed packs/costs/settings + RPCs + admin console (no merchant-facing changes yet).
2. Wallet page + recharge flow (Razorpay) + credit badge in dashboard header. Merchants can recharge before any gating.
3. Wrap `generate-product` first (most-used) with credit gate + cache + savings tracking. Validate UX.
4. Roll out to remaining 6 AI functions.
5. Notifications cron + welcome grant + first-recharge bonus.
6. Layer in promos (referral, loyalty, monthly impact email) one at a time, A/B'd.

Step 1 ships nothing visible to merchants — admin can configure the entire economy first. Step 2 unlocks recharge. Steps 3+ enable gating gradually so no one is surprised.

---

**Want me to proceed with steps 1–2 first?** That delivers: full schema + admin economy console + wallet page + Razorpay recharge — without yet enforcing credits on any AI action. You can configure pricing live, watch test recharges land, then we gate the AI features in step 3.
