
-- Replace help center with fresh articles aligned with current platform flows
DELETE FROM public.help_articles;

INSERT INTO public.help_articles (slug, title, category, sort, is_published, body_md) VALUES
('getting-started', 'Getting started in 5 minutes', 'basics', 1, true,
'## Launch your store in 5 minutes

1. **Sign up** with email or Google.
2. Complete the **7-step onboarding wizard**: store name, category, logo, product photo (AI generates details), theme, payment setup, go live.
3. Your store is live at `your-slug.pictocart.in` instantly — no waiting.

Need help? Tap the floating help button or WhatsApp us at **+91 98101 89606**.'),

('onboarding-wizard', 'Understanding the onboarding wizard', 'basics', 2, true,
'The wizard is mandatory and unlocks your dashboard only after completion.

- **Store name & category** — defines your storefront URL and default sections.
- **Logo upload** — square 1:1 crop, kept at original filename.
- **AI product** — upload one photo, our AI writes title, description, price suggestion, and tags. Saved only when you finish the wizard.
- **Theme** — pick a free starter or browse premium themes.
- **Payment setup** — add Razorpay keys or enable COD.
- **Go live** — confirm and your store is published.'),

('themes-and-design', 'Themes, store design & customisation', 'design', 3, true,
'### Free vs Premium themes
- Free starter themes ship with every account.
- **Premium themes (₹500)** are AI-generated 5-page designs with custom fonts, gradients, and section layouts.

### Customising your store
Go to **Store Design** to:
- Drag-and-drop sections (banner slider, USP strip, featured products, blog strip).
- Swap fonts (any Google Font), colors, spacing and animations.
- Override the theme template at any time — your changes persist as JSONB overrides.

### Logo & branding
Update your logo from **Store Design → Header**. Crops to 1:1 with `react-easy-crop`.'),

('payments-razorpay', 'Accept payments with Razorpay', 'payments', 4, true,
'### Setup
1. Sign up at razorpay.com and complete KYC using **your storefront domain** (e.g. `https://yourstore.pictocart.in` or your connected custom domain).
2. Copy your **Key ID** and **Key Secret** from the Razorpay dashboard.
3. Paste them into **Dashboard → Payment Settings**.
4. Payments flow **directly to your bank account** — PicToCart never holds your money.

### Verification
Every payment is verified server-side with HMAC-SHA256 before the order is marked paid.

### Platform fee
A 2% platform commission applies on each successful order.'),

('cod-setup', 'Enable Cash on Delivery (COD)', 'payments', 5, true,
'1. Go to **Dashboard → COD Settings**.
2. Toggle COD on and set:
   - Minimum order value
   - Maximum order value
   - Per-pincode availability (uses Delhivery serviceability)
3. Customers see COD as a checkout option automatically.

You can disable COD anytime — existing COD orders stay valid.'),

('shipping-delhivery', 'Shipping with Delhivery', 'shipping', 6, true,
'### Pincode serviceability
The `PincodeChecker` on product pages calls our Delhivery proxy to confirm delivery availability and ETA.

### Creating shipments
From **Orders → Order Detail → Ship**:
1. Confirm package weight & dimensions.
2. Generate AWB — the label PDF downloads immediately.
3. Tracking updates flow into the order timeline.

### Charges
Shipping cost is deducted from your wallet at AWB generation. Recharge from **Wallet**.'),

('custom-domains', 'Connect your custom domain', 'domains', 7, true,
'1. In **Dashboard → Domain Settings** add your domain (e.g. `mystore.com`).
2. At your DNS provider, add:
   - **A record** → `185.158.133.1`
   - **TXT record** (verification token shown in dashboard)
3. Click **Verify**. Status moves to **Active** once propagation completes (usually 5–30 minutes).
4. **Important:** if using Razorpay, complete KYC with this same domain so checkout origin matches.'),

('ai-credits', 'AI credits & wallet', 'billing', 8, true,
'AI features (product descriptions, theme generation, store assistant, engagement reports) use credits.

- Onboarding includes free credits to get started.
- Recharge from **Wallet → Recharge** in any denomination.
- Each AI call shows its credit cost before running.
- Credit balance is shown in the top bar via `CreditBadge`.'),

('subscription-plans', 'Subscription plans (Starter, Growth, Pro)', 'billing', 9, true,
'- **Starter** — free forever, 1 store, basic features.
- **Growth (₹999/mo)** — premium themes, custom domain, blog, advanced analytics, AI engagement report.
- **Pro** — everything in Growth plus priority support, white-label emails, unlimited products.

Upgrade from **Billing**. Change plan anytime — pro-rated.'),

('blog-system', 'Run a blog on your store', 'design', 10, true,
'Available on Growth and Pro plans.

1. Open **Dashboard → Blog Posts → New Post**.
2. Use the **AI assist** button to draft titles, intros, or full posts from a prompt.
3. Add SEO title, meta description and cover image.
4. Publish — the post appears on `/store/your-slug/blog` and in the BlogStrip section.

Manage email subscribers from **Subscribers**.'),

('customer-accounts', 'Customer accounts on your storefront', 'customers', 11, true,
'Your shoppers get a dedicated account on **your** storefront (not PicToCart''s).

- Sign up & login at `/store/your-slug/account`.
- Multiple saved addresses with CRUD.
- Order history with live shipping status.
- Wishlist (saved across sessions).
- Reviews & ratings — verified-purchase badges shown automatically.

Customers carry `is_customer: true` metadata so they are never sent to seller onboarding.'),

('coupons-discounts', 'Coupons & discounts', 'sales', 12, true,
'Create from **Dashboard → Coupons**:
- Flat or percentage discount
- Minimum order value
- Total usage limit & per-customer limit
- Validity dates
- Auto-applied or code-based

Validation runs server-side via a DB RPC at checkout — no client tampering possible.'),

('orders-and-invoices', 'Managing orders & GST invoices', 'orders', 13, true,
'- **Orders list** shows status, customer, payment mode and total.
- **Order detail** has a full timeline (placed → paid → packed → shipped → delivered).
- **Download invoice** generates a GST-ready PDF with your store''s GSTIN, bank details and HSN codes.
- **Refunds** can be processed inline (Razorpay refunds are automatic; COD refunds are manual).'),

('returns', 'Returns & refunds', 'orders', 14, true,
'1. Customer requests a return from their order page (`RequestReturnButton`).
2. You see the request in **Dashboard → Returns**.
3. Approve or reject. On approval, you can:
   - Generate a reverse-pickup AWB via Delhivery
   - Issue a full or partial refund via the `RefundPanel`
4. The customer is notified by email at every step.'),

('reviews', 'Product reviews & ratings', 'sales', 15, true,
'- Customers rate 1–5 stars and can attach photos.
- **Verified Purchase** badge appears when the reviewer''s order is in your system.
- Moderate from **Dashboard → Reviews**: approve, hide or reply.
- Average rating is shown on product cards and detail pages.'),

('email-branding', 'Branded transactional emails', 'design', 16, true,
'From **Dashboard → Email Branding**:
- Upload your logo and brand color.
- Set a custom "from" name.
- (Pro) Use your own verified sending domain for white-label emails.

Order confirmation, shipping update, and return emails all use these settings automatically.'),

('seo-marketing', 'SEO & social sharing', 'marketing', 17, true,
'Every storefront page uses `SEOHead`:
- Custom title (<60 chars) and meta description (<160 chars).
- Open Graph image at 1200×630 for rich link previews.
- Canonical URLs and JSON-LD product schema.

Set store-wide defaults in **SEO Settings**; per-product overrides on the product form.'),

('ai-engagement-report', 'AI engagement report', 'growth', 18, true,
'A 0–100 score for your store with an actionable improvement roadmap.

- Generates from **Dashboard → Overview → Run engagement report**.
- Scores cover: product completeness, theme polish, SEO, social, reviews, conversion.
- Each issue ships with a one-click fix link.'),

('mobile-app-pwa', 'Install your store as an app (PWA)', 'design', 19, true,
'Every storefront is a Progressive Web App.

- Customers see an **Add to Home Screen** prompt on supported browsers.
- iOS-safe padding and a sticky bottom nav give a native feel.
- Your logo and brand color are used for the splash screen via `manifest.json`.'),

('contact-support', 'Contact PicToCart support', 'support', 20, true,
'We''re here to help — fastest channels first:

- **WhatsApp:** [+91 98101 89606](https://wa.me/919810189606) (Mon–Sat, 10am–7pm IST)
- **Email:** support@pictocart.in
- **Help button:** the floating ? icon in your dashboard opens this help center.

Pro plan customers get priority response within 2 working hours.');
