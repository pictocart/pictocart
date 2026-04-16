

# Merchant Email Domain — White-Label Sender Identity

## Problem
Currently all emails go out as `StoreName <onboarding@resend.dev>`. Customers see a generic Resend domain — not the merchant's brand. For a true SaaS, each merchant needs emails from their own domain: `notifications@indilipi.com`.

## Architecture Decision

**Use Resend's multi-domain API** through the existing connector gateway. One platform Resend account manages all merchant domains programmatically. No per-merchant Resend accounts needed.

**Cost**: Resend Free = 100 emails/day (3,000/month). Pro = $20/month for 50,000 emails. The platform pays one subscription — all merchants share the quota. At scale, this is pennies per merchant.

## Technical Plan

### 1. Database: `store_email_domains` table

```text
store_email_domains
├── id (uuid, PK)
├── store_id (uuid, FK → stores, unique)
├── domain (text)                    -- e.g., "indilipi.com"
├── resend_domain_id (text)          -- Resend's domain ID for API calls
├── status (text)                    -- pending | verified | failed
├── dns_records (jsonb)              -- SPF/DKIM/MX records from Resend
├── sender_prefix (text, default 'notifications')
├── verified_at (timestamptz)
├── created_at / updated_at
```

RLS: Store owners can read/update their own domain config.

### 2. New Edge Function: `manage-email-domain`

Handles three actions via the Resend API (through connector gateway):

- **`add`**: Calls `POST /domains` with merchant's domain → stores DNS records and Resend domain ID in DB
- **`verify`**: Calls `POST /domains/{id}/verify` → checks status, updates DB if verified
- **`remove`**: Calls `DELETE /domains/{id}` → cleans up DB

All calls go through `https://connector-gateway.lovable.dev/resend/domains/...` with existing RESEND_API_KEY.

### 3. Onboarding Integration (Step in Domain Settings)

Rather than adding another onboarding step (already 11), integrate into the existing **Domain Settings** page with a new "Email Domain" section:

- Merchant enters domain (or auto-populates from custom domain if already set)
- Click "Set Up Email Domain" → calls edge function → shows DNS records (SPF, DKIM, MX) with copy buttons
- Click "Verify" → checks with Resend API → marks as verified
- Status badges: Pending / Verified / Failed
- Auto-suggest: if merchant already has a custom domain configured, pre-fill it

### 4. Update `send-order-notification`

```text
Before sending:
1. Check store_email_domains for this store
2. If verified domain exists → from: "notifications@merchant-domain.com"
3. If not → fallback: "StoreName <onboarding@resend.dev>"
```

One-line change in the `sendEmail` function — dynamically set the `from` field.

### 5. Dashboard Indicator

Add an email domain status indicator to the seller dashboard or settings sidebar:
- Green badge if domain verified
- Yellow "Set up email domain" prompt if not configured
- Links to Domain Settings page

## What the Merchant Does

1. Goes to Domain Settings
2. Enters their domain (e.g., `indilipi.com`)
3. Sees 3 DNS records to add (SPF, DKIM, MX) — with copy buttons
4. Adds records at their registrar (same flow they already did for custom domain)
5. Clicks "Verify" — done

Total effort: ~5 minutes, same as custom domain setup.

## What the Customer Sees

Emails arrive from: `notifications@indilipi.com` (or whatever prefix the merchant chose) with proper SPF/DKIM authentication — no spam folder issues, full brand trust.

## Files to Create/Modify

**Create:**
- `supabase/functions/manage-email-domain/index.ts` — Resend domain API proxy
- Migration for `store_email_domains` table

**Modify:**
- `src/pages/DomainSettings.tsx` — add Email Domain section with DNS records UI
- `supabase/functions/send-order-notification/index.ts` — dynamic `from` field based on verified domain
- Memory files

## Future: Partner Program Ready

This architecture supports the future partner program because:
- Each merchant's domain is independently managed
- Partners can set up domains for their clients during store creation
- The platform handles all Resend API complexity behind the scenes
- Billing can be tiered: free tier = platform domain, premium = custom email domain

