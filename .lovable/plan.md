# Phase 5: Payment Gateway — Razorpay Integration

## What We Build

### 1. Seller Payment Setup Page (`/settings/payments`)
- Simple form: seller enters Razorpay Key ID + Key Secret
- Credentials saved to `stores.settings.razorpay` JSONB
- Test mode toggle for development
- Connection status indicator

### 2. Edge Function: `create-razorpay-order`
- Receives cart total + store_id
- Fetches seller's Razorpay credentials from store settings
- Creates Razorpay order via API
- Returns order_id for frontend checkout

### 3. Edge Function: `verify-razorpay-payment`
- Verifies payment signature (order_id + payment_id + signature)
- Updates order payment_status to `paid`
- Stores razorpay_payment_id on order

### 4. Updated Storefront Checkout
- Load Razorpay checkout.js
- "Pay Now" → create order → open Razorpay modal → verify → success
- COD fallback if seller hasn't connected Razorpay

### 5. Admin Commission Tracking
- Revenue page shows real commission (2% of online payments)

## New Files
- `src/pages/PaymentSettings.tsx`
- `supabase/functions/create-razorpay-order/index.ts`
- `supabase/functions/verify-razorpay-payment/index.ts`

## Modified Files
- `src/pages/StorefrontCheckout.tsx` — Razorpay payment flow
- `src/App.tsx` — /settings/payments route
- `src/components/DashboardLayout.tsx` — Settings nav
- `src/pages/admin/AdminRevenue.tsx` — real commission data

## No DB Changes Needed
Orders table already has payment_method, payment_status. Stores.settings JSONB stores credentials.