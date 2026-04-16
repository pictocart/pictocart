---
name: White-Label Email Templates
description: Per-store AI-generated branded email templates replacing platform branding in all customer communications
type: feature
---
- `store_email_templates` table stores 5 template types per store as JSONB (order_confirmed, order_shipped, order_delivered, new_order_seller, welcome_customer)
- `generate-email-templates` edge function uses Gemini 2.5 Flash to create branded HTML templates using store name, logo, colors, category
- Templates use placeholders: {{customer_name}}, {{order_number}}, {{items_table}}, {{total}}, {{tracking_number}}, {{store_name}}, {{payment_method}}, {{customer_email}}, {{customer_phone}}
- `send-order-notification` checks `store_email_templates` first, falls back to default hardcoded templates
- Onboarding step 9 "Email Branding" — one-click generation, skippable, with live preview
- Total onboarding steps: 11 (was 10)
- Templates can be regenerated from dashboard
