---
name: White-Label Email Sender Identity
description: Merchant email domain management via Resend API for branded sender addresses (notifications@merchant.com)
type: feature
---
- `store_email_domains` table stores per-store email domain config: domain, resend_domain_id, status, dns_records (JSONB), sender_prefix
- `manage-email-domain` edge function proxies Resend domain API (add/verify/remove) through connector gateway
- `send-order-notification` checks `store_email_domains` for verified domain → uses `prefix@domain` as sender, else falls back to `onboarding@resend.dev`
- DomainSettings page has "Email Sender Identity" section below custom domain setup
- DNS records (SPF, DKIM, MX) shown with copy buttons after domain registration
- One Resend platform account manages all merchant domains programmatically
- Cost: shared Resend quota, ~$20/month for 50K emails across all merchants
